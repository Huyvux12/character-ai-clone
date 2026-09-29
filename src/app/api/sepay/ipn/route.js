import { NextResponse } from "next/server";
import { BillingService } from "@/lib/services/billing";

export async function POST(req) {
  try {
    const body = await req.json();
    const result = await BillingService.handleIpn(body, req.headers.get("x-secret-key"));
    return NextResponse.json(result);
  } catch (error) {
    console.error("[SEPAY_IPN_ERROR]", error.message);
    return NextResponse.json({ error: "IPN processing failed" }, { status: error.statusCode || 500 });
  }
}
