import { NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing";

// Legacy endpoint retained for existing Stripe webhook configurations.
export async function POST(req) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  try {
    const result = await BillingService.handleWebhook(await req.text(), signature);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[STRIPE_WEBHOOK_ERROR]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
