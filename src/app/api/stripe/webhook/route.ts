import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error(
      "Webhook signature verification failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Only process paid sessions
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    const userId = session.metadata?.user_id;
    const packId = session.metadata?.pack_id;
    const credits = parseInt(session.metadata?.credits || "0");

    if (!userId || !credits) {
      console.error("Missing metadata in checkout session:", session.id);
      return NextResponse.json({ received: true });
    }

    const admin = createAdminClient();

    // Check for duplicate processing
    const { data: existing } = await admin
      .from("credit_purchases")
      .select("id")
      .eq("stripe_session_id", session.id)
      .single();

    if (existing) {
      console.log("Duplicate webhook, already processed:", session.id);
      return NextResponse.json({ received: true });
    }

    // Record the purchase
    const { error: purchaseError } = await admin
      .from("credit_purchases")
      .insert({
        user_id: userId,
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent as string,
        pack_id: packId,
        credits_added: credits,
        amount_cents: session.amount_total || 0,
        currency: session.currency || "usd",
        status: "completed",
      });

    if (purchaseError) {
      console.error("Failed to record purchase:", purchaseError);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 },
      );
    }

    // Add credits using the existing add_credits() RPC
    const { error: creditError } = await admin.rpc("add_credits", {
      p_user_id: userId,
      p_amount: credits,
      p_transaction_type: "purchase",
      p_description: `${packId} — ${credits} credits via Stripe`,
    });

    if (creditError) {
      console.error("Failed to add credits:", creditError);
      return NextResponse.json(
        { error: "Failed to add credits" },
        { status: 500 },
      );
    }

    console.log(
      `Added ${credits} credits to user ${userId} (session: ${session.id})`,
    );
  }

  return NextResponse.json({ received: true });
}
