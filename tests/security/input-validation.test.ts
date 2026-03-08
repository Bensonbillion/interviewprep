import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockAuthenticated } from "../helpers/auth";
import { MALICIOUS_INPUTS } from "../helpers/factories";
import { assertSafeErrorResponse, assertNoXSS } from "../helpers/assertions";

vi.mock("server-only", () => ({}));

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

// ── Direct schema tests (no route import needed) ────────────────────────

describe("Zod schema enforcement", () => {
  describe("GenerateAnswerInputSchema", () => {
    let schema: typeof import("@/lib/types/schemas").GenerateAnswerInputSchema;

    beforeEach(async () => {
      const mod = await import("@/lib/types/schemas");
      schema = mod.GenerateAnswerInputSchema;
    });

    it("rejects missing answerType", () => {
      const result = schema.safeParse({
        sessionId: "00000000-0000-0000-0000-000000000000",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid answerType enum value", () => {
      const result = schema.safeParse({
        sessionId: "00000000-0000-0000-0000-000000000000",
        answerType: "hack_the_system",
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-UUID sessionId", () => {
      const result = schema.safeParse({
        sessionId: "not-a-uuid",
        answerType: "tell_me_about_yourself",
      });
      expect(result.success).toBe(false);
    });

    it("rejects customInstructions over 500 characters", () => {
      const result = schema.safeParse({
        sessionId: "00000000-0000-0000-0000-000000000000",
        answerType: "tell_me_about_yourself",
        customInstructions: "A".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid input", () => {
      const result = schema.safeParse({
        sessionId: "00000000-0000-0000-0000-000000000000",
        answerType: "tell_me_about_yourself",
        customInstructions: "Be more concise",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("CreateSessionInputSchema", () => {
    let schema: typeof import("@/lib/types/schemas").CreateSessionInputSchema;

    beforeEach(async () => {
      const mod = await import("@/lib/types/schemas");
      schema = mod.CreateSessionInputSchema;
    });

    const validInput = {
      resumeId: "00000000-0000-0000-0000-000000000000",
      companyId: "00000000-0000-0000-0000-000000000000",
      jobDescription: "Looking for a sales rep with experience in SaaS",
      targetRole: "Account Executive",
      roleType: "account_executive",
      stage: "hiring_manager",
    };

    it("accepts valid input", () => {
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it("rejects non-UUID resumeId", () => {
      const result = schema.safeParse({ ...validInput, resumeId: "not-uuid" });
      expect(result.success).toBe(false);
    });

    it("rejects too-short jobDescription (< 10 chars)", () => {
      const result = schema.safeParse({ ...validInput, jobDescription: "short" });
      expect(result.success).toBe(false);
    });

    it("rejects too-long jobDescription (> 10000 chars)", () => {
      const result = schema.safeParse({
        ...validInput,
        jobDescription: "A".repeat(10001),
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid roleType", () => {
      const result = schema.safeParse({ ...validInput, roleType: "ceo" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid stage", () => {
      const result = schema.safeParse({ ...validInput, stage: "final_boss" });
      expect(result.success).toBe(false);
    });

    it("rejects empty targetRole", () => {
      const result = schema.safeParse({ ...validInput, targetRole: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("reportSchema", () => {
    let schema: typeof import("@/lib/validation/schemas").reportSchema;

    beforeEach(async () => {
      const mod = await import("@/lib/validation/schemas");
      schema = mod.reportSchema;
    });

    const validReport = {
      companyName: "Salesforce",
      roleTitle: "SDR",
      stage: "recruiter",
    };

    it("accepts valid minimal input", () => {
      expect(schema.safeParse(validReport).success).toBe(true);
    });

    it("rejects missing companyName", () => {
      const { companyName, ...rest } = validReport;
      expect(schema.safeParse(rest).success).toBe(false);
    });

    it("rejects missing stage", () => {
      const { stage, ...rest } = validReport;
      expect(schema.safeParse(rest).success).toBe(false);
    });

    it("rejects too many questions (> 15)", () => {
      const questions = Array.from({ length: 16 }, (_, i) => ({
        questionText: `Question ${i}`,
      }));
      const result = schema.safeParse({ ...validReport, questions });
      expect(result.success).toBe(false);
    });

    it("rejects companyName over 200 chars", () => {
      const result = schema.safeParse({
        ...validReport,
        companyName: "A".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("rejects overallNotes over 5000 chars", () => {
      const result = schema.safeParse({
        ...validReport,
        overallNotes: "A".repeat(5001),
      });
      expect(result.success).toBe(false);
    });

    it("rejects difficultyRating outside 1-5 range", () => {
      expect(
        schema.safeParse({ ...validReport, difficultyRating: 0 }).success
      ).toBe(false);
      expect(
        schema.safeParse({ ...validReport, difficultyRating: 6 }).success
      ).toBe(false);
    });
  });

  describe("explicitFeedbackSchema", () => {
    let schema: typeof import("@/lib/validation/schemas").explicitFeedbackSchema;

    beforeEach(async () => {
      const mod = await import("@/lib/validation/schemas");
      schema = mod.explicitFeedbackSchema;
    });

    const validFeedback = {
      sessionId: "test-session-1",
      answerType: "tell_me_about_yourself",
      rating: 4,
    };

    it("accepts valid input", () => {
      expect(schema.safeParse(validFeedback).success).toBe(true);
    });

    it("rejects rating outside 1-5", () => {
      expect(
        schema.safeParse({ ...validFeedback, rating: 0 }).success
      ).toBe(false);
      expect(
        schema.safeParse({ ...validFeedback, rating: 6 }).success
      ).toBe(false);
    });

    it("rejects missing sessionId", () => {
      const { sessionId, ...rest } = validFeedback;
      expect(schema.safeParse(rest).success).toBe(false);
    });

    it("rejects howWouldYouSayIt over 5000 chars", () => {
      const result = schema.safeParse({
        ...validFeedback,
        howWouldYouSayIt: "A".repeat(5001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("answerFeedbackSchema", () => {
    let schema: typeof import("@/lib/validation/schemas").answerFeedbackSchema;

    beforeEach(async () => {
      const mod = await import("@/lib/validation/schemas");
      schema = mod.answerFeedbackSchema;
    });

    it("accepts valid thumbs_up", () => {
      expect(
        schema.safeParse({
          sessionId: "s1",
          answerType: "tell_me_about_yourself",
          feedbackType: "thumbs_up",
        }).success
      ).toBe(true);
    });

    it("rejects invalid feedbackType", () => {
      expect(
        schema.safeParse({
          sessionId: "s1",
          answerType: "tell_me_about_yourself",
          feedbackType: "dislike",
        }).success
      ).toBe(false);
    });
  });
});

// ── XSS sanitization via safeString ─────────────────────────────────────

describe("XSS sanitization via safeString", () => {
  let reportSchema: typeof import("@/lib/validation/schemas").reportSchema;
  let explicitFeedbackSchema: typeof import("@/lib/validation/schemas").explicitFeedbackSchema;

  beforeEach(async () => {
    const mod = await import("@/lib/validation/schemas");
    reportSchema = mod.reportSchema;
    explicitFeedbackSchema = mod.explicitFeedbackSchema;
  });

  it("strips <script> tags from report companyName", () => {
    const result = reportSchema.safeParse({
      companyName: 'Salesforce<script>alert("xss")</script>',
      roleTitle: "SDR",
      stage: "recruiter",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      assertNoXSS(result.data.companyName);
      expect(result.data.companyName).not.toContain("<script>");
    }
  });

  it("strips javascript: URIs from report overallNotes", () => {
    const result = reportSchema.safeParse({
      companyName: "TestCo",
      roleTitle: "SDR",
      stage: "recruiter",
      overallNotes: "Check this link: javascript:alert(document.cookie)",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.overallNotes).not.toMatch(/javascript:/i);
    }
  });

  it("strips <script> tags from feedback howWouldYouSayIt", () => {
    const result = explicitFeedbackSchema.safeParse({
      sessionId: "s1",
      answerType: "tell_me_about_yourself",
      rating: 4,
      howWouldYouSayIt: '<script>document.location="http://evil.com"</script>I would say it differently',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      assertNoXSS(result.data.howWouldYouSayIt!);
    }
  });

  it("strips all XSS payloads from safeString fields", () => {
    const xssPayloads = MALICIOUS_INPUTS.xss.filter(
      (p) => p.includes("<script") || p.includes("javascript:")
    );

    for (const payload of xssPayloads) {
      const result = reportSchema.safeParse({
        companyName: `Test ${payload}`,
        roleTitle: `Role ${payload}`,
        stage: "recruiter",
        overallNotes: payload,
      });

      // Should either reject (too long) or sanitize
      if (result.success) {
        if (result.data.companyName) {
          expect(result.data.companyName).not.toMatch(/<script[\s>]/i);
          expect(result.data.companyName).not.toMatch(/javascript:/i);
        }
        if (result.data.overallNotes) {
          expect(result.data.overallNotes).not.toMatch(/<script[\s>]/i);
          expect(result.data.overallNotes).not.toMatch(/javascript:/i);
        }
      }
    }
  });

  it("preserves normal text after sanitization", () => {
    const result = reportSchema.safeParse({
      companyName: "  Salesforce Inc.  ",
      roleTitle: "  Senior SDR  ",
      stage: "recruiter",
      overallNotes: "Great interview, asked about MEDDIC methodology",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // safeString trims whitespace
      expect(result.data.companyName).toBe("Salesforce Inc.");
      expect(result.data.roleTitle).toBe("Senior SDR");
      expect(result.data.overallNotes).toBe(
        "Great interview, asked about MEDDIC methodology"
      );
    }
  });
});

// ── SQL injection payloads treated as plain text ────────────────────────

describe("SQL injection neutralization", () => {
  it("SQL injection payloads pass through Zod as plain strings (no execution)", async () => {
    const { reportSchema } = await import("@/lib/validation/schemas");

    for (const payload of MALICIOUS_INPUTS.sqlInjection) {
      const result = reportSchema.safeParse({
        companyName: payload.slice(0, 200),
        roleTitle: "SDR",
        stage: "recruiter",
      });
      // Zod treats them as strings — they parse fine but never reach SQL
      // (Supabase uses parameterized queries)
      if (result.success) {
        expect(typeof result.data.companyName).toBe("string");
      }
    }
  });

  it("SQL in sessionId field is rejected by format validation", async () => {
    const { GenerateAnswerInputSchema } = await import("@/lib/types/schemas");

    for (const payload of MALICIOUS_INPUTS.sqlInjection) {
      const result = GenerateAnswerInputSchema.safeParse({
        sessionId: payload,
        answerType: "tell_me_about_yourself",
      });
      // UUID validation rejects SQL injection payloads
      expect(result.success).toBe(false);
    }
  });
});

// ── Oversized input rejection ───────────────────────────────────────────

describe("Oversized input rejection", () => {
  it("rejects 100K character customInstructions", async () => {
    const { GenerateAnswerInputSchema } = await import("@/lib/types/schemas");
    const result = GenerateAnswerInputSchema.safeParse({
      sessionId: "00000000-0000-0000-0000-000000000000",
      answerType: "tell_me_about_yourself",
      customInstructions: MALICIOUS_INPUTS.oversizedInputs[0],
    });
    expect(result.success).toBe(false);
  });

  it("rejects 1M character jobDescription", async () => {
    const { CreateSessionInputSchema } = await import("@/lib/types/schemas");
    const result = CreateSessionInputSchema.safeParse({
      resumeId: "00000000-0000-0000-0000-000000000000",
      companyId: "00000000-0000-0000-0000-000000000000",
      jobDescription: MALICIOUS_INPUTS.oversizedInputs[1],
      targetRole: "SDR",
      roleType: "sdr_bdr",
      stage: "recruiter",
    });
    expect(result.success).toBe(false);
  });

  it("rejects 100K character overallNotes in report", async () => {
    const { reportSchema } = await import("@/lib/validation/schemas");
    const result = reportSchema.safeParse({
      companyName: "TestCo",
      roleTitle: "SDR",
      stage: "recruiter",
      overallNotes: MALICIOUS_INPUTS.oversizedInputs[0],
    });
    expect(result.success).toBe(false);
  });

  it("rejects 100K character howWouldYouSayIt in feedback", async () => {
    const { explicitFeedbackSchema } = await import("@/lib/validation/schemas");
    const result = explicitFeedbackSchema.safeParse({
      sessionId: "s1",
      answerType: "tell_me_about_yourself",
      rating: 4,
      howWouldYouSayIt: MALICIOUS_INPUTS.oversizedInputs[0],
    });
    expect(result.success).toBe(false);
  });
});

// ── Route-level validation (400 responses) ──────────────────────────────

describe("Route-level validation returns 400 for bad input", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("generate-answer rejects invalid answerType with 400", async () => {
    mockAuthenticated("user-val-test");
    vi.doMock("@/lib/security/rate-limit", () => ({
      aiLimiter: null,
      checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, headers: {} }),
    }));
    vi.doMock("@/lib/security/audit", () => ({
      auditLog: vi.fn(),
    }));

    const { POST } = await import("@/app/api/generate-answer/route");
    const req = makeReq("http://localhost:3000/api/generate-answer", {
      sessionId: "00000000-0000-0000-0000-000000000000",
      answerType: "INVALID_TYPE",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
    assertSafeErrorResponse(body);
  });

  it("report rejects empty body with 400", async () => {
    mockAuthenticated("user-val-test");
    vi.doMock("@/lib/security/rate-limit", () => ({
      feedbackLimiter: null,
      checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, headers: {} }),
    }));

    const { POST } = await import("@/app/api/report/route");
    const req = makeReq("http://localhost:3000/api/report", {});

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("feedback/explicit rejects missing rating with 400", async () => {
    mockAuthenticated("user-val-test");
    vi.doMock("@/lib/security/rate-limit", () => ({
      feedbackLimiter: null,
      checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, headers: {} }),
    }));

    const { POST } = await import("@/app/api/feedback/explicit/route");
    const req = makeReq("http://localhost:3000/api/feedback/explicit", {
      sessionId: "s1",
      answerType: "tell_me_about_yourself",
      // missing 'rating' — required field
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("answer-feedback rejects invalid feedbackType with 400", async () => {
    mockAuthenticated("user-val-test");
    vi.doMock("@/lib/security/rate-limit", () => ({
      feedbackLimiter: null,
      checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, headers: {} }),
    }));

    const { POST } = await import("@/app/api/answer-feedback/route");
    const req = makeReq("http://localhost:3000/api/answer-feedback", {
      sessionId: "s1",
      answerType: "tell_me_about_yourself",
      feedbackType: "super_like", // invalid enum
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("400 error responses do not leak validation internals", async () => {
    mockAuthenticated("user-val-test");
    vi.doMock("@/lib/security/rate-limit", () => ({
      feedbackLimiter: null,
      checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, headers: {} }),
    }));

    const { POST } = await import("@/app/api/report/route");
    const req = makeReq("http://localhost:3000/api/report", {
      companyName: 12345, // wrong type
      roleTitle: true,
      stage: null,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    assertSafeErrorResponse(body);
  });
});

// ── Prompt injection payloads don't break validation ────────────────────

describe("Prompt injection payloads in input fields", () => {
  it("prompt injection payloads are accepted as strings by Zod (handled at AI layer)", async () => {
    const { reportSchema } = await import("@/lib/validation/schemas");

    for (const payload of MALICIOUS_INPUTS.promptInjection) {
      const result = reportSchema.safeParse({
        companyName: payload.slice(0, 200),
        roleTitle: "SDR",
        stage: "recruiter",
        overallNotes: payload,
      });
      // Prompt injection payloads are just strings — Zod won't reject them
      // They're handled at the AI prompt layer, not input validation
      if (result.success) {
        expect(typeof result.data.companyName).toBe("string");
      }
    }
  });
});

// ── Special characters and path traversal ───────────────────────────────

describe("Special characters and path traversal", () => {
  it("path traversal payloads in UUID fields are rejected", async () => {
    const { GenerateAnswerInputSchema } = await import("@/lib/types/schemas");

    for (const payload of MALICIOUS_INPUTS.pathTraversal) {
      const result = GenerateAnswerInputSchema.safeParse({
        sessionId: payload,
        answerType: "tell_me_about_yourself",
      });
      expect(result.success).toBe(false);
    }
  });

  it("null bytes in string fields are handled", async () => {
    const { reportSchema } = await import("@/lib/validation/schemas");
    const result = reportSchema.safeParse({
      companyName: "Test\x00Corp",
      roleTitle: "SDR",
      stage: "recruiter",
    });
    // Zod accepts the string (null bytes are valid in JS strings)
    // The DB layer handles null byte stripping
    expect(result.success).toBe(true);
  });
});
