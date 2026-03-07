import { vi } from "vitest";

/**
 * Mock Supabase client — returns chainable query builder.
 * All query methods are chainable and return controlled data.
 */
export function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const chainable: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "gt", "gte", "lt", "lte",
    "like", "ilike", "is", "in",
    "order", "limit", "range", "single", "maybeSingle",
    "textSearch", "filter", "not", "or", "contains",
    "match", "csv",
  ];

  const defaultResult = { data: null, error: null, count: null };

  for (const method of methods) {
    chainable[method] = vi.fn().mockReturnValue(chainable);
  }

  // Terminal methods resolve to the result
  chainable.single = vi.fn().mockResolvedValue(defaultResult);
  chainable.maybeSingle = vi.fn().mockResolvedValue(defaultResult);
  chainable.then = vi.fn((resolve: (v: unknown) => void) => resolve(defaultResult));

  const from = vi.fn().mockReturnValue(chainable);
  const rpc = vi.fn().mockResolvedValue(defaultResult);

  return {
    from,
    rpc,
    _chainable: chainable,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    storage: {
      from: vi.fn().mockReturnValue({
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
    ...overrides,
  };
}

/**
 * Mock authenticated Supabase client — getUser returns a valid user.
 */
export function createAuthenticatedMockSupabase(
  userId: string,
  email: string
) {
  const mock = createMockSupabase();
  mock.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: userId,
        email,
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: { full_name: "Test User" },
        aud: "authenticated",
        role: "authenticated",
      },
    },
    error: null,
  });
  return mock;
}

/**
 * Configure mock Supabase to return specific data for a table query.
 */
export function mockSupabaseQuery(
  mock: ReturnType<typeof createMockSupabase>,
  result: { data?: unknown; error?: { message: string } | null }
) {
  const chainable = mock._chainable;
  const resolvedResult = { data: result.data ?? null, error: result.error ?? null };
  chainable.single = vi.fn().mockResolvedValue(resolvedResult);
  chainable.maybeSingle = vi.fn().mockResolvedValue(resolvedResult);
  chainable.then = vi.fn((resolve: (v: unknown) => void) => resolve(resolvedResult));
  return mock;
}

/**
 * Mock Anthropic Claude API response.
 */
export function createMockClaudeResponse(content: string) {
  return {
    id: "msg_test_" + Math.random().toString(36).slice(2, 8),
    type: "message" as const,
    role: "assistant" as const,
    content: [{ type: "text" as const, text: content }],
    model: "claude-sonnet-4-20250514",
    stop_reason: "end_turn",
    usage: { input_tokens: 100, output_tokens: 200 },
  };
}

/**
 * Mock Anthropic Claude client with configurable responses.
 */
export function createMockClaude(responseText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue(createMockClaudeResponse(responseText)),
    },
  };
}

/**
 * Mock Claude client that fails.
 */
export function createMockClaudeError(errorMessage: string) {
  return {
    messages: {
      create: vi.fn().mockRejectedValue(new Error(errorMessage)),
    },
  };
}

/**
 * Mock Upstash Redis rate limiter.
 */
export function createMockRateLimiter(allowed = true) {
  return {
    limit: vi.fn().mockResolvedValue({
      success: allowed,
      limit: 60,
      remaining: allowed ? 59 : 0,
      reset: Date.now() + 60000,
    }),
  };
}

/**
 * Mock fetch for external API calls — matches URLs by substring.
 * Usage: globalThis.fetch = mockFetch({ "firecrawl.dev": { data: {...} } });
 */
export function mockFetch(
  responses: Record<string, unknown>,
  defaultStatus = 404
) {
  return vi.fn().mockImplementation((url: string | URL | Request) => {
    const urlString = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    const matchedKey = Object.keys(responses).find((key) =>
      urlString.includes(key)
    );
    if (matchedKey) {
      const body = responses[matchedKey];
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(body),
        text: () =>
          Promise.resolve(
            typeof body === "string" ? body : JSON.stringify(body)
          ),
        headers: new Headers({ "Content-Type": "application/json" }),
      });
    }
    return Promise.resolve({
      ok: false,
      status: defaultStatus,
      json: () => Promise.resolve({ error: "Not found" }),
      text: () => Promise.resolve("Not found"),
      headers: new Headers(),
    });
  });
}

/**
 * Mock Next.js request for API route testing.
 */
export function createMockRequest(
  method: string,
  body?: unknown,
  options?: {
    headers?: Record<string, string>;
    url?: string;
    ip?: string;
  }
) {
  const url = options?.url ?? "http://localhost:3000/api/test";
  const reqHeaders = new Headers(options?.headers);
  if (body) reqHeaders.set("Content-Type", "application/json");
  if (options?.ip) reqHeaders.set("x-forwarded-for", options.ip);

  return new Request(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}
