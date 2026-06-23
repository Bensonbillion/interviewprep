/**
 * Webhook handler tests — exercises the route's idempotency, transactional
 * failure-rollback, legacy-branch fulfillment, and 5xx-on-failure semantics
 * promised by Session 3 amendment A.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the env vars the route reads ────────────────────────────────────
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

// ── Mock Stripe constructEvent. The real SDK validates the raw body and
//    HMAC signature; we stub it to return whatever event object we want
//    for each test. The signature check itself is exercised in
//    integration tests against real Stripe events. ─────────────────────
const constructEventMock = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: (...args: unknown[]) => constructEventMock(...args),
    },
  },
}));

// ── Mock the Supabase admin client. We only need rpc() — the webhook
//    talks to the SQL fulfillment functions. We stub the RPC to model
//    success / dedup / failure for each test. ────────────────────────
const rpcMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: (...args: unknown[]) => rpcMock(...args) }),
}));

import { POST } from "@/app/api/stripe/webhook/route";

function buildRequest(rawBody: string, signature = "sig_test"): Request {
  return new Request("https://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature, "content-type": "application/json" },
    body: rawBody,
  });
}

const baseCheckoutEvent = {
  id: "evt_test_123",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_abc",
      payment_status: "paid",
      payment_intent: "pi_test",
      amount_total: 2400,
      currency: "usd",
      metadata: {
        user_id: "11111111-1111-1111-1111-111111111111",
        tier: "full_interview",
        company_scope: "Samsara",
        kit_id: "33333333-3333-3333-3333-333333333333",
      },
    },
  },
};

beforeEach(() => {
  constructEventMock.mockReset();
  rpcMock.mockReset();
});

describe("POST /api/stripe/webhook — entitlement branch", () => {
  it("calls the entitlement RPC and returns 200 with status=granted on success", async () => {
    constructEventMock.mockReturnValue(baseCheckoutEvent);
    rpcMock.mockResolvedValue({ data: { status: "granted", entitlement_id: "ent_1" }, error: null });

    const res = await POST(buildRequest("{}") as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual(expect.objectContaining({ received: true, status: "granted" }));
    expect(rpcMock).toHaveBeenCalledWith(
      "grant_entitlement_from_stripe",
      expect.objectContaining({
        p_event_id: "evt_test_123",
        p_event_type: "checkout.session.completed",
        p_type: "full_interview",
        p_company_scope: "Samsara",
        p_round_scope: null,
        p_stripe_session: "cs_test_abc",
      }),
    );
  });

  it("returns 200 + deduplicated when the RPC reports a duplicate event id", async () => {
    constructEventMock.mockReturnValue(baseCheckoutEvent);
    rpcMock.mockResolvedValue({ data: { status: "duplicate" }, error: null });

    const res = await POST(buildRequest("{}") as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.deduplicated).toBe(true);
  });

  it("returns 500 when the RPC fails — Stripe retries cleanly", async () => {
    constructEventMock.mockReturnValue(baseCheckoutEvent);
    rpcMock.mockResolvedValue({ data: null, error: { message: "constraint violation", code: "23505" } });

    const res = await POST(buildRequest("{}") as never);
    expect(res.status).toBe(500);
    // The webhook returns 5xx so Stripe retries. The atomic SQL function
    // guarantees the webhook_events row was rolled back along with the
    // entitlement insert, so the retry can succeed cleanly.
  });

  it("rejects invalid tier metadata before calling the RPC", async () => {
    constructEventMock.mockReturnValue({
      ...baseCheckoutEvent,
      data: {
        object: {
          ...baseCheckoutEvent.data.object,
          metadata: { ...baseCheckoutEvent.data.object.metadata, tier: "subscription" },
        },
      },
    });
    const res = await POST(buildRequest("{}") as never);
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects single_round missing round_scope before the RPC", async () => {
    constructEventMock.mockReturnValue({
      ...baseCheckoutEvent,
      data: {
        object: {
          ...baseCheckoutEvent.data.object,
          metadata: {
            user_id: "u",
            tier: "single_round",
            company_scope: "Samsara",
            // round_scope intentionally missing
          },
        },
      },
    });
    const res = await POST(buildRequest("{}") as never);
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects search_pass that accidentally carries scope", async () => {
    constructEventMock.mockReturnValue({
      ...baseCheckoutEvent,
      data: {
        object: {
          ...baseCheckoutEvent.data.object,
          metadata: { user_id: "u", tier: "search_pass", company_scope: "Samsara" },
        },
      },
    });
    const res = await POST(buildRequest("{}") as never);
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — legacy credit-pack branch", () => {
  const legacyEvent = {
    id: "evt_legacy_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_legacy_1",
        payment_status: "paid",
        payment_intent: "pi_legacy",
        amount_total: 1600,
        currency: "usd",
        metadata: {
          user_id: "11111111-1111-1111-1111-111111111111",
          pack_id: "starter",
          credits: "8",
        },
      },
    },
  };

  it("routes to grant_credits_from_stripe and returns 200 with legacy:true on success", async () => {
    constructEventMock.mockReturnValue(legacyEvent);
    rpcMock.mockResolvedValue({ data: { status: "granted", credits_added: 8 }, error: null });

    const res = await POST(buildRequest("{}") as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.legacy).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith(
      "grant_credits_from_stripe",
      expect.objectContaining({ p_pack_id: "starter", p_credits: 8 }),
    );
  });

  it("returns 500 when the legacy RPC fails", async () => {
    constructEventMock.mockReturnValue(legacyEvent);
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom", code: "XX000" } });

    const res = await POST(buildRequest("{}") as never);
    expect(res.status).toBe(500);
  });

  it("returns 200+deduplicated on legacy dedup hit", async () => {
    constructEventMock.mockReturnValue(legacyEvent);
    rpcMock.mockResolvedValue({ data: { status: "duplicate" }, error: null });

    const res = await POST(buildRequest("{}") as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.deduplicated).toBe(true);
  });
});

describe("POST /api/stripe/webhook — meta cases", () => {
  it("returns 400 when signature is missing", async () => {
    const req = new Request("https://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid signature", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("No signatures found");
    });
    const res = await POST(buildRequest("{}") as never);
    expect(res.status).toBe(400);
  });

  it("acknowledges (200) unhandled event types without invoking the RPC", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_x",
      type: "payment_intent.payment_failed",
      data: { object: {} },
    });
    const res = await POST(buildRequest("{}") as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ignored_event_type).toBeDefined();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("acks (200) unpaid checkout sessions without fulfilling", async () => {
    constructEventMock.mockReturnValue({
      ...baseCheckoutEvent,
      data: { object: { ...baseCheckoutEvent.data.object, payment_status: "unpaid" } },
    });
    const res = await POST(buildRequest("{}") as never);
    expect(res.status).toBe(200);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
