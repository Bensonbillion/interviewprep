import { describe, it, expect, vi } from "vitest";
import {
  createMockSupabase,
  createAuthenticatedMockSupabase,
  createMockClaude,
  createMockClaudeError,
  createMockRateLimiter,
  mockFetch,
  createMockRequest,
  mockSupabaseQuery,
} from "../helpers/mocks";
import {
  createTestUser,
  createTestSession,
  createTestAnswer,
  createTestInterviewReport,
  createTestFeedback,
  createTestResume,
  createTestCompanyProfile,
  createUserPair,
  createTestUsers,
  MALICIOUS_INPUTS,
} from "../helpers/factories";
import {
  expectEncrypted,
  expectNotEncrypted,
  assertSafeErrorResponse,
  assertNoPII,
  assertNoXSS,
} from "../helpers/assertions";

describe("Mock Supabase client", () => {
  it("creates a chainable query builder", async () => {
    const db = createMockSupabase();
    expect(db.from).toBeDefined();
    expect(db.rpc).toBeDefined();
    expect(db.auth.getUser).toBeDefined();
  });

  it("returns null user by default", async () => {
    const db = createMockSupabase();
    const { data } = await db.auth.getUser();
    expect(data.user).toBeNull();
  });

  it("returns authenticated user when configured", async () => {
    const db = createAuthenticatedMockSupabase("user-123", "test@test.com");
    const { data } = await db.auth.getUser();
    expect(data.user.id).toBe("user-123");
    expect(data.user.email).toBe("test@test.com");
  });

  it("supports chained queries", () => {
    const db = createMockSupabase();
    const chain = db.from("users").select("*").eq("id", "123").single;
    expect(chain).toBeDefined();
  });

  it("supports configurable query results", async () => {
    const db = createMockSupabase();
    mockSupabaseQuery(db, { data: { id: "test-123", name: "Test" } });
    const result = await db.from("users").select("*").eq("id", "test-123").single();
    expect(result.data).toEqual({ id: "test-123", name: "Test" });
  });
});

describe("Mock Claude client", () => {
  it("returns text response", async () => {
    const claude = createMockClaude('{"answer": "test"}');
    const response = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [{ role: "user", content: "test" }],
    });
    expect(response.content[0].text).toBe('{"answer": "test"}');
  });

  it("can simulate errors", async () => {
    const claude = createMockClaudeError("API rate limited");
    await expect(
      claude.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 100,
        messages: [],
      })
    ).rejects.toThrow("API rate limited");
  });
});

describe("Mock rate limiter", () => {
  it("allows by default", async () => {
    const limiter = createMockRateLimiter();
    const result = await limiter.limit("test-id");
    expect(result.success).toBe(true);
  });

  it("blocks when configured", async () => {
    const limiter = createMockRateLimiter(false);
    const result = await limiter.limit("test-id");
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe("Mock fetch", () => {
  it("returns matched responses by URL substring", async () => {
    const fetcher = mockFetch({
      "firecrawl.dev": { data: { markdown: "# Test" } },
      "linkedin.com": "<html>profile</html>",
    });
    const res1 = await fetcher("https://api.firecrawl.dev/v1/scrape");
    expect(res1.ok).toBe(true);
    const json = await res1.json();
    expect(json.data.markdown).toBe("# Test");

    const res2 = await fetcher("https://unknown.com");
    expect(res2.ok).toBe(false);
  });
});

describe("Mock request", () => {
  it("creates GET requests", () => {
    const req = createMockRequest("GET");
    expect(req.method).toBe("GET");
  });

  it("creates POST requests with body", async () => {
    const req = createMockRequest("POST", { test: true });
    const body = await req.json();
    expect(body.test).toBe(true);
  });

  it("supports custom headers and IP", () => {
    const req = createMockRequest("GET", undefined, {
      ip: "192.168.1.1",
      headers: { Authorization: "Bearer test" },
    });
    expect(req.headers.get("x-forwarded-for")).toBe("192.168.1.1");
    expect(req.headers.get("Authorization")).toBe("Bearer test");
  });
});

describe("Test data factories", () => {
  it("creates users with unique IDs", () => {
    const user1 = createTestUser();
    const user2 = createTestUser();
    expect(user1.id).not.toBe(user2.id);
    expect(user1.email).toMatch(/@example\.com$/);
  });

  it("creates sessions linked to users", () => {
    const user = createTestUser();
    const session = createTestSession(user.id);
    expect(session.user_id).toBe(user.id);
    expect(session.company_name).toBe("Salesforce");
  });

  it("creates answers linked to sessions", () => {
    const answer = createTestAnswer("session-123");
    expect(answer.session_id).toBe("session-123");
    expect(answer.content).toBeTruthy();
  });

  it("creates interview reports", () => {
    const report = createTestInterviewReport("user-1", "session-1");
    expect(report.user_id).toBe("user-1");
    expect(report.difficulty_rating).toBe(3);
  });

  it("creates feedback with all fields", () => {
    const feedback = createTestFeedback("session-1");
    expect(feedback.how_would_you_say_it).toBeTruthy();
    expect(feedback.what_would_improve).toBeTruthy();
  });

  it("creates realistic resume data", () => {
    const resume = createTestResume();
    expect(resume.backgroundType).toBe("direct_sales");
    expect(resume.roles.length).toBeGreaterThan(0);
    expect(resume.skills.length).toBeGreaterThan(0);
  });

  it("creates company profiles", () => {
    const company = createTestCompanyProfile();
    expect(company.name).toBe("Salesforce");
    expect(company.icp.buyerPersonas.length).toBeGreaterThan(0);
  });

  it("creates user pairs for cross-access tests", () => {
    const { userA, userB } = createUserPair();
    expect(userA.id).not.toBe(userB.id);
    expect(userA.email).not.toBe(userB.email);
  });

  it("creates N users in bulk", () => {
    const users = createTestUsers(5);
    expect(users).toHaveLength(5);
    const ids = new Set(users.map((u) => u.id));
    expect(ids.size).toBe(5);
  });
});

describe("Malicious inputs collection", () => {
  it("contains XSS payloads", () => {
    expect(MALICIOUS_INPUTS.xss.length).toBeGreaterThan(5);
  });

  it("contains SQL injection payloads", () => {
    expect(MALICIOUS_INPUTS.sqlInjection.length).toBeGreaterThan(3);
  });

  it("contains prompt injection payloads", () => {
    expect(MALICIOUS_INPUTS.promptInjection.length).toBeGreaterThan(3);
  });

  it("contains oversized inputs", () => {
    expect(MALICIOUS_INPUTS.oversizedInputs[0].length).toBe(100_000);
  });

  it("contains path traversal payloads", () => {
    expect(MALICIOUS_INPUTS.pathTraversal.length).toBeGreaterThan(2);
  });
});

describe("Custom assertions", () => {
  it("expectEncrypted matches v1: format", () => {
    expectEncrypted("v1:aWQ=:dGFn:ZGF0YQ==");
    expect(() => expectEncrypted("plaintext")).toThrow();
  });

  it("expectNotEncrypted rejects v1: format", () => {
    expectNotEncrypted("plaintext");
    expect(() => expectNotEncrypted("v1:a:b:c")).toThrow();
  });

  it("assertSafeErrorResponse catches leaked details", () => {
    assertSafeErrorResponse({ error: "Something went wrong" });
    expect(() =>
      assertSafeErrorResponse({ error: "at Module._compile (/Users/dev/app.js:10)" })
    ).toThrow();
    expect(() =>
      assertSafeErrorResponse({ error: "sk-ant-api03-leaked" })
    ).toThrow();
  });

  it("assertNoPII catches emails and UUIDs", () => {
    assertNoPII("An error occurred");
    expect(() => assertNoPII("Error for user@example.com")).toThrow();
    expect(() =>
      assertNoPII("User 550e8400-e29b-41d4-a716-446655440000 failed")
    ).toThrow();
  });

  it("assertNoXSS catches script tags", () => {
    assertNoXSS("Hello world");
    expect(() => assertNoXSS('<script>alert(1)</script>')).toThrow();
    expect(() => assertNoXSS("javascript:alert(1)")).toThrow();
  });
});
