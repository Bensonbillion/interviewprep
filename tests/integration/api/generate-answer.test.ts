import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

// Configurable mock — tests can change this to simulate different AI responses
let mockCreateResponse: unknown = {
  content: [{ type: "text", text: "So right now I am a Commercial AE at Samsara where I run full cycle deals from cold call to close. I carry a $180K quarterly quota and close about six to eight deals a month. About 70% of my pipeline is self-sourced through outbound." }],
};
let mockCreateShouldReject = false;
let mockCreateRejectError: Error | null = null;

vi.mock("@/lib/ai", () => ({
  anthropic: {
    messages: {
      create: vi.fn().mockImplementation(() => {
        if (mockCreateShouldReject) {
          return Promise.reject(mockCreateRejectError);
        }
        return Promise.resolve(mockCreateResponse);
      }),
    },
  },
  SONNET: "claude-sonnet-4-6",
  HAIKU: "claude-haiku-4-5-20251001",
}));

vi.mock("@/lib/security/audit", () => ({
  auditLog: vi.fn(),
}));

vi.mock("@/lib/ai/prompts", () => ({
  buildPromptForAnswerType: vi.fn().mockReturnValue({
    system: "You are a sales interview coach.",
    user: "Generate a tell me about yourself answer.",
    maxTokens: 2048,
  }),
}));

vi.mock("@/lib/ai/rag-context", () => ({
  fetchRagContext: vi.fn().mockResolvedValue({
    activePromptText: null,
    activePromptVersionId: null,
    knowledgeChunkIds: [],
    goldenExampleIds: [],
  }),
  assembleSystemPrompt: vi.fn((_base: string) => "system prompt"),
  logAnswerVersion: vi.fn(),
}));

function makeReq(body: unknown): NextRequest {
  return new NextRequest(
    new URL("http://localhost:3000/api/generate-answer"),
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
  );
}

const validSession = {
  resume: { backgroundType: "direct_sales", roles: [], skills: [] },
  company: { name: "Salesforce" },
  targetRole: "SDR",
  jobDescription: "Looking for an SDR with SaaS experience",
  roleType: "sdr_bdr",
  stage: "recruiter",
};

const validBody = {
  sessionId: "00000000-0000-0000-0000-000000000000",
  answerType: "tell_me_about_yourself",
  session: validSession,
};

describe("POST /api/generate-answer", () => {
  beforeEach(() => {
    vi.resetModules();
    // Reset mock AI behavior to default success (must be 80+ chars to pass safety net)
    mockCreateResponse = {
      content: [{ type: "text", text: "So right now I am a Commercial AE at Samsara where I run full cycle deals from cold call to close. I carry a $180K quarterly quota and close about six to eight deals a month. About 70% of my pipeline is self-sourced through outbound." }],
    };
    mockCreateShouldReject = false;
    mockCreateRejectError = null;
  });

  // ── Successful generation ───────────────────────────────────────────

  it("returns generated answer for valid authenticated request", async () => {
    const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
    mockAuthenticated();
    mockRateLimitAllowed();

    const { POST } = await import("@/app/api/generate-answer/route");
    const res = await POST(makeReq(validBody));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.answerId).toBeDefined();
    expect(body.answerType).toBe("tell_me_about_yourself");
    expect(body.content).toBeDefined();
    expect(typeof body.content).toBe("string");
    expect(body.content.length).toBeGreaterThan(0);
    expect(body.model).toBeDefined();
  });

  it("uses HAIKU model for lighter answer types", async () => {
    const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
    mockAuthenticated();
    mockRateLimitAllowed();

    const { POST } = await import("@/app/api/generate-answer/route");
    const res = await POST(
      makeReq({ ...validBody, answerType: "cheat_sheet" })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.model).toBe("claude-haiku-4-5-20251001");
  });

  it("uses SONNET model for complex answer types", async () => {
    const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
    mockAuthenticated();
    mockRateLimitAllowed();

    const { POST } = await import("@/app/api/generate-answer/route");
    const res = await POST(
      makeReq({ ...validBody, answerType: "behavioral_star" })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.model).toBe("claude-sonnet-4-6");
  });

  // ── Authentication ──────────────────────────────────────────────────

  it("returns 401 without authentication", async () => {
    const { mockUnauthenticated } = await import("../../helpers/auth");
    mockUnauthenticated();

    const { POST } = await import("@/app/api/generate-answer/route");
    const res = await POST(makeReq(validBody));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.toLowerCase()).toContain("unauthorized");
  });

  // ── Input validation ────────────────────────────────────────────────

  it("returns 400 for invalid answerType", async () => {
    const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
    mockAuthenticated();
    mockRateLimitAllowed();

    const { POST } = await import("@/app/api/generate-answer/route");
    const res = await POST(
      makeReq({
        ...validBody,
        answerType: 'invalid"; DROP TABLE--',
      })
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 when session data is missing", async () => {
    const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
    mockAuthenticated();
    mockRateLimitAllowed();

    const { POST } = await import("@/app/api/generate-answer/route");
    const res = await POST(
      makeReq({
        sessionId: "00000000-0000-0000-0000-000000000000",
        answerType: "tell_me_about_yourself",
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Session data required");
  });

  // ── Rate limiting ───────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    const { mockAuthenticated, mockRateLimitBlocked } = await import("../../helpers/auth");
    mockAuthenticated();
    mockRateLimitBlocked();

    const { POST } = await import("@/app/api/generate-answer/route");
    const res = await POST(makeReq(validBody));

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.toLowerCase()).toContain("too many");
  });

  // ── Claude API error handling ───────────────────────────────────────

  it("handles Claude API error gracefully", async () => {
    const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
    mockAuthenticated();
    mockRateLimitAllowed();

    mockCreateShouldReject = true;
    mockCreateRejectError = new Error("API overloaded");

    const { POST } = await import("@/app/api/generate-answer/route");
    const res = await POST(makeReq(validBody));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error).not.toContain("API overloaded");
    // Error key is "generation_failed", user-facing message is in body.message
    expect(body.error === "generation_failed" || body.message?.includes("Please try again")).toBe(true);
  });

  it("returns generic error message on internal failure", async () => {
    const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
    mockAuthenticated();
    mockRateLimitAllowed();

    mockCreateShouldReject = true;
    mockCreateRejectError = new Error(
      "ANTHROPIC_INTERNAL: token bucket exhausted for org_abc123"
    );

    const { POST } = await import("@/app/api/generate-answer/route");
    const res = await POST(makeReq(validBody));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).not.toContain("ANTHROPIC_INTERNAL");
    expect(body.error).not.toContain("org_abc123");
    expect(body.error).not.toContain("token bucket");
  });

  // ── Custom instructions ─────────────────────────────────────────────

  it("accepts customInstructions in request", async () => {
    const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
    mockAuthenticated();
    mockRateLimitAllowed();

    const { POST } = await import("@/app/api/generate-answer/route");
    const res = await POST(
      makeReq({
        ...validBody,
        customInstructions: "Make it shorter and punchier",
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBeDefined();
  });

  it("rejects customInstructions over 500 chars", async () => {
    const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
    mockAuthenticated();
    mockRateLimitAllowed();

    const { POST } = await import("@/app/api/generate-answer/route");
    const res = await POST(
      makeReq({
        ...validBody,
        customInstructions: "A".repeat(501),
      })
    );

    expect(res.status).toBe(400);
  });

  // ── Strips markdown wrapping ────────────────────────────────────────

  it("strips markdown code block wrapping from response", async () => {
    const { mockAuthenticated, mockRateLimitAllowed } = await import("../../helpers/auth");
    mockAuthenticated();
    mockRateLimitAllowed();

    const longContent = "So right now I am a Commercial AE at Samsara where I run full cycle deals from cold call to close and carry a quarterly quota of 180K.";
    mockCreateResponse = {
      content: [{ type: "text", text: "```\n" + longContent + "\n```" }],
    };

    const { POST } = await import("@/app/api/generate-answer/route");
    const res = await POST(makeReq(validBody));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.content).not.toContain("```");
    expect(body.content).toContain("Commercial AE at Samsara");
  });
});
