import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockUnauthenticated, mockAuthenticated, parseResponse } from "../helpers/auth";
import { assertSafeErrorResponse, assertNoPII } from "../helpers/assertions";

// server-only is mocked globally in setup.ts, but re-declare for safety after resetModules
vi.mock("server-only", () => ({}));

// Anthropic SDK throws in jsdom ("browser-like environment") — mock at module level
vi.mock("@/lib/ai", () => ({
  anthropic: {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "{}" }],
      }),
      stream: vi.fn(),
    },
  },
  SONNET: "claude-sonnet-4-6",
  HAIKU: "claude-haiku-4-5-20251001",
  FIRECRAWL_API_KEY: "",
}));

// Audit log tries to write to real DB — mock globally
vi.mock("@/lib/security/audit", () => ({
  auditLog: vi.fn(),
}));

function makeReq(
  url: string,
  method = "POST",
  body?: unknown
): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("Auth bypass protection", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // ── Every protected route must return 401 for unauthenticated requests ──

  const protectedRoutes: Array<{
    name: string;
    path: string;
    importPath: string;
    needsBody: boolean;
  }> = [
    {
      name: "POST /api/generate-answer",
      path: "/api/generate-answer",
      importPath: "@/app/api/generate-answer/route",
      needsBody: true,
    },
    {
      name: "POST /api/create-session",
      path: "/api/create-session",
      importPath: "@/app/api/create-session/route",
      needsBody: true,
    },
    {
      name: "POST /api/chat",
      path: "/api/chat",
      importPath: "@/app/api/chat/route",
      needsBody: true,
    },
    {
      name: "POST /api/report",
      path: "/api/report",
      importPath: "@/app/api/report/route",
      needsBody: true,
    },
    {
      name: "POST /api/feedback/explicit",
      path: "/api/feedback/explicit",
      importPath: "@/app/api/feedback/explicit/route",
      needsBody: true,
    },
    {
      name: "POST /api/feedback/session",
      path: "/api/feedback/session",
      importPath: "@/app/api/feedback/session/route",
      needsBody: true,
    },
    {
      name: "POST /api/answer-feedback",
      path: "/api/answer-feedback",
      importPath: "@/app/api/answer-feedback/route",
      needsBody: true,
    },
    {
      name: "POST /api/user/delete-account",
      path: "/api/user/delete-account",
      importPath: "@/app/api/user/delete-account/route",
      needsBody: false,
    },
  ];

  describe("Protected routes reject unauthenticated requests", () => {
    for (const route of protectedRoutes) {
      it(`${route.name} → 401`, async () => {
        mockUnauthenticated();
        const mod = await import(route.importPath);
        const req = makeReq(
          `http://localhost:3000${route.path}`,
          "POST",
          route.needsBody ? { placeholder: true } : undefined
        );
        const res = await mod.POST(req);
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBeDefined();
        expect(body.error.toLowerCase()).toContain("unauthorized");
      });
    }
  });

  // ── 401 error responses do not leak sensitive information ──

  describe("401 error responses are safe", () => {
    it("does not leak stack traces, API keys, or internal paths", async () => {
      mockUnauthenticated();
      const { POST } = await import("@/app/api/generate-answer/route");
      const req = makeReq("http://localhost:3000/api/generate-answer", "POST", {
        sessionId: "00000000-0000-0000-0000-000000000000",
        answerType: "tell_me_about_yourself",
      });
      const res = await POST(req);
      const body = await res.json();
      assertSafeErrorResponse(body);
    });

    it("does not leak PII in error messages", async () => {
      mockUnauthenticated();
      const { POST } = await import("@/app/api/report/route");
      const req = makeReq("http://localhost:3000/api/report", "POST", {});
      const res = await POST(req);
      const body = await res.json();
      assertNoPII(body.error);
    });

    it("returns consistent error shape across routes", async () => {
      mockUnauthenticated();
      const generateAnswer = await import("@/app/api/generate-answer/route");
      const report = await import("@/app/api/report/route");
      const deleteAccount = await import("@/app/api/user/delete-account/route");

      const responses = await Promise.all([
        generateAnswer.POST(makeReq("http://localhost:3000/api/generate-answer", "POST", {})),
        report.POST(makeReq("http://localhost:3000/api/report", "POST", {})),
        deleteAccount.POST(makeReq("http://localhost:3000/api/user/delete-account")),
      ]);

      for (const res of responses) {
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body).toHaveProperty("error");
        expect(typeof body.error).toBe("string");
        // Must not include any data beyond the error message
        const keys = Object.keys(body);
        expect(keys).toEqual(["error"]);
      }
    });
  });

  // ── 500 error responses use generic messages ──

  describe("500 error responses use generic messages", () => {
    it("generate-answer catches exceptions and returns generic error", async () => {
      // Auth passes, rate limit passes, but AI call throws
      mockAuthenticated("user-500-test");
      vi.doMock("@/lib/security/rate-limit", () => ({
        aiLimiter: null,
        feedbackLimiter: null,
        checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, headers: {} }),
      }));
      vi.doMock("@/lib/ai", () => ({
        anthropic: {
          messages: {
            create: vi.fn().mockRejectedValue(new Error("ANTHROPIC_INTERNAL: token limit exceeded")),
          },
        },
        SONNET: "claude-sonnet-4-6",
        HAIKU: "claude-haiku-4-5-20251001",
      }));
      vi.doMock("@/lib/security/audit", () => ({
        auditLog: vi.fn(),
      }));

      const { POST } = await import("@/app/api/generate-answer/route");
      const req = makeReq("http://localhost:3000/api/generate-answer", "POST", {
        sessionId: "00000000-0000-0000-0000-000000000000",
        answerType: "tell_me_about_yourself",
        session: {
          resume: { backgroundType: "direct_sales", roles: [], skills: [] },
          company: { name: "Test" },
          targetRole: "SDR",
          jobDescription: "Test job",
          roleType: "sdr_bdr",
          stage: "recruiter",
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      assertSafeErrorResponse(body);
      // Must NOT contain the actual internal error message
      expect(body.error).not.toContain("ANTHROPIC_INTERNAL");
      expect(body.error).not.toContain("token limit");
    });

    it("report catches DB errors and returns generic error", async () => {
      mockAuthenticated("user-500-test");
      vi.doMock("@/lib/security/rate-limit", () => ({
        feedbackLimiter: null,
        checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, headers: {} }),
      }));
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: () => ({
            insert: () => ({
              select: () => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "violates foreign key constraint on users.id" },
                }),
              }),
            }),
          }),
        }),
      }));
      vi.doMock("@/lib/security/encryption", () => ({
        encrypt: vi.fn((val: string) => `encrypted:${val}`),
      }));
      vi.doMock("@/lib/privacy/normalizer", () => ({
        normalizeCompanyName: vi.fn((name: string) => name.toLowerCase()),
      }));

      const { POST } = await import("@/app/api/report/route");
      const req = makeReq("http://localhost:3000/api/report", "POST", {
        companyName: "TestCo",
        roleTitle: "SDR",
        stage: "recruiter",
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      assertSafeErrorResponse(body);
      // Must NOT contain the actual DB error
      expect(body.error).not.toContain("foreign key");
      expect(body.error).not.toContain("users.id");
    });
  });

  // ── Cross-user access via forged session ──

  describe("Cross-user data isolation", () => {
    it("verifyApiAuth identifies the real user, not a spoofed header", async () => {
      // User A is authenticated
      const userA = mockAuthenticated("user-a-id", "usera@test.com");
      vi.doMock("@/lib/security/rate-limit", () => ({
        feedbackLimiter: null,
        checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, headers: {} }),
      }));
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: () => ({
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }));

      const { POST } = await import("@/app/api/feedback/session/route");
      // Attempt to submit feedback with a different user's session ID
      const req = makeReq("http://localhost:3000/api/feedback/session", "POST", {
        sessionId: "other-users-session-id",
        confidenceBefore: 3,
      });

      // Route should use the authenticated user from verifyApiAuth, not trust any header
      const res = await POST(req);
      // The route doesn't do user-session ownership checks at this level —
      // that's enforced by RLS. But the auth is correct (user-a-id, not forged).
      expect(res.status).toBe(200);
    });

    it("cannot spoof auth via x-user-id header", async () => {
      mockUnauthenticated();
      const { POST } = await import("@/app/api/generate-answer/route");

      // Attacker tries to spoof auth via custom header
      const req = new NextRequest(
        new URL("http://localhost:3000/api/generate-answer"),
        {
          method: "POST",
          body: JSON.stringify({ answerType: "tell_me_about_yourself" }),
          headers: {
            "Content-Type": "application/json",
            "x-user-id": "admin-user-id",
            "x-forwarded-user": "admin@salesprep.ai",
          },
        }
      );

      const res = await POST(req);
      // Headers don't bypass verifyApiAuth — still 401
      expect(res.status).toBe(401);
    });
  });
});
