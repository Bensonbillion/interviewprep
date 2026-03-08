import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/security/audit", () => ({
  auditLog: vi.fn(),
}));

function makeReq(url: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Feedback API Routes", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // ── POST /api/answer-feedback ───────────────────────────────────────

  describe("POST /api/answer-feedback", () => {
    const validFeedback = {
      sessionId: "s1",
      answerType: "tell_me_about_yourself",
      feedbackType: "thumbs_up",
    };

    it("stores answer feedback for authenticated user", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: () => ({ insert: insertSpy }),
        }),
      }));

      const { POST } = await import("@/app/api/answer-feedback/route");
      const res = await POST(makeReq("/api/answer-feedback", validFeedback));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: "s1",
          answer_type: "tell_me_about_yourself",
          feedback_type: "thumbs_up",
        })
      );
    });

    it("accepts thumbs_down feedback", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: () => ({ insert: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        }),
      }));

      const { POST } = await import("@/app/api/answer-feedback/route");
      const res = await POST(
        makeReq("/api/answer-feedback", { ...validFeedback, feedbackType: "thumbs_down" })
      );

      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
    });

    it("accepts copy feedback", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: () => ({ insert: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        }),
      }));

      const { POST } = await import("@/app/api/answer-feedback/route");
      const res = await POST(
        makeReq("/api/answer-feedback", { ...validFeedback, feedbackType: "copy" })
      );

      expect(res.status).toBe(200);
    });

    it("rejects invalid feedbackType", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const { POST } = await import("@/app/api/answer-feedback/route");
      const res = await POST(
        makeReq("/api/answer-feedback", { ...validFeedback, feedbackType: "dislike" })
      );

      expect(res.status).toBe(400);
    });

    it("returns 401 without authentication", async () => {
      const { mockUnauthenticated } = await import("../../helpers/auth");
      mockUnauthenticated();

      const { POST } = await import("@/app/api/answer-feedback/route");
      const res = await POST(makeReq("/api/answer-feedback", validFeedback));

      expect(res.status).toBe(401);
    });

    it("silently returns ok when rate limited (fire-and-forget)", async () => {
      const { mockAuthenticated, mockRateLimitBlocked } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitBlocked();

      const { POST } = await import("@/app/api/answer-feedback/route");
      const res = await POST(makeReq("/api/answer-feedback", validFeedback));

      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
    });

    it("returns ok even when DB insert fails (fire-and-forget)", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: () => ({
            insert: vi.fn().mockRejectedValue(new Error("DB connection lost")),
          }),
        }),
      }));

      const { POST } = await import("@/app/api/answer-feedback/route");
      const res = await POST(makeReq("/api/answer-feedback", validFeedback));

      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
    });
  });

  // ── POST /api/feedback/explicit ─────────────────────────────────────

  describe("POST /api/feedback/explicit", () => {
    const validExplicit = {
      sessionId: "s1",
      answerType: "tell_me_about_yourself",
      rating: 4,
    };

    it("stores explicit feedback with rating", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: () => ({ insert: insertSpy }),
        }),
      }));
      vi.doMock("@/lib/security/encryption", () => ({
        encrypt: vi.fn((v: string) => `enc:${v}`),
      }));

      const { POST } = await import("@/app/api/feedback/explicit/route");
      const res = await POST(makeReq("/api/feedback/explicit", validExplicit));

      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: "s1",
          answer_type: "tell_me_about_yourself",
          rating: 4,
        })
      );
    });

    it("stores 'how would you say it' text (encrypted)", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: () => ({ insert: insertSpy }),
        }),
      }));
      vi.doMock("@/lib/security/encryption", () => ({
        encrypt: vi.fn((v: string) => `enc:${v}`),
      }));

      const { POST } = await import("@/app/api/feedback/explicit/route");
      const res = await POST(
        makeReq("/api/feedback/explicit", {
          ...validExplicit,
          howWouldYouSayIt: "I would say it like this instead",
          whatWouldImprove: "Add more specific numbers",
        })
      );

      expect(res.status).toBe(200);
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          how_would_you_say_it: "enc:I would say it like this instead",
          what_would_improve: "enc:Add more specific numbers",
        })
      );
    });

    it("stores optional quality flags", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: () => ({ insert: insertSpy }),
        }),
      }));
      vi.doMock("@/lib/security/encryption", () => ({
        encrypt: vi.fn((v: string) => `enc:${v}`),
      }));

      const { POST } = await import("@/app/api/feedback/explicit/route");
      const res = await POST(
        makeReq("/api/feedback/explicit", {
          ...validExplicit,
          soundsNatural: true,
          tooLong: false,
          tooGeneric: true,
        })
      );

      expect(res.status).toBe(200);
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sounds_natural: true,
          too_long: false,
          too_generic: true,
        })
      );
    });

    it("validates rating range (rejects 0)", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const { POST } = await import("@/app/api/feedback/explicit/route");
      const res = await POST(
        makeReq("/api/feedback/explicit", { ...validExplicit, rating: 0 })
      );

      expect(res.status).toBe(400);
    });

    it("validates rating range (rejects 6)", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const { POST } = await import("@/app/api/feedback/explicit/route");
      const res = await POST(
        makeReq("/api/feedback/explicit", { ...validExplicit, rating: 6 })
      );

      expect(res.status).toBe(400);
    });

    it("returns 401 without authentication", async () => {
      const { mockUnauthenticated } = await import("../../helpers/auth");
      mockUnauthenticated();

      const { POST } = await import("@/app/api/feedback/explicit/route");
      const res = await POST(makeReq("/api/feedback/explicit", validExplicit));

      expect(res.status).toBe(401);
    });

    it("silently returns ok when rate limited", async () => {
      const { mockAuthenticated, mockRateLimitBlocked } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitBlocked();

      const { POST } = await import("@/app/api/feedback/explicit/route");
      const res = await POST(makeReq("/api/feedback/explicit", validExplicit));

      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
    });
  });

  // ── POST /api/feedback/session ──────────────────────────────────────

  describe("POST /api/feedback/session", () => {
    it("stores session feedback with all optional fields", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: () => ({ insert: insertSpy }),
        }),
      }));

      const { POST } = await import("@/app/api/feedback/session/route");
      const res = await POST(
        makeReq("/api/feedback/session", {
          sessionId: "s1",
          confidenceBefore: 2,
          confidenceAfter: 4,
          mostHelpfulCard: "cheat_sheet",
          wouldRecommend: true,
        })
      );

      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: "s1",
          confidence_before: 2,
          confidence_after: 4,
          most_helpful_card: "cheat_sheet",
          would_recommend: true,
        })
      );
    });

    it("accepts minimal input (sessionId only)", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: () => ({ insert: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        }),
      }));

      const { POST } = await import("@/app/api/feedback/session/route");
      const res = await POST(
        makeReq("/api/feedback/session", { sessionId: "s1" })
      );

      expect(res.status).toBe(200);
    });

    it("returns 401 without authentication", async () => {
      const { mockUnauthenticated } = await import("../../helpers/auth");
      mockUnauthenticated();

      const { POST } = await import("@/app/api/feedback/session/route");
      const res = await POST(
        makeReq("/api/feedback/session", { sessionId: "s1" })
      );

      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/feedback/confidence ───────────────────────────────────

  describe("POST /api/feedback/confidence", () => {
    it("upserts confidence score", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: () => ({ upsert: upsertSpy }),
        }),
      }));

      const { POST } = await import("@/app/api/feedback/confidence/route");
      const res = await POST(
        makeReq("/api/feedback/confidence", {
          sessionId: "s1",
          stage: "recruiter",
          score: 4,
        })
      );

      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: "s1",
          stage: "recruiter",
          score: 4,
        }),
        expect.objectContaining({ onConflict: "session_id" })
      );
    });
  });

  // ── POST /api/feedback/voice-sample ─────────────────────────────────

  describe("POST /api/feedback/voice-sample", () => {
    it("stores encrypted voice sample", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: () => ({ insert: insertSpy }),
        }),
      }));
      vi.doMock("@/lib/security/encryption", () => ({
        encrypt: vi.fn((v: string) => `enc:${v}`),
      }));

      const { POST } = await import("@/app/api/feedback/voice-sample/route");
      const res = await POST(
        makeReq("/api/feedback/voice-sample", {
          sessionId: "s1",
          answerType: "tell_me_about_yourself",
          aiContentSnapshot: "AI generated this content",
          userVersion: "This is how I would actually say it in my own words",
        })
      );

      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: "s1",
          answer_type: "tell_me_about_yourself",
          ai_content_snapshot: "enc:AI generated this content",
          user_version: expect.stringContaining("enc:"),
        })
      );
    });

    it("returns 401 without authentication", async () => {
      const { mockUnauthenticated } = await import("../../helpers/auth");
      mockUnauthenticated();

      const { POST } = await import("@/app/api/feedback/voice-sample/route");
      const res = await POST(
        makeReq("/api/feedback/voice-sample", {
          sessionId: "s1",
          answerType: "why_sales",
          aiContentSnapshot: "AI content",
          userVersion: "This is my own version of the answer",
        })
      );

      expect(res.status).toBe(401);
    });
  });
});
