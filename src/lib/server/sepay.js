import "server-only";
import { SePayPgClient } from "sepay-pg-node";
import config from "../config";
import { isSellableVnd, resolveUnlimitedPrice } from "../usage-math";

export function sepayConfigured() {
  return Boolean(process.env.SEPAY_MERCHANT_ID?.trim() && process.env.SEPAY_SECRET_KEY?.trim());
}

export function sepayEnv() {
  return process.env.SEPAY_ENV === "production" ? "production" : "sandbox";
}

export function unlimitedOffer() {
  const priceVnd = resolveUnlimitedPrice();
  return {
    id: "unlimited",
    name: "Unlimited",
    priceVnd,
    sellable: sepayConfigured() && isSellableVnd(priceVnd),
  };
}

export function buildCheckout({ invoiceNumber, amountVnd, userId, description }) {
  const client = new SePayPgClient({
    env: sepayEnv(),
    merchant_id: process.env.SEPAY_MERCHANT_ID.trim(),
    secret_key: process.env.SEPAY_SECRET_KEY.trim(),
  });
  const fields = client.checkout.initOneTimePaymentFields({
    operation: "PURCHASE",
    payment_method: "BANK_TRANSFER",
    order_invoice_number: invoiceNumber,
    order_amount: amountVnd,
    currency: "VND",
    order_description: description,
    customer_id: userId,
    success_url: `${config.auth.url}/pricing?payment=success`,
    error_url: `${config.auth.url}/pricing?payment=error`,
    cancel_url: `${config.auth.url}/pricing?payment=cancel`,
  });
  return {
    checkoutUrl: client.checkout.initCheckoutUrl(),
    fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value == null ? "" : String(value)])),
  };
}
