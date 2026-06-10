import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTierId } from "@/lib/stripe-tiers";

/**
 * POST /api/stripe/webhook
 *
 * Stripe webhook handler. Two fulfillment branches dispatched off
 * checkout.session.completed metadata:
 *
 *   New v3:  metadata.tier ∈ {single_round, full_interview, search_pass}
 *            → grant_entitlement_from_stripe RPC inserts webhook_events +
 *              entitlements in one SQL transaction. Failure rolls back
 *              the entire transaction (webhook_events row gone) so
 *              Stripe's 72h retry re-tries cleanly.
 *
 *   Legacy:  metadata.pack_id + metadata.credits
 *            → grant_credits_from_stripe RPC. Same transactional
 *              guarantee; legacy event ids from before this deploy
 *              fulfill once during the 72h retry window. console.warn
 *              flags every legacy fire so we know when this stops.
 *
 * Response semantics (per session-3 amendment A):
 *   • 200 — successful grant, OR dedup hit ({deduplicated: true}), OR
 *           event type we don't handle.
 *   • 4xx — bad signature, malformed payload, bad metadata.
 *   • 5xx — fulfillment failed (transaction rolled back). Stripe will
 *           retry; no row state survives the failure.
 *
 * Critical Next.js footgun: Stripe signature verification requires the
 * RAW request body. We use request.text() — never request.json() — so
 * the bytes we pass to constructEvent are byte-for-byte the original.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Only one event type matters for v3. Future event types (e.g.
  // charge.refunded for revoke/refund) get routed here too — for now,
  // anything else is acknowledged.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored_event_type: event.type });
  }

  const session = event.data.object;
  if (session.payment_status !== "paid") {
    // Stripe sends checkout.session.completed for unpaid expirations too.
    // Don't fulfill — but DO record the event so the same event id can't
    // re-fire later. Use a dummy RPC path? No — easiest is to ack 200
    // and skip; Stripe won't retry a 200.
    return NextResponse.json({ received: true, payment_status: session.payment_status });
  }

  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error("[webhook] Missing user_id metadata on session", session.id);
    return NextResponse.json({ error: "Missing user_id metadata" }, { status: 400 });
  }

  const admin = createAdminClient();
  const isLegacy = !session.metadata?.tier && session.metadata?.pack_id;

  if (isLegacy) {
    return await fulfillLegacy(admin, event, session, userId);
  }
  return await fulfillEntitlement(admin, event, session, userId);
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function fulfillEntitlement(
  admin: AdminClient,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  userId: string,
): Promise<NextResponse> {
  const tier = session.metadata?.tier;
  if (!isTierId(tier)) {
    console.error("[webhook] Invalid tier in metadata:", tier, session.id);
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const companyScope = session.metadata?.company_scope ?? null;
  const roundScope = session.metadata?.round_scope ?? null;
  const passDaysRaw = session.metadata?.pass_days;
  const passDays = passDaysRaw ? Math.max(1, parseInt(passDaysRaw, 10) || 0) : 30;

  // Shape validation — the SQL CHECK constraints on entitlements would
  // also catch these but we want a useful error here, not a "constraint
  // violation". The shapes mirror entitlements_*_shape in migration 046.
  if (tier === "single_round" && (!companyScope || !roundScope)) {
    console.error("[webhook] single_round missing company/round scope:", session.id);
    return NextResponse.json({ error: "Missing scope for single_round" }, { status: 400 });
  }
  if (tier === "full_interview" && !companyScope) {
    console.error("[webhook] full_interview missing company scope:", session.id);
    return NextResponse.json({ error: "Missing scope for full_interview" }, { status: 400 });
  }
  if (tier === "search_pass" && (companyScope || roundScope)) {
    console.error("[webhook] search_pass should not carry scope:", session.id);
    return NextResponse.json({ error: "Unexpected scope on search_pass" }, { status: 400 });
  }

  const { data, error } = await admin.rpc("grant_entitlement_from_stripe", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_user_id: userId,
    p_type: tier,
    p_company_scope: tier === "search_pass" ? null : companyScope,
    p_round_scope: tier === "single_round" ? roundScope : null,
    p_stripe_session: session.id,
    p_pass_days: tier === "search_pass" ? passDays : 30,
  });

  if (error) {
    // Transaction rolled back. webhook_events row not persisted. Stripe
    // will retry — that's the point of the 5xx response.
    console.error("[webhook] grant_entitlement_from_stripe failed:", error.message, error.code);
    return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
  }

  const status = (data as { status?: string } | null)?.status;
  if (status === "duplicate") {
    return NextResponse.json({ received: true, deduplicated: true });
  }
  return NextResponse.json({ received: true, status });
}

async function fulfillLegacy(
  admin: AdminClient,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  userId: string,
): Promise<NextResponse> {
  const packId = session.metadata?.pack_id ?? "";
  const credits = parseInt(session.metadata?.credits ?? "0", 10);

  console.warn(
    `[webhook] LEGACY credit-pack fulfillment — event=${event.id}, session=${session.id}, ` +
      `pack=${packId}, credits=${credits}. Expected to go quiet ~72h after v3 deploy as ` +
      `Stripe's retry window drains.`,
  );

  if (!credits) {
    console.error("[webhook legacy] Missing/zero credits metadata:", session.id);
    return NextResponse.json({ error: "Missing credits metadata" }, { status: 400 });
  }

  const { data, error } = await admin.rpc("grant_credits_from_stripe", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_user_id: userId,
    p_stripe_session: session.id,
    p_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : "",
    p_pack_id: packId,
    p_credits: credits,
    p_amount_cents: session.amount_total || 0,
    p_currency: session.currency || "usd",
  });

  if (error) {
    console.error("[webhook legacy] grant_credits_from_stripe failed:", error.message, error.code);
    return NextResponse.json({ error: "Legacy fulfillment failed" }, { status: 500 });
  }

  const status = (data as { status?: string } | null)?.status;
  if (status === "duplicate") {
    return NextResponse.json({ received: true, deduplicated: true });
  }
  return NextResponse.json({ received: true, status, legacy: true });
}
