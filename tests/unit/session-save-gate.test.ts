/**
 * /api/session/save access-gate behavior (Session 3 amendment C):
 *   • First save → checkAccess must allow ('entitlement' or 'credit'),
 *     denied → 403.
 *   • Existing row owned by the caller → bypass checkAccess entirely.
 *   • Existing row owned by someone else → 403, no overwrite.
 *   • Top-level companyName ≠ sessionData.companyName → 400.
 *   • Legacy user with credit_balance > 0 (and no entitlement) → allowed
 *     via the credit fallback — verifies the grandfather path keeps
 *     working end-to-end through the gate.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/verify", () => ({
  verifyApiAuth: vi.fn().mockResolvedValue({ userId: "11111111-1111-1111-1111-111111111111", email: "u@test" }),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  apiLimiter: {},
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, headers: {} }),
}));

vi.mock("@/lib/validation/schemas", () => ({
  sessionSaveSchema: {
    safeParse: (b: unknown) => ({ success: true, data: b }),
  },
}));

const existenceLookup = vi.fn();
const upsert = vi.fn();
const fromMock = vi.fn((table: string) => {
  if (table !== "prep_sessions") throw new Error("Unexpected table: " + table);
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: () => existenceLookup(),
      }),
    }),
    upsert: (...args: unknown[]) => upsert(...args),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

const checkAccessMock = vi.fn();
vi.mock("@/lib/entitlements", () => ({
  checkAccess: (...args: unknown[]) => checkAccessMock(...args),
}));

import { POST } from "@/app/api/session/save/route";

function buildBody(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: "22222222-2222-2222-2222-222222222222",
    companyName: "Samsara",
    interviewDate: undefined,
    sessionData: {
      companyName: "Samsara",
      jobDescription: "",
      targetRole: "AE",
      roleType: "account_executive",
      stage: "hiring_manager",
      relevanceMap: {},
      ...((overrides.sessionData as object) ?? {}),
    },
    ...overrides,
  };
}

function makeReq(body: unknown): Request {
  return new Request("https://localhost/api/session/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  existenceLookup.mockReset();
  upsert.mockReset();
  checkAccessMock.mockReset();
  fromMock.mockClear();
});

describe("/api/session/save gate", () => {
  it("rejects with 400 when top-level companyName ≠ sessionData.companyName", async () => {
    existenceLookup.mockResolvedValue({ data: null, error: null });
    const res = await POST(makeReq(buildBody({
      companyName: "Samsara",
      sessionData: { companyName: "Motive", stage: "hiring_manager" },
    })) as never);
    expect(res.status).toBe(400);
    expect(checkAccessMock).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("first save: 403 when checkAccess returns denied (no entitlement, no credits)", async () => {
    existenceLookup.mockResolvedValue({ data: null, error: null });
    checkAccessMock.mockResolvedValue({ allowed: false, source: "denied" });
    const res = await POST(makeReq(buildBody()) as never);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("out_of_credits");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("first save: allows when checkAccess returns entitlement", async () => {
    existenceLookup.mockResolvedValue({ data: null, error: null });
    checkAccessMock.mockResolvedValue({ allowed: true, source: "entitlement", entitlement: { type: "full_interview" } });
    upsert.mockResolvedValue({ error: null });
    const res = await POST(makeReq(buildBody()) as never);
    expect(res.status).toBe(200);
    expect(checkAccessMock).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      "kit",
      { company: "Samsara", round: "hiring_manager" },
    );
    expect(upsert).toHaveBeenCalled();
  });

  it("first save: allows via legacy credit-balance grandfather (source: credit)", async () => {
    existenceLookup.mockResolvedValue({ data: null, error: null });
    checkAccessMock.mockResolvedValue({ allowed: true, source: "credit", credit_balance: 3 });
    upsert.mockResolvedValue({ error: null });
    const res = await POST(makeReq(buildBody()) as never);
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalled();
  });

  it("update path: existing owned row → BYPASS checkAccess, allow upsert", async () => {
    existenceLookup.mockResolvedValue({
      data: { id: "22222222-2222-2222-2222-222222222222", user_id: "11111111-1111-1111-1111-111111111111" },
      error: null,
    });
    upsert.mockResolvedValue({ error: null });
    const res = await POST(makeReq(buildBody()) as never);
    expect(res.status).toBe(200);
    expect(checkAccessMock).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalled();
  });

  it("update path: existing row owned by someone else → 403, no overwrite", async () => {
    existenceLookup.mockResolvedValue({
      data: { id: "22222222-2222-2222-2222-222222222222", user_id: "99999999-9999-9999-9999-999999999999" },
      error: null,
    });
    const res = await POST(makeReq(buildBody()) as never);
    expect(res.status).toBe(403);
    expect(checkAccessMock).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("update path is debounced-2s-call-safe: many updates → no extra checkAccess", async () => {
    // Simulates PrepSessionView.tsx:425 firing repeatedly. After the first
    // (creation) check, subsequent owned-update saves never re-gate.
    existenceLookup.mockResolvedValue({
      data: { id: "22222222-2222-2222-2222-222222222222", user_id: "11111111-1111-1111-1111-111111111111" },
      error: null,
    });
    upsert.mockResolvedValue({ error: null });
    await POST(makeReq(buildBody()) as never);
    await POST(makeReq(buildBody()) as never);
    await POST(makeReq(buildBody()) as never);
    expect(checkAccessMock).toHaveBeenCalledTimes(0);
    expect(upsert).toHaveBeenCalledTimes(3);
  });
});
