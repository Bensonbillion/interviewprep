import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/security/audit", () => ({
  auditLog: vi.fn(),
}));

function makeReq(url: string, method: string, body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("Report API Routes", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // ── POST /api/report ────────────────────────────────────────────────

  describe("POST /api/report", () => {
    const validReport = {
      companyName: "Salesforce",
      roleTitle: "SDR",
      stage: "recruiter",
    };

    it("creates interview report with required fields", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const reportId = "report-uuid-123";
      const insertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: reportId },
            error: null,
          }),
        }),
      });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: vi.fn().mockReturnValue({ insert: insertSpy }),
        }),
      }));
      vi.doMock("@/lib/security/encryption", () => ({
        encrypt: vi.fn((v: string) => `enc:${v}`),
      }));
      vi.doMock("@/lib/privacy/normalizer", () => ({
        normalizeCompanyName: vi.fn((name: string) => name.toLowerCase()),
      }));

      const { POST } = await import("@/app/api/report/route");
      const res = await POST(makeReq("/api/report", "POST", validReport));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.id).toBe(reportId);
    });

    it("normalizes company name on save", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const normalizeSpy = vi.fn((name: string) => name.toLowerCase().replace(", inc.", ""));
      vi.doMock("@/lib/privacy/normalizer", () => ({
        normalizeCompanyName: normalizeSpy,
      }));

      const insertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "r1" },
            error: null,
          }),
        }),
      });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: vi.fn().mockReturnValue({ insert: insertSpy }),
        }),
      }));
      vi.doMock("@/lib/security/encryption", () => ({
        encrypt: vi.fn((v: string) => `enc:${v}`),
      }));

      const { POST } = await import("@/app/api/report/route");
      await POST(
        makeReq("/api/report", "POST", {
          ...validReport,
          companyName: "Salesforce, Inc.",
        })
      );

      expect(normalizeSpy).toHaveBeenCalledWith("Salesforce, Inc.");
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          company_name: "Salesforce, Inc.",
          company_name_normalized: "salesforce",
        })
      );
    });

    it("stores reported questions with auto-categorization", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const reportInsertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "r1" },
            error: null,
          }),
        }),
      });
      const questionsInsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: vi.fn().mockImplementation((table: string) => {
            if (table === "interview_reports") return { insert: reportInsertSpy };
            if (table === "interview_questions_reported") return { insert: questionsInsertSpy };
            return { insert: vi.fn() };
          }),
        }),
      }));
      vi.doMock("@/lib/security/encryption", () => ({
        encrypt: vi.fn((v: string) => `enc:${v}`),
      }));
      vi.doMock("@/lib/privacy/normalizer", () => ({
        normalizeCompanyName: vi.fn((name: string) => name.toLowerCase()),
      }));

      const { POST } = await import("@/app/api/report/route");
      const res = await POST(
        makeReq("/api/report", "POST", {
          ...validReport,
          questions: [
            {
              questionText: "Tell me about a time you overcame an objection",
              wasExpected: true,
              feltPrepared: true,
            },
            {
              questionText: "Sell me this pen",
              questionCategory: "roleplay",
              wasExpected: false,
              feltPrepared: false,
            },
          ],
        })
      );

      expect(res.status).toBe(200);
      expect(questionsInsertSpy).toHaveBeenCalled();
      const questionRows = questionsInsertSpy.mock.calls[0][0];
      expect(questionRows).toHaveLength(2);
      // First question should be auto-categorized as behavioral
      expect(questionRows[0].question_category).toBe("behavioral");
      // Second question has explicit category
      expect(questionRows[1].question_category).toBe("roleplay");
    });

    it("encrypts sensitive notes", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const encryptSpy = vi.fn((v: string) => `enc:${v}`);
      vi.doMock("@/lib/security/encryption", () => ({
        encrypt: encryptSpy,
      }));
      vi.doMock("@/lib/privacy/normalizer", () => ({
        normalizeCompanyName: vi.fn((name: string) => name.toLowerCase()),
      }));

      const insertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "r1" },
            error: null,
          }),
        }),
      });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: vi.fn().mockReturnValue({ insert: insertSpy }),
        }),
      }));

      const { POST } = await import("@/app/api/report/route");
      await POST(
        makeReq("/api/report", "POST", {
          ...validReport,
          overallNotes: "The interviewer seemed interested in my cold calling skills",
        })
      );

      expect(encryptSpy).toHaveBeenCalledWith(
        "The interviewer seemed interested in my cold calling skills"
      );
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: "enc:The interviewer seemed interested in my cold calling skills",
        })
      );
    });

    it("rejects report without required fields", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const { POST } = await import("@/app/api/report/route");

      // Missing companyName
      const res1 = await POST(
        makeReq("/api/report", "POST", { roleTitle: "SDR", stage: "recruiter" })
      );
      expect(res1.status).toBe(400);

      // Missing roleTitle
      vi.resetModules();
      mockAuthenticated();
      mockRateLimitAllowed();
      const mod2 = await import("@/app/api/report/route");
      const res2 = await mod2.POST(
        makeReq("/api/report", "POST", { companyName: "Test", stage: "recruiter" })
      );
      expect(res2.status).toBe(400);

      // Missing stage
      vi.resetModules();
      mockAuthenticated();
      mockRateLimitAllowed();
      const mod3 = await import("@/app/api/report/route");
      const res3 = await mod3.POST(
        makeReq("/api/report", "POST", { companyName: "Test", roleTitle: "SDR" })
      );
      expect(res3.status).toBe(400);
    });

    it("returns 401 without authentication", async () => {
      const { mockUnauthenticated } = await import("../../helpers/auth");
      mockUnauthenticated();

      const { POST } = await import("@/app/api/report/route");
      const res = await POST(makeReq("/api/report", "POST", validReport));

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limited", async () => {
      const { mockAuthenticated, mockRateLimitBlocked } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitBlocked();

      const { POST } = await import("@/app/api/report/route");
      const res = await POST(makeReq("/api/report", "POST", validReport));

      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it("returns 500 on DB error without leaking details", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();
      vi.doMock("@/lib/security/encryption", () => ({
        encrypt: vi.fn((v: string) => `enc:${v}`),
      }));
      vi.doMock("@/lib/privacy/normalizer", () => ({
        normalizeCompanyName: vi.fn((name: string) => name.toLowerCase()),
      }));
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: vi.fn().mockReturnValue({
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "violates RLS policy for users table" },
                }),
              }),
            }),
          }),
        }),
      }));

      const { POST } = await import("@/app/api/report/route");
      const res = await POST(makeReq("/api/report", "POST", validReport));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).not.toContain("RLS");
      expect(body.error).not.toContain("users table");
    });

    it("accepts report with optional fields", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();
      vi.doMock("@/lib/security/encryption", () => ({
        encrypt: vi.fn((v: string) => `enc:${v}`),
      }));
      vi.doMock("@/lib/privacy/normalizer", () => ({
        normalizeCompanyName: vi.fn((name: string) => name.toLowerCase()),
      }));

      const insertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "r1" },
            error: null,
          }),
        }),
      });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: vi.fn().mockReturnValue({ insert: insertSpy }),
        }),
      }));

      const { POST } = await import("@/app/api/report/route");
      const res = await POST(
        makeReq("/api/report", "POST", {
          ...validReport,
          difficultyRating: 4,
          durationMinutes: 45,
          interviewerTitle: "VP of Sales",
        })
      );

      expect(res.status).toBe(200);
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: 4,
          duration_minutes: 45,
          interviewer_title: "VP of Sales",
        })
      );
    });

    it("cleans question text (strips common prefixes)", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const reportInsertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "r1" },
            error: null,
          }),
        }),
      });
      const questionsInsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: vi.fn().mockImplementation((table: string) => {
            if (table === "interview_reports") return { insert: reportInsertSpy };
            if (table === "interview_questions_reported") return { insert: questionsInsertSpy };
            return { insert: vi.fn() };
          }),
        }),
      }));
      vi.doMock("@/lib/security/encryption", () => ({
        encrypt: vi.fn((v: string) => `enc:${v}`),
      }));
      vi.doMock("@/lib/privacy/normalizer", () => ({
        normalizeCompanyName: vi.fn((name: string) => name.toLowerCase()),
      }));

      const { POST } = await import("@/app/api/report/route");
      await POST(
        makeReq("/api/report", "POST", {
          ...validReport,
          questions: [
            {
              questionText: "They asked me: What is your greatest strength?",
            },
          ],
        })
      );

      const questionRows = questionsInsertSpy.mock.calls[0][0];
      // "They asked me:" prefix should be stripped
      expect(questionRows[0].question_text).toBe("What is your greatest strength?");
    });

    it("limits questions to 10 max", async () => {
      const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
      mockAuthenticated();
      mockRateLimitAllowed();

      const reportInsertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "r1" },
            error: null,
          }),
        }),
      });
      const questionsInsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: vi.fn().mockImplementation((table: string) => {
            if (table === "interview_reports") return { insert: reportInsertSpy };
            if (table === "interview_questions_reported") return { insert: questionsInsertSpy };
            return { insert: vi.fn() };
          }),
        }),
      }));
      vi.doMock("@/lib/security/encryption", () => ({
        encrypt: vi.fn((v: string) => `enc:${v}`),
      }));
      vi.doMock("@/lib/privacy/normalizer", () => ({
        normalizeCompanyName: vi.fn((name: string) => name.toLowerCase()),
      }));

      const { POST } = await import("@/app/api/report/route");
      const questions = Array.from({ length: 15 }, (_, i) => ({
        questionText: `Question number ${i + 1} about sales process`,
      }));

      await POST(
        makeReq("/api/report", "POST", { ...validReport, questions })
      );

      const questionRows = questionsInsertSpy.mock.calls[0][0];
      expect(questionRows.length).toBeLessThanOrEqual(10);
    });
  });

  // ── PATCH /api/report/outcome ───────────────────────────────────────

  describe("PATCH /api/report/outcome", () => {
    it("updates interview outcome", async () => {
      const { mockAuthenticated } = await import("../../helpers/auth");
      mockAuthenticated();

      const updateSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: vi.fn().mockReturnValue({ update: updateSpy }),
        }),
      }));
      vi.doMock("@/lib/security/encryption", () => ({
        encrypt: vi.fn((v: string) => `enc:${v}`),
        encryptNumber: vi.fn((n: number) => `enc:${n}`),
      }));

      const { PATCH } = await import("@/app/api/report/outcome/route");
      const req = new NextRequest(
        new URL("http://localhost:3000/api/report/outcome"),
        {
          method: "PATCH",
          body: JSON.stringify({ reportId: "r1", outcome: "advanced" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await PATCH(req);

      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: "advanced",
          outcome_updated_at: expect.any(String),
        })
      );
    });

    it("encrypts salary data for offer outcome", async () => {
      const { mockAuthenticated } = await import("../../helpers/auth");
      mockAuthenticated();

      const encryptNumberSpy = vi.fn((n: number) => `enc:${n}`);
      vi.doMock("@/lib/security/encryption", () => ({
        encrypt: vi.fn((v: string) => `enc:${v}`),
        encryptNumber: encryptNumberSpy,
      }));

      const updateSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: vi.fn().mockReturnValue({ update: updateSpy }),
        }),
      }));

      const { PATCH } = await import("@/app/api/report/outcome/route");
      const req = new NextRequest(
        new URL("http://localhost:3000/api/report/outcome"),
        {
          method: "PATCH",
          body: JSON.stringify({
            reportId: "r1",
            outcome: "offer",
            offerBaseSalary: 75000,
            offerOte: 110000,
            offerCurrency: "USD",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await PATCH(req);

      expect(res.status).toBe(200);
      expect(encryptNumberSpy).toHaveBeenCalledWith(75000);
      expect(encryptNumberSpy).toHaveBeenCalledWith(110000);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: "offer",
          offer_base_salary: "enc:75000",
          offer_ote: "enc:110000",
          offer_currency: "USD",
        })
      );
    });

    it("accepts all valid outcome types", async () => {
      const outcomes = ["offer", "advanced", "rejected", "ghosted", "withdrew", "pending"];
      for (const outcome of outcomes) {
        vi.resetModules();
        const { mockAuthenticated } = await import("../../helpers/auth");
        mockAuthenticated();
        vi.doMock("@/lib/supabase/admin", () => ({
          createAdminClient: () => ({
            from: vi.fn().mockReturnValue({
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          }),
        }));
        vi.doMock("@/lib/security/encryption", () => ({
          encrypt: vi.fn((v: string) => `enc:${v}`),
          encryptNumber: vi.fn((n: number) => `enc:${n}`),
        }));

        const { PATCH } = await import("@/app/api/report/outcome/route");
        const req = new NextRequest(
          new URL("http://localhost:3000/api/report/outcome"),
          {
            method: "PATCH",
            body: JSON.stringify({ reportId: "r1", outcome }),
            headers: { "Content-Type": "application/json" },
          }
        );
        const res = await PATCH(req);
        expect(res.status, `outcome "${outcome}" should succeed`).toBe(200);
      }
    });

    it("rejects invalid outcome value", async () => {
      const { mockAuthenticated } = await import("../../helpers/auth");
      mockAuthenticated();

      const { PATCH } = await import("@/app/api/report/outcome/route");
      const req = new NextRequest(
        new URL("http://localhost:3000/api/report/outcome"),
        {
          method: "PATCH",
          body: JSON.stringify({ reportId: "r1", outcome: "hired" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await PATCH(req);

      expect(res.status).toBe(400);
    });

    it("returns 401 without authentication", async () => {
      const { mockUnauthenticated } = await import("../../helpers/auth");
      mockUnauthenticated();

      const { PATCH } = await import("@/app/api/report/outcome/route");
      const req = new NextRequest(
        new URL("http://localhost:3000/api/report/outcome"),
        {
          method: "PATCH",
          body: JSON.stringify({ reportId: "r1", outcome: "offer" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await PATCH(req);

      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/report/outcome ─────────────────────────────────────────

  describe("GET /api/report/outcome", () => {
    it("fetches pending reports for nudge cards", async () => {
      const { mockAuthenticated } = await import("../../helpers/auth");
      mockAuthenticated();

      const pendingReports = [
        {
          id: "r1",
          company_name: "Salesforce",
          role_title: "SDR",
          stage: "recruiter",
          outcome: "pending",
          created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
      ];

      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: pendingReports,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }));

      const { GET } = await import("@/app/api/report/outcome/route");
      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.reports).toHaveLength(1);
      expect(body.reports[0].company_name).toBe("Salesforce");
    });

    it("returns empty array on DB error", async () => {
      const { mockAuthenticated } = await import("../../helpers/auth");
      mockAuthenticated();

      vi.doMock("@/lib/supabase/admin", () => ({
        createAdminClient: () => ({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: null,
                      error: { message: "connection refused" },
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }));

      const { GET } = await import("@/app/api/report/outcome/route");
      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.reports).toEqual([]);
    });

    it("returns 401 without authentication", async () => {
      const { mockUnauthenticated } = await import("../../helpers/auth");
      mockUnauthenticated();

      const { GET } = await import("@/app/api/report/outcome/route");
      const res = await GET();

      expect(res.status).toBe(401);
    });
  });
});
