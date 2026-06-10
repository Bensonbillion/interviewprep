import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { stripe, CREDIT_PACKS, type PackId } from "@/lib/stripe";
import { TIERS, isTierId, tierNeedsKitScope, tierNeedsRoundScope } from "@/lib/stripe-tiers";
import { resolveSessionScope } from "@/lib/entitlements";

/**
 * POST /api/stripe/checkout
 *
 * Two request shapes, dispatched by body keys:
 *
 *   New v3 (default): { tier: TierId, kit_id?: uuid }
 *     • Stripe Checkout session in mode:'payment' using the Stripe price
 *       object referenced by env (STRIPE_PRICE_<TIER>).
 *     • Scope-at-purchase resolved server-side via resolveSessionScope —
 *       the client only sends kit_id. Client-sent company/round strings
 *       are ignored entirely. Session 2A's resolver enforces ownership.
 *     • For single_round / full_interview, kit_id is REQUIRED; bare
 *       /pricing surfaces a kit-picker modal to obtain one.
 *     • For search_pass, kit_id is ignored if present; the tier carries
 *       no scope.
 *     • Metadata sent to Stripe (string-only per Stripe API):
 *         user_id, tier, kit_id?, company_scope?, round_scope?, pass_days?
 *
 *   Legacy ({packId} present): the old credit-pack flow. Kept so the
 *     dashboard/billing purchase UI keeps working through this deploy.
 *     A console.warn flags every legacy invocation so we know when the
 *     branch goes quiet and can retire it (tracked: retire billing
 *     purchase UI in Session 4).
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json(
      { error: "You must be logged in to purchase" },
      { status: 401 },
    );
  }

  // ── Legacy {packId} branch ───────────────────────────────────────────
  if (typeof body.packId === "string" && !body.tier) {
    return await createLegacyPackCheckout(request, auth.userId, auth.email, body.packId);
  }

  // ── New {tier, kit_id} branch ────────────────────────────────────────
  if (!isTierId(body.tier)) {
    return NextResponse.json(
      { error: "Invalid tier — expected single_round, full_interview, or search_pass" },
      { status: 400 },
    );
  }
  const tier = body.tier;
  const def = TIERS[tier];

  const priceId = process.env[def.priceEnvVar];
  if (!priceId) {
    console.error(`[checkout] Missing env var ${def.priceEnvVar} for tier ${tier}`);
    return NextResponse.json({ error: "Pricing not configured" }, { status: 500 });
  }

  // ── Scope resolution ────────────────────────────────────────────────
  // Client only sends kit_id. The resolver enforces ownership against
  // prep_sessions and returns null if the kit doesn't exist or isn't owned.
  let companyScope: string | null = null;
  let roundScope: string | null = null;
  const kitId = typeof body.kit_id === "string" ? body.kit_id : undefined;

  if (tierNeedsKitScope(tier)) {
    if (!kitId) {
      return NextResponse.json(
        { error: `${def.label} requires a kit. Open a prep kit and try again.` },
        { status: 400 },
      );
    }
    const scope = await resolveSessionScope(auth.userId, kitId);
    if (!scope) {
      // Kit doesn't exist OR isn't owned by this user. Both → 400 with the
      // same message so we don't leak existence.
      return NextResponse.json({ error: "Kit not found" }, { status: 400 });
    }
    if (!scope.company) {
      return NextResponse.json(
        { error: "Kit is missing a company — cannot scope purchase" },
        { status: 400 },
      );
    }
    companyScope = scope.company;
    if (tierNeedsRoundScope(tier)) {
      if (!scope.round) {
        return NextResponse.json(
          { error: "Kit is missing a round — cannot scope Single Round purchase" },
          { status: 400 },
        );
      }
      roundScope = scope.round;
    }
  }

  // ── Build metadata. Stripe coerces all values to string; we keep them
  //    short and string-typed up front. Unset fields are omitted so we
  //    never store the literal string "null". ────────────────────────
  const metadata: Record<string, string> = {
    user_id: auth.userId,
    tier,
  };
  if (kitId && tierNeedsKitScope(tier)) metadata.kit_id = kitId;
  if (companyScope) metadata.company_scope = companyScope;
  if (roundScope) metadata.round_scope = roundScope;
  if (def.passDays) metadata.pass_days = String(def.passDays);

  // ── Build redirect URLs. Success lands either back on the kit or on
  //    /dashboard (search_pass has no kit to return to). ───────────────
  const origin = request.headers.get("origin") ?? "";
  const successUrl =
    kitId && tier !== "search_pass"
      ? `${origin}/prep/${kitId}?purchase=success&session_id={CHECKOUT_SESSION_ID}`
      : `${origin}/dashboard?purchase=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/pricing?canceled=true${kitId ? `&kit_id=${encodeURIComponent(kitId)}` : ""}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: auth.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Stripe error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}

async function createLegacyPackCheckout(
  request: NextRequest,
  userId: string,
  userEmail: string,
  packId: string,
): Promise<NextResponse> {
  console.warn(
    `[checkout] LEGACY pack purchase invoked — packId=${packId}, user=${userId}. ` +
      `Track when this stops firing so dashboard/billing's purchase UI can be retired (Session 4).`,
  );
  if (!CREDIT_PACKS[packId as PackId]) {
    return NextResponse.json({ error: "Invalid pack selected" }, { status: 400 });
  }
  const pack = CREDIT_PACKS[packId as PackId];
  const origin = request.headers.get("origin") ?? "";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail,
      metadata: {
        user_id: userId,
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
      success_url: `${origin}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/billing?canceled=true`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout legacy] Stripe error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
