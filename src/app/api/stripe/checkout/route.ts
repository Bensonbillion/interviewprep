import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { stripe, CREDIT_PACKS, type PackId } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const { packId } = await request.json();

    // Validate pack
    if (!packId || !CREDIT_PACKS[packId as PackId]) {
      return NextResponse.json(
        { error: "Invalid pack selected" },
        { status: 400 },
      );
    }

    const pack = CREDIT_PACKS[packId as PackId];

    // Get authenticated user
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json(
        { error: "You must be logged in to purchase credits" },
        { status: 401 },
      );
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: auth.email,
      metadata: {
        user_id: auth.userId,
        pack_id: packId,
        credits: pack.credits.toString(),
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: pack.price,
            product_data: {
              name: pack.name,
              description: pack.description,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${request.headers.get("origin")}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get("origin")}/dashboard/billing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
