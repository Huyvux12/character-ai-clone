import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });

    const body = await req.json();
    const { amount } = body; // amount in USD (e.g. 1, 5, 10)

    if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // $1 = 200 credits
    const creditsToadd = amount * 200;

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${creditsToadd} Premium Credits`,
              description: `Add ${creditsToadd} credits to your character.ai+ account.`,
            },
            unit_amount: amount * 100, // Stripe expects amounts in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXTAUTH_URL}/?payment_success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?payment_canceled=true`,
      metadata: {
        userId: session.user.id,
        credits: creditsToadd.toString(),
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[STRIPE_CHECKOUT_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
