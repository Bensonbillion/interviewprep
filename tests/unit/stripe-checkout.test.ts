/**
 * /api/stripe/checkout — verifies the new {tier, kit_id} branch and the
 * preserved legacy {packId} branch (Session 3 amendment B).
 *
 * Notable assertions:
 *   • Server-side scope resolution: client-sent company/round strings are
 *     ignored; only kit_id is consulted, and resolveSessionScope decides
 *     the company/round that ends up in Stripe metadata.
 *   • Legacy {packId} still calls Stripe (so dashboard/billing keeps working).
 *   • search_pass never requires kit_id.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.STRIPE_PRICE_SINGLE_ROUND = "price_test_single_round";
process.env.STRIPE_PRICE_FULL_INTERVIEW = "price_test_full_interview";
process.env.STRIPE_PRICE_SEARCH_PASS = "price_test_search_pass";

vi.mock("@/lib/auth/verify", () => ({
  verifyApiAuth: vi.fn().mockResolvedValue({ userId: "11111111-1111-1111-1111-111111111111", email: "u@test" }),
}));

const createSessionMock = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: { sessions: { create: (...args: unknown[]) => createSessionMock(...args) } },
  },
  CREDIT_PACKS: {
    starter: { name: "Starter Pack", credits: 8, price: 1600, priceDisplay: "$16", description: "8 credits" },
  },
}));

const resolveSessionScopeMock = vi.fn();
vi.mock("@/lib/entitlements", () => ({
  resolveSessionScope: (...args: unknown[]) => resolveSessionScopeMock(...args),
}));

import { POST } from "@/app/api/stripe/checkout/route";

function makeReq(body: unknown): Request {
  return new Request("https://localhost/api/stripe/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://localhost" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  createSessionMock.mockReset();
  resolveSessionScopeMock.mockReset();
  createSessionMock.mockResolvedValue({ url: "https://checkout.stripe/test" });
});

describe("POST /api/stripe/checkout — new tier branch", () => {
  it("single_round with valid kit → uses RESOLVED company + round, ignoring any client strings", async () => {
    resolveSessionScopeMock.mockResolvedValue({ company: "Samsara", round: "hiring_manager" });
    const res = await POST(makeReq({
      tier: "single_round",
      kit_id: "33333333-3333-3333-3333-333333333333",
      // The client might also send these — they MUST be ignored.
      company: "EvilCo",
      round: "panel",
    }) as never);
    expect(res.status).toBe(200);

    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        line_items: [{ price: "price_test_single_round", quantity: 1 }],
        metadata: expect.objectContaining({
          tier: "single_round",
          kit_id: "33333333-3333-3333-3333-333333333333",
          company_scope: "Samsara",
          round_scope: "hiring_manager",
        }),
      }),
    );
    // Critical: the EvilCo string the client tried to send must not appear.
    const call = createSessionMock.mock.calls[0][0] as { metadata: Record<string, string> };
    expect(call.metadata.company_scope).toBe("Samsara");
    expect(call.metadata.company_scope).not.toBe("EvilCo");
  });

  it("full_interview ignores the round even if the kit has one", async () => {
    resolveSessionScopeMock.mockResolvedValue({ company: "Motive", round: "recruiter" });
    await POST(makeReq({ tier: "full_interview", kit_id: "k1" }) as never);
    const call = createSessionMock.mock.calls[0][0] as { metadata: Record<string, string> };
    expect(call.metadata.company_scope).toBe("Motive");
    expect(call.metadata.round_scope).toBeUndefined();
  });

  it("search_pass ignores kit_id entirely — no scope in metadata", async () => {
    await POST(makeReq({ tier: "search_pass", kit_id: "k1" }) as never);
    expect(resolveSessionScopeMock).not.toHaveBeenCalled();
    const call = createSessionMock.mock.calls[0][0] as { metadata: Record<string, string>; line_items: [{ price: string }] };
    expect(call.line_items[0].price).toBe("price_test_search_pass");
    expect(call.metadata.company_scope).toBeUndefined();
    expect(call.metadata.round_scope).toBeUndefined();
    expect(call.metadata.pass_days).toBe("30");
    expect(call.metadata.kit_id).toBeUndefined();
  });

  it("single_round without kit_id → 400", async () => {
    const res = await POST(makeReq({ tier: "single_round" }) as never);
    expect(res.status).toBe(400);
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("resolveSessionScope returning null (not owned / missing) → 400 with 'Kit not found'", async () => {
    resolveSessionScopeMock.mockResolvedValue(null);
    const res = await POST(makeReq({ tier: "full_interview", kit_id: "k_other" }) as never);
    expect(res.status).toBe(400);
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("missing STRIPE_PRICE_<TIER> env var → 500", async () => {
    const saved = process.env.STRIPE_PRICE_FULL_INTERVIEW;
    delete process.env.STRIPE_PRICE_FULL_INTERVIEW;
    resolveSessionScopeMock.mockResolvedValue({ company: "Samsara", round: "hiring_manager" });
    const res = await POST(makeReq({ tier: "full_interview", kit_id: "k1" }) as never);
    expect(res.status).toBe(500);
    process.env.STRIPE_PRICE_FULL_INTERVIEW = saved;
  });

  it("invalid tier value → 400", async () => {
    const res = await POST(makeReq({ tier: "subscription", kit_id: "k1" }) as never);
    expect(res.status).toBe(400);
    expect(createSessionMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/checkout — legacy {packId} branch", () => {
  it("starter pack still creates a Stripe session (preserves dashboard/billing flow)", async () => {
    const res = await POST(makeReq({ packId: "starter" }) as never);
    expect(res.status).toBe(200);
    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        metadata: expect.objectContaining({ pack_id: "starter", credits: "8" }),
        // Legacy path keeps the inline price_data shape.
        line_items: expect.arrayContaining([
          expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 1600 }) }),
        ]),
      }),
    );
  });

  it("unknown packId → 400", async () => {
    const res = await POST(makeReq({ packId: "platinum" }) as never);
    expect(res.status).toBe(400);
    expect(createSessionMock).not.toHaveBeenCalled();
  });
});
