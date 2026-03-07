import { expect } from "vitest";

/**
 * Assert a response is a JSON error with a specific status code.
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
  expect(value).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
}

/**
 * Assert a string is NOT encrypted (doesn't start with v1:).
 */
export function expectNotEncrypted(value: string) {
  expect(value).not.toMatch(/^v1:/);
}

/**
 * Assert security headers are present on a response.
 */
export function expectSecurityHeaders(headers: Headers) {
  expect(headers.get("x-frame-options")).toBe("DENY");
  expect(headers.get("x-content-type-options")).toBe("nosniff");
  expect(headers.get("referrer-policy")).toBe(
    "strict-origin-when-cross-origin"
  );
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
