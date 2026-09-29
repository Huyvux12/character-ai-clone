import { stripe } from "../stripe";
import config from "../config";
import { prisma } from "../prisma";

export const BillingService = {
  async createCheckoutSession(userId, planId) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("Payments are not configured");
    const plan = config.stripe.plans[planId];
    if (!plan) throw new Error("Invalid plan selected");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${config.stripe.plans[planId].name}`,
              description: `Purchase ${plan.credits} credits to perform AI generations.`,
            },
            unit_amount: plan.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${config.auth.url}/pricing?success=true`,
      cancel_url: `${config.auth.url}/pricing?canceled=true`,
      metadata: { userId, credits: plan.credits.toString() },
    });

    return session.url;
  },

  async handleWebhook(body, signature) {
    if (!config.stripe.webhookSecret) throw new Error("Stripe webhook secret is not configured");
    const event = stripe.webhooks.constructEvent(body, signature, config.stripe.webhookSecret);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const credits = parseInt(session.metadata?.credits || "0", 10);

      if (session.payment_status === "paid" && userId && Number.isSafeInteger(credits) && credits > 0 && credits <= 100000) {
        await prisma.$transaction(async (tx) => {
          // Unique event IDs prevent Stripe retries and either webhook URL from crediting twice.
          const prior = await tx.creditLedgerEntry.findUnique({ where: { idempotencyKey: `stripe_${event.id}` } });
          if (prior) return;
          await tx.creditLedgerEntry.create({ data: {
            userId, amount: credits, type: "purchase", status: "settled",
            idempotencyKey: `stripe_${event.id}`, description: `Stripe checkout ${session.id}`,
          } });
          await tx.user.update({ where: { id: userId }, data: { credits: { increment: credits } } });
        });
        return { success: true, userId, credits };
      }
    }
    return { success: false };
  }
};
