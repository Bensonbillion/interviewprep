/**
 * v3 one-time pricing tier catalog.
 *
 * Single source of truth for the three tiers the new pricing page sells.
 * The legacy credit-pack catalog in src/lib/stripe.ts and
 * src/lib/stripe-shared.ts is kept ONLY so the existing dashboard/billing
 * page (out of scope for Session 3) keeps working until Session 4 retires
 * its purchase UI.
 *
 * Price IDs come from env vars, not from this file. Each tier knows its
 * env var name and the price_cents we display on the page. The cents
 * number is presentation only — Stripe charges according to the price
 * object identified by the env var, not the cents value here.
 */

export type TierId = "single_round" | "full_interview" | "search_pass";

export interface TierDef {
  id: TierId;
  /** Human-readable label for the pricing card. */
  label: string;
  /** Short blurb under the label on the pricing card. */
  description: string;
  /** Stripe price object ID env var. Server-only — never reference from a client component. */
  priceEnvVar: string;
  /** Display price in cents. Authoritative price lives in Stripe; this is for the card. */
  priceCents: number;
  /** Whether the tier should render as the hero/most-popular card. */
  popular?: boolean;
  /** For search_pass only: how many days the pass lasts. Embedded in metadata at checkout. */
  passDays?: number;
}

export const TIERS: Record<TierId, TierDef> = {
  single_round: {
    id: "single_round",
    label: "Single Round",
    description: "One round kit at one company.",
    priceEnvVar: "STRIPE_PRICE_SINGLE_ROUND",
    priceCents: 900,
  },
  full_interview: {
    id: "full_interview",
    label: "Full Interview",
    description: "All rounds + Live Mode at one company.",
    priceEnvVar: "STRIPE_PRICE_FULL_INTERVIEW",
    priceCents: 2400,
    popular: true,
  },
  search_pass: {
    id: "search_pass",
    label: "Job Search Pass",
    description: "Unlimited kits for 30 days.",
    priceEnvVar: "STRIPE_PRICE_SEARCH_PASS",
    priceCents: 4900,
    passDays: 30,
  },
};

export const TIER_IDS: TierId[] = ["single_round", "full_interview", "search_pass"];

export function isTierId(value: unknown): value is TierId {
  return typeof value === "string" && (TIER_IDS as string[]).includes(value);
}

/** Whether a tier needs a kit reference resolved server-side at purchase. */
export function tierNeedsKitScope(tier: TierId): boolean {
  return tier === "single_round" || tier === "full_interview";
}

/** Whether a tier needs a round specifically (single_round only). */
export function tierNeedsRoundScope(tier: TierId): boolean {
  return tier === "single_round";
}

/** Format cents for display. Not localized — pricing card is USD-only for v3. */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
