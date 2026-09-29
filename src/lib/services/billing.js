import { prisma } from "../prisma";
import config from "../config";
import { decideSepayEvent, makeInvoiceNumber, secretsMatch, summarizeIpn } from "../sepay-decision";
import { buildCheckout, sepayConfigured, unlimitedOffer } from "../server/sepay";

export const BillingService = {
  async createUnlimitedCheckout(userId) {
    if (!sepayConfigured()) {
      const error = new Error("SePay is not configured");
      error.statusCode = 503;
      throw error;
    }
    const offer = unlimitedOffer();
    if (!offer.sellable) {
      const error = new Error("Unlimited plan price is not configured");
      error.statusCode = 503;
      throw error;
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, disabledAt: true } });
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    if (user.disabledAt) {
      const error = new Error("This account is disabled");
      error.statusCode = 403;
      throw error;
    }
    if (user.plan === "unlimited") {
      const error = new Error("Unlimited plan is already active");
      error.statusCode = 409;
      throw error;
    }

    const invoiceNumber = makeInvoiceNumber();
    const order = await prisma.paymentOrder.create({
      data: {
        userId,
        invoiceNumber,
        planId: "unlimited",
        amountVnd: offer.priceVnd,
        status: "pending",
      },
    });
    const checkout = buildCheckout({
      invoiceNumber: order.invoiceNumber,
      amountVnd: order.amountVnd,
      userId,
      description: `Gói Unlimited ${config.appName}`.slice(0, 180),
    });
    return checkout;
  },

  async handleIpn(body, secretHeader) {
    if (!secretsMatch(secretHeader, process.env.SEPAY_SECRET_KEY || "")) {
      const error = new Error("Invalid SePay secret");
      error.statusCode = 401;
      throw error;
    }
    const invoiceNumber = body?.order?.order_invoice_number;
    const order = invoiceNumber
      ? await prisma.paymentOrder.findUnique({ where: { invoiceNumber: String(invoiceNumber) } })
      : null;
    const decision = decideSepayEvent(order, body);
    const summary = summarizeIpn(body);

    if (decision.action === "activate") {
      await prisma.$transaction(async (tx) => {
        const changed = await tx.paymentOrder.updateMany({
          where: { id: order.id, status: { not: "paid" } },
          data: {
            status: "paid",
            paidAt: new Date(),
            sepayOrderId: body.order?.order_id || body.transaction?.transaction_id || null,
            ipnSummary: summary,
          },
        });
        if (changed.count !== 1) return;
        await tx.user.update({
          where: { id: order.userId },
          data: { plan: "unlimited", planActivatedAt: new Date() },
        });
        await tx.adminAuditLog.create({
          data: {
            action: "plan_activated",
            targetType: "user",
            targetId: order.userId,
            reason: `SePay ${order.invoiceNumber}`,
            metadata: summary,
          },
        });
      });
    } else if (decision.action === "mismatch" && order) {
      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: order.status === "paid" ? "paid" : "mismatch", ipnSummary: summary },
      });
    } else if (decision.action === "void" && order) {
      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: { ipnSummary: summary },
      });
      await prisma.adminAuditLog.create({
        data: {
          action: "payment_void_noted",
          targetType: "payment_order",
          targetId: order.id,
          reason: order.invoiceNumber,
          metadata: summary,
        },
      });
    }

    return { success: true, action: decision.action };
  },
};
