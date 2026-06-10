import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the Supabase admin client ───────────────────────────────────────
// checkAccess goes through two calls: a has_entitlement RPC and a
// users.credit_balance read. We stub both with vi.fn so each test can
// shape the response independently.

const mockRpc = vi.fn();
const mockFromResult = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
};
const mockFrom = vi.fn(() => mockFromResult);

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

// Now we can import checkAccess.
import { checkAccess } from "@/lib/entitlements";

beforeEach(() => {
  mockRpc.mockReset();
  mockFromResult.select.mockClear().mockReturnValue(mockFromResult);
  mockFromResult.eq.mockClear().mockReturnValue(mockFromResult);
  mockFromResult.gt.mockClear().mockReturnValue(mockFromResult);
  mockFromResult.maybeSingle.mockReset();
  mockFrom.mockClear();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────
const USER = "11111111-1111-1111-1111-111111111111";
const SAMSARA = "Samsara";
const MOTIVE = "Motive";

function rpcReturns(result: boolean) {
  // checkAccess calls rpc twice when entitlement is true: once for the
  // boolean check, then resolveCoveringEntitlement does a series of
  // .from queries. So mock rpc to return the boolean and shape .from
  // queries via the maybeSingle responses below.
  mockRpc.mockResolvedValue({ data: result, error: null });
}

function rpcErrors(msg: string) {
  mockRpc.mockResolvedValue({ data: null, error: { message: msg } });
}

function entitlementRowReturns(rows: Array<unknown | null>) {
  // resolveCoveringEntitlement reads in order: search_pass, full_interview,
  // single_round. Test supplies one response per query.
  for (const r of rows) mockFromResult.maybeSingle.mockResolvedValueOnce({ data: r, error: null });
}

function creditBalanceReturns(balance: number) {
  mockFromResult.maybeSingle.mockResolvedValueOnce({ data: { credit_balance: balance }, error: null });
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("checkAccess — entitlement-first / credit fallback", () => {
  describe("search_pass", () => {
    it("covers every action when active and unexpired", async () => {
      rpcReturns(true);
      entitlementRowReturns([
        { id: "pass-1", type: "search_pass", expires_at: "2099-12-31T00:00:00Z" },
      ]);
      const r = await checkAccess(USER, "kit", { company: SAMSARA, round: "recruiter" });
      expect(r.allowed).toBe(true);
      expect(r.source).toBe("entitlement");
      expect(r.entitlement?.type).toBe("search_pass");
    });

    it("covers live_mode (which single_round does NOT)", async () => {
      rpcReturns(true);
      entitlementRowReturns([
        { id: "pass-1", type: "search_pass", expires_at: "2099-12-31T00:00:00Z" },
      ]);
      const r = await checkAccess(USER, "live_mode", {});
      expect(r.allowed).toBe(true);
      expect(r.source).toBe("entitlement");
    });
  });

  describe("full_interview", () => {
    it("covers all actions at the matching company, including live_mode", async () => {
      rpcReturns(true);
      // No search_pass row, full_interview row at Samsara.
      entitlementRowReturns([null, { id: "fi-1", type: "full_interview", expires_at: null }]);
      const r = await checkAccess(USER, "live_mode", { company: SAMSARA });
      expect(r.allowed).toBe(true);
      expect(r.source).toBe("entitlement");
      expect(r.entitlement?.type).toBe("full_interview");
    });

    it("does NOT cover a different company (per has_entitlement scope filter)", async () => {
      // RPC sees Motive, has no entitlement, returns false → fall to credits.
      rpcReturns(false);
      creditBalanceReturns(0);
      const r = await checkAccess(USER, "kit", { company: MOTIVE, round: "recruiter" });
      expect(r.allowed).toBe(false);
      expect(r.source).toBe("denied");
    });
  });

  describe("single_round", () => {
    it("covers non-live_mode actions at the matching (company, round)", async () => {
      rpcReturns(true);
      // No pass, no full_interview, single_round at (Samsara, hiring_manager).
      entitlementRowReturns([
        null,
        null,
        { id: "sr-1", type: "single_round", expires_at: null },
      ]);
      const r = await checkAccess(USER, "unlock", { company: SAMSARA, round: "hiring_manager" });
      expect(r.allowed).toBe(true);
      expect(r.source).toBe("entitlement");
      expect(r.entitlement?.type).toBe("single_round");
    });

    it("does NOT cover live_mode — the SQL function rejects single_round for live_mode actions", async () => {
      rpcReturns(false); // has_entitlement returns false for live_mode + single_round only
      creditBalanceReturns(0);
      const r = await checkAccess(USER, "live_mode", { company: SAMSARA, round: "hiring_manager" });
      expect(r.allowed).toBe(false);
      expect(r.source).toBe("denied");
    });

    it("does NOT cover a different round at the same company", async () => {
      // Holder has single_round for (Samsara, hiring_manager). They try to
      // access a recruiter round at Samsara. The SQL function filters on
      // round_scope = p_round, so it returns false. Falls to credits, none.
      rpcReturns(false);
      creditBalanceReturns(0);
      const r = await checkAccess(USER, "unlock", { company: SAMSARA, round: "recruiter" });
      expect(r.allowed).toBe(false);
      expect(r.source).toBe("denied");
    });

    it("does NOT cover the same round at a different company", async () => {
      rpcReturns(false);
      creditBalanceReturns(0);
      const r = await checkAccess(USER, "unlock", { company: MOTIVE, round: "hiring_manager" });
      expect(r.allowed).toBe(false);
      expect(r.source).toBe("denied");
    });
  });

  describe("legacy credit fallback", () => {
    it("allows when no entitlement matches but credit_balance > 0", async () => {
      rpcReturns(false);
      creditBalanceReturns(5);
      const r = await checkAccess(USER, "kit", { company: SAMSARA, round: "recruiter" });
      expect(r.allowed).toBe(true);
      expect(r.source).toBe("credit");
      expect(r.credit_balance).toBe(5);
    });

    it("denies when no entitlement and credit_balance is 0", async () => {
      rpcReturns(false);
      creditBalanceReturns(0);
      const r = await checkAccess(USER, "kit", { company: SAMSARA, round: "recruiter" });
      expect(r.allowed).toBe(false);
      expect(r.source).toBe("denied");
      expect(r.credit_balance).toBe(0);
    });
  });

  describe("error handling", () => {
    it("denies on has_entitlement RPC error — never silently grandfather to credits", async () => {
      rpcErrors("connection refused");
      const r = await checkAccess(USER, "kit", { company: SAMSARA, round: "recruiter" });
      expect(r.allowed).toBe(false);
      expect(r.source).toBe("denied");
      // Critical: the credit fallback path must NOT have been consulted —
      // otherwise a flaky RPC would silently bypass entitlement gating.
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("denies on credit_balance read error (treats null as zero)", async () => {
      rpcReturns(false);
      // Simulate the read error returning null instead of a balance row.
      mockFromResult.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
      const r = await checkAccess(USER, "kit", { company: SAMSARA, round: "recruiter" });
      expect(r.allowed).toBe(false);
      expect(r.source).toBe("denied");
    });
  });

  describe("scope discipline", () => {
    it("denies without a company unless a pass covers — full_interview cannot bypass scope", async () => {
      // Caller doesn't supply company. Without a search_pass, has_entitlement
      // returns false (per the SQL function's "p_company IS NULL → false" branch).
      rpcReturns(false);
      creditBalanceReturns(0);
      const r = await checkAccess(USER, "kit", {});
      expect(r.allowed).toBe(false);
      expect(r.source).toBe("denied");
    });
  });
});
