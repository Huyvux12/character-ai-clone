import { timingSafeEqual, randomBytes } from "node:crypto";

export function parseVndAmount(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(String(value).trim().replace(/,/g, ""));
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  if (Math.abs(numeric - Math.trunc(numeric)) > 0.001) return null;
  return Math.trunc(numeric);
}

export function secretsMatch(header, secret) {
  if (!header || !secret) return false;
  const left = Buffer.from(String(header));
  const right = Buffer.from(String(secret));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function makeInvoiceNumber() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  let invoice = "INV";
  for (const byte of bytes) invoice += alphabet[byte % alphabet.length];
  return invoice.slice(0, 20);
}

export function summarizeIpn(body = {}) {
  return JSON.stringify({
    notification_type: body.notification_type || null,
    order_invoice_number: body.order?.order_invoice_number || null,
    order_amount: body.order?.order_amount || null,
    order_status: body.order?.order_status || null,
    transaction_status: body.transaction?.transaction_status || null,
    transaction_id: body.transaction?.transaction_id || null,
    payment_method: body.transaction?.payment_method || null,
  }).slice(0, 2000);
}

export function decideSepayEvent(order, body = {}) {
  if (!order) return { action: "ignore", reason: "unknown_order" };
  if (body.notification_type === "TRANSACTION_VOID") return { action: "void" };
  if (body.notification_type !== "ORDER_PAID") return { action: "ignore", reason: "ignored_type" };
  if (order.status === "paid") return { action: "already_paid" };
  if (body.transaction?.transaction_status !== "APPROVED") return { action: "ignore", reason: "not_approved" };
  const amount = parseVndAmount(body.order?.order_amount ?? body.transaction?.transaction_amount);
  if (amount === null || amount !== order.amountVnd) return { action: "mismatch", amount };
  return { action: "activate", amount };
}
