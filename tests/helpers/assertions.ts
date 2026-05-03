import { expect } from "vitest";

/**
 * Assert a response is a JSON error with a specific status code.
 * Optionally check that the error message contains a substring.
 */
export async function expectErrorResponse(
  response: Response,
  status: number,
  messageContains?: string
) {
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(body.error).toBeDefined();
  if (messageContains) {
    expect(body.error.toLowerCase()).toContain(messageContains.toLowerCase());
  }
  return body;
}

/**
 * Assert a response is a successful JSON response.
 */
export async function expectSuccessResponse(response: Response) {
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.error).toBeUndefined();
  return body;
}

/**
 * Assert a string looks like encrypted data (v1:iv:tag:data format).
 */
export function expectEncrypted(value: string) {
  expect(value).toMatch(
    /^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/
  );
}

/**
 * Assert a string is NOT encrypted (doesn't start with v1:).
 */
export function expectNotEncrypted(value: string) {
  expect(value).not.toMatch(/^v1:/);
}

// ── Security assertions ──────────────────────────────────────────────

/**
 * Assert security headers are present on a response.
 */
export function expectSecurityHeaders(headers: Headers) {
  expect(headers.get("x-frame-options")).toBe("DENY");
  expect(headers.get("x-content-type-options")).toBe("nosniff");
  expect(headers.get("referrer-policy")).toBe(
    "strict-origin-when-cross-origin"
  );
  expect(headers.get("strict-transport-security")).toBeTruthy();
  expect(headers.get("content-security-policy")).toBeTruthy();
  expect(headers.get("x-powered-by")).toBeNull();
}

/**
 * Assert CSP header contains required directives.
 */
export function expectCspHeader(csp: string) {
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("base-uri 'self'");
}

/**
 * Assert an error response doesn't leak sensitive implementation details.
 * Error messages should never contain stack traces, SQL, API keys, or file paths.
 */
export function assertSafeErrorResponse(body: { error?: string }) {
  const error = body.error ?? "";
  // No stack traces
  expect(error).not.toMatch(/at \w+\s+\(/);
  expect(error).not.toContain("node_modules");
  // No SQL
  expect(error.toLowerCase()).not.toMatch(/select\s+\*|insert\s+into|update\s+\w+\s+set/);
  // No API keys
  expect(error).not.toMatch(/sk-ant-/);
  expect(error).not.toMatch(/eyJ[A-Za-z0-9_-]+\./);
  // No internal file paths
  expect(error).not.toMatch(/\/Users\//);
  expect(error).not.toMatch(/\/src\//);
  // No database internals
  expect(error).not.toMatch(/supabase/i);
  expect(error).not.toContain("SUPABASE_SECRET_KEY");
}

/**
 * Assert a string does not contain PII.
 * Used for validating log output and error messages.
 */
export function assertNoPII(text: string) {
  // No email addresses
  expect(text).not.toMatch(/[\w.-]+@[\w.-]+\.\w+/);
  // No UUIDs (user IDs)
  expect(text).not.toMatch(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  // No API keys
  expect(text).not.toMatch(/sk-ant-/);
  // No JWTs
  expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}\./);
}

/**
 * Assert that XSS payloads are sanitized in output.
 * The output should not contain executable script content.
 */
export function assertNoXSS(text: string) {
  expect(text).not.toMatch(/<script[\s>]/i);
  expect(text).not.toMatch(/javascript:/i);
  expect(text).not.toMatch(/on\w+\s*=/i);
  expect(text).not.toMatch(/<iframe/i);
  expect(text).not.toMatch(/<svg[^>]*onload/i);
}

/**
 * Assert rate limit headers are present.
 */
export function expectRateLimitHeaders(headers: Headers | Record<string, string>) {
  const get = (key: string) =>
    headers instanceof Headers
      ? headers.get(key)
      : (headers as Record<string, string>)[key];
  expect(get("X-RateLimit-Limit") ?? get("x-ratelimit-limit")).toBeTruthy();
  expect(
    get("X-RateLimit-Remaining") ?? get("x-ratelimit-remaining")
  ).toBeDefined();
  expect(get("X-RateLimit-Reset") ?? get("x-ratelimit-reset")).toBeTruthy();
}
