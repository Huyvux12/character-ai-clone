import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { BillingService } from "@/lib/services/billing";

export async function POST(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    const { planId } = await req.json();
    if (planId !== "unlimited") return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    const checkout = await BillingService.createUnlimitedCheckout(user.id);
    return NextResponse.json(checkout);
  } catch (error) {
    console.error("Checkout route error:", error);
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
