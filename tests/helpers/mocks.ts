import { vi } from "vitest";

/**
 * Mock Supabase client — returns chainable query builder.
 * Usage: const db = createMockSupabase({ data: [...], error: null });
 */
export function createMockSupabase(response: {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
} = {}) {
  const { data = null, error = null, count = null } = response;

  const result = { data, error, count };

  const chainable: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "gt", "gte", "lt", "lte",
    "like", "ilike", "is", "in",
    "order", "limit", "range", "single", "maybeSingle",
    "textSearch", "filter", "not", "or", "contains",
    "match", "csv",
  ];

  for (const method of methods) {
    chainable[method] = vi.fn().mockReturnValue(chainable);
  }

  // Terminal methods resolve to the result
  chainable.single = vi.fn().mockResolvedValue(result);
  chainable.maybeSingle = vi.fn().mockResolvedValue(result);
  chainable.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));

  // Make the base chainable thenable so await db.from(...).select(...) works
  const from = vi.fn().mockReturnValue(chainable);
  const rpc = vi.fn().mockResolvedValue(result);

  return {
    from,
    rpc,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
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
  };
}

/**
 * Mock Anthropic Claude client.
 * Usage: const claude = createMockClaude('{"key": "value"}');
 */
export function createMockClaude(responseText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: responseText }],
        model: "claude-sonnet-4-20250514",
        usage: { input_tokens: 100, output_tokens: 200 },
      }),
    },
  };
}

/**
 * Mock Upstash Redis rate limiter.
 * Usage: const limiter = createMockRateLimiter(true);
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
 * Mock Next.js request/response for API route testing.
 */
export function createMockRequest(
  method: string,
  body?: unknown,
  headers?: Record<string, string>
) {
  const url = "http://localhost:3000/api/test";
  const reqHeaders = new Headers(headers);
  if (body) reqHeaders.set("Content-Type", "application/json");

  return new Request(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}
