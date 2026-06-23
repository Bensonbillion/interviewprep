import { describe, it, expect } from "vitest";
import { TIERS, TIER_IDS, isTierId, tierNeedsKitScope, tierNeedsRoundScope, formatPrice } from "@/lib/stripe-tiers";

describe("Stripe tier catalog", () => {
  it("exposes exactly the three v3 tiers", () => {
    expect(TIER_IDS).toEqual(["single_round", "full_interview", "search_pass"]);
  });

  it("prices match the v3 brief", () => {
    expect(TIERS.single_round.priceCents).toBe(900);
    expect(TIERS.full_interview.priceCents).toBe(2400);
    expect(TIERS.search_pass.priceCents).toBe(4900);
  });

  it("Full Interview is the hero / popular tier", () => {
    expect(TIERS.full_interview.popular).toBe(true);
    expect(TIERS.single_round.popular).toBeUndefined();
    expect(TIERS.search_pass.popular).toBeUndefined();
  });

  it("only search_pass carries passDays (30)", () => {
    expect(TIERS.search_pass.passDays).toBe(30);
    expect(TIERS.single_round.passDays).toBeUndefined();
    expect(TIERS.full_interview.passDays).toBeUndefined();
  });

  it("each tier names its env-var for the Stripe price ID", () => {
    expect(TIERS.single_round.priceEnvVar).toBe("STRIPE_PRICE_SINGLE_ROUND");
    expect(TIERS.full_interview.priceEnvVar).toBe("STRIPE_PRICE_FULL_INTERVIEW");
    expect(TIERS.search_pass.priceEnvVar).toBe("STRIPE_PRICE_SEARCH_PASS");
  });

  it("isTierId rejects anything outside the three values", () => {
    expect(isTierId("single_round")).toBe(true);
    expect(isTierId("full_interview")).toBe(true);
    expect(isTierId("search_pass")).toBe(true);
    expect(isTierId("starter")).toBe(false);
    expect(isTierId("subscription")).toBe(false);
    expect(isTierId("")).toBe(false);
    expect(isTierId(undefined)).toBe(false);
    expect(isTierId(null)).toBe(false);
  });

  it("tierNeedsKitScope: scoped tiers require it, pass does not", () => {
    expect(tierNeedsKitScope("single_round")).toBe(true);
    expect(tierNeedsKitScope("full_interview")).toBe(true);
    expect(tierNeedsKitScope("search_pass")).toBe(false);
  });

  it("tierNeedsRoundScope: only single_round needs the round", () => {
    expect(tierNeedsRoundScope("single_round")).toBe(true);
    expect(tierNeedsRoundScope("full_interview")).toBe(false);
    expect(tierNeedsRoundScope("search_pass")).toBe(false);
  });

  it("formatPrice renders whole-dollar USD with a $ prefix", () => {
    expect(formatPrice(900)).toBe("$9");
    expect(formatPrice(2400)).toBe("$24");
    expect(formatPrice(4900)).toBe("$49");
  });
});
