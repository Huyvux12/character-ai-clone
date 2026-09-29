import test from "node:test";
import assert from "node:assert/strict";
import { isAdminEmail } from "../src/lib/admin-policy.js";
import { decideSepayEvent, makeInvoiceNumber, parseVndAmount, secretsMatch } from "../src/lib/sepay-decision.js";
import { isSellableVnd, mergeDailyUsage, recentVnDays, resolveUnlimitedPrice, sumTokenUsage, vnMonthStart } from "../src/lib/usage-math.js";

test("admin email list is empty-safe and case-insensitive", () => {
  const previous = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "";
  assert.equal(isAdminEmail("owner@example.com"), false);
  process.env.ADMIN_EMAILS = " Owner@Example.com , second@example.com ";
  assert.equal(isAdminEmail("owner@example.com"), true);
  assert.equal(isAdminEmail("other@example.com"), false);
  if (previous === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = previous;
});

test("unlimited price defaults to 250000 and rejects a fractional override", () => {
  const previous = process.env.PLAN_UNLIMITED_VND;
  delete process.env.PLAN_UNLIMITED_VND;
  assert.equal(resolveUnlimitedPrice(), 250000);
  assert.equal(isSellableVnd(250000), true);
  assert.equal(isSellableVnd(0), false);
  process.env.PLAN_UNLIMITED_VND = "250000.5";
  assert.equal(resolveUnlimitedPrice(), null);
  if (previous === undefined) delete process.env.PLAN_UNLIMITED_VND;
  else process.env.PLAN_UNLIMITED_VND = previous;
});

test("SePay IPN activates once only when the amount matches", () => {
  const order = { status: "pending", amountVnd: 250000 };
  const paid = {
    notification_type: "ORDER_PAID",
    order: { order_amount: "250000.00", order_invoice_number: "INV1" },
    transaction: { transaction_status: "APPROVED" },
  };
  assert.deepEqual(decideSepayEvent(order, paid).action, "activate");
  assert.equal(decideSepayEvent({ ...order, status: "paid" }, paid).action, "already_paid");
  assert.equal(decideSepayEvent(order, { ...paid, order: { order_amount: "1000.00" } }).action, "mismatch");
  assert.equal(decideSepayEvent(order, { notification_type: "ORDER_PAID", transaction: { transaction_status: "PENDING" } }).action, "ignore");
  assert.equal(decideSepayEvent(null, paid).action, "ignore");
  assert.equal(parseVndAmount("250000.00"), 250000);
  assert.equal(parseVndAmount("250000.50"), null);
});

test("SePay secret compare rejects a missing or different key", () => {
  assert.equal(secretsMatch("", "secret"), false);
  assert.equal(secretsMatch("secret", "secret"), true);
  assert.equal(secretsMatch("secret", "secreT"), false);
  const invoice = makeInvoiceNumber();
  assert.match(invoice, /^INV[A-Z2-9]{10,}$/);
  assert.ok(invoice.length <= 20);
});

test("usage math uses Vietnam month start and merges daily voice counts", () => {
  const start = vnMonthStart(new Date("2026-09-29T00:30:00.000Z"));
  assert.equal(start.toISOString(), "2026-08-31T17:00:00.000Z");
  const days = recentVnDays(2, new Date("2026-09-29T00:30:00.000Z"));
  assert.deepEqual(days, ["2026-09-28", "2026-09-29"]);
  const series = mergeDailyUsage(days, [{ day: "2026-09-29", count: 3 }], [{ day: "2026-09-29", type: "stt", count: 2 }, { day: "2026-09-29", type: "tts", count: 1 }]);
  assert.deepEqual(series[1], { day: "2026-09-29", messages: 3, stt: 2, tts: 1 });
  assert.deepEqual(sumTokenUsage(['{"prompt_tokens":4,"completion_tokens":6,"total_tokens":10}', { usageJson: '{"prompt_tokens":1}' }]), {
    prompt: 5, completion: 6, total: 11,
  });
});
