/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  getCredits,
  getRemainingCredits,
  hasCreditsRemaining,
  consumeCredit,
  CREDIT_PACKAGES,
} from "@/lib/credits";

describe("Credit System", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  // ── Initial state ─────────────────────────────────────────────────

  it("new user starts with 3 free credits", () => {
    const credits = getCredits();
    expect(credits.used).toBe(0);
    expect(credits.total).toBe(3);
    expect(credits.sessions).toEqual([]);
  });

  it("getRemainingCredits returns 3 for new user", () => {
    expect(getRemainingCredits()).toBe(3);
  });

  it("hasCreditsRemaining returns true for new user", () => {
    expect(hasCreditsRemaining()).toBe(true);
  });

  // ── Credit consumption ────────────────────────────────────────────

  it("deducts 1 credit per generation", () => {
    expect(getRemainingCredits()).toBe(3);

    consumeCredit("session-1");
    expect(getRemainingCredits()).toBe(2);

    consumeCredit("session-2");
    expect(getRemainingCredits()).toBe(1);

    consumeCredit("session-3");
    expect(getRemainingCredits()).toBe(0);
  });

  it("records session ID in credit state", () => {
    consumeCredit("session-abc");
    const credits = getCredits();
    expect(credits.sessions).toContain("session-abc");
  });

  it("tracks all consumed session IDs", () => {
    consumeCredit("s1");
    consumeCredit("s2");
    consumeCredit("s3");

    const credits = getCredits();
    expect(credits.sessions).toEqual(["s1", "s2", "s3"]);
    expect(credits.used).toBe(3);
  });

  // ── Zero credits ──────────────────────────────────────────────────

  it("blocks generation when credits = 0", () => {
    consumeCredit("s1");
    consumeCredit("s2");
    consumeCredit("s3");

    expect(getRemainingCredits()).toBe(0);
    expect(hasCreditsRemaining()).toBe(false);
  });

  it("getRemainingCredits never returns negative", () => {
    consumeCredit("s1");
    consumeCredit("s2");
    consumeCredit("s3");
    consumeCredit("s4"); // over-consume

    expect(getRemainingCredits()).toBe(0);
    // used exceeds total, but remaining stays 0
    expect(getCredits().used).toBe(4);
  });

  // ── Persistence ───────────────────────────────────────────────────

  it("persists credit state in localStorage", () => {
    consumeCredit("session-persist");

    // Read directly from localStorage
    const raw = localStorage.getItem("salesprep_credits");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.used).toBe(1);
    expect(parsed.sessions).toContain("session-persist");
  });

  it("survives read after persisting", () => {
    consumeCredit("s1");
    consumeCredit("s2");

    // Re-read from storage (simulating page reload)
    const credits = getCredits();
    expect(credits.used).toBe(2);
    expect(credits.total).toBe(3);
    expect(getRemainingCredits()).toBe(1);
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("salesprep_credits", "not-valid-json");

    // Should fall back to default state
    const credits = getCredits();
    expect(credits.used).toBe(0);
    expect(credits.total).toBe(3);
  });

  // ── Credit packages ───────────────────────────────────────────────

  it("CREDIT_PACKAGES has 4 tiers defined", () => {
    expect(CREDIT_PACKAGES).toHaveLength(4);
  });

  it("packages have required fields", () => {
    for (const pkg of CREDIT_PACKAGES) {
      expect(pkg.name).toBeDefined();
      expect(typeof pkg.price).toBe("number");
      expect(pkg.price).toBeGreaterThan(0);
      expect(pkg.description).toBeDefined();
    }
  });

  it("unlimited package has null credits", () => {
    const unlimited = CREDIT_PACKAGES.find((p) => p.name === "Unlimited");
    expect(unlimited).toBeDefined();
    expect(unlimited!.credits).toBeNull();
  });

  it("credit packages are sorted by ascending price", () => {
    for (let i = 1; i < CREDIT_PACKAGES.length; i++) {
      expect(CREDIT_PACKAGES[i].price).toBeGreaterThan(
        CREDIT_PACKAGES[i - 1].price
      );
    }
  });

  // ── consumeCredit return value ────────────────────────────────────

  it("consumeCredit returns updated state", () => {
    const updated = consumeCredit("s1");
    expect(updated.used).toBe(1);
    expect(updated.total).toBe(3);
    expect(updated.sessions).toEqual(["s1"]);
  });
});
