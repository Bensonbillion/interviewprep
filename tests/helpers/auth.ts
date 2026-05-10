import { vi } from "vitest";
import type { Page } from "@playwright/test";

// ── Vitest auth mocking (for unit/integration tests) ─────────────────

/**
 * Mock authenticated user for API route tests.
 * Patches verifyApiAuth to return a specific user.
 */
export function mockAuthenticated(userId?: string, email?: string) {
  const user = {
    userId: userId ?? "test-user-id-000",
    email: email ?? "test@example.com",
  };

  vi.doMock("@/lib/auth/verify", () => ({
    verifyApiAuth: vi.fn().mockResolvedValue(user),
  }));

  return user;
}

/**
 * Mock unauthenticated state for API route tests.
 */
export function mockUnauthenticated() {
  vi.doMock("@/lib/auth/verify", () => ({
    verifyApiAuth: vi.fn().mockResolvedValue(null),
  }));
}

/**
 * Mock admin user for admin route tests.
 */
export function mockAdmin(email = "benson@salesprep.ai") {
  return mockAuthenticated("admin-user-id", email);
}

/**
 * Mock rate limiting — always allowed.
 */
export function mockRateLimitAllowed() {
  vi.doMock("@/lib/security/rate-limit", () => ({
    aiLimiter: null,
    feedbackLimiter: null,
    authLimiter: null,
    apiLimiter: null,
    checkRateLimit: vi.fn().mockResolvedValue({
      allowed: true,
      headers: {},
    }),
  }));
}

/**
 * Mock rate limiting — blocked.
 */
export function mockRateLimitBlocked() {
  vi.doMock("@/lib/security/rate-limit", () => {
    const reset = Date.now() + 60000;
    const headers = {
      "X-RateLimit-Limit": "10",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(reset),
    };
    return {
      aiLimiter: null,
      feedbackLimiter: null,
      authLimiter: null,
      apiLimiter: null,
      checkRateLimit: vi.fn().mockResolvedValue({ allowed: false, headers, reset }),
      // Match the real buildRateLimitResponse contract — see
      // src/lib/security/rate-limit.ts. Routes call this directly now.
      buildRateLimitResponse: vi.fn((routeName: string, rl: { headers: Record<string, string>; reset?: number }) => {
        const retryAfterSec = rl.reset
          ? Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))
          : 60;
        const minutes = Math.ceil(retryAfterSec / 60);
        return new Response(
          JSON.stringify({
            error: "rate_limit_exceeded",
            message: `You've hit the limit for ${routeName}. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
            retry_after_seconds: retryAfterSec,
          }),
          {
            status: 429,
            headers: {
              ...rl.headers,
              "Content-Type": "application/json",
              "Retry-After": String(retryAfterSec),
            },
          }
        );
      }),
      getRateLimitKey: vi.fn(),
    };
  });
}

/**
 * Extract JSON body from a NextResponse.
 */
export async function parseResponse(response: Response) {
  const json = await response.json();
  return {
    status: response.status,
    body: json,
    headers: Object.fromEntries(response.headers.entries()),
  };
}

// ── Playwright auth helpers (for E2E tests) ──────────────────────────

/**
 * Log in as test user in Playwright by setting Supabase auth cookies.
 * Requires TEST_USER_ACCESS_TOKEN and TEST_USER_REFRESH_TOKEN env vars.
 */
export async function loginAsTestUser(page: Page) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];

  const accessToken = process.env.TEST_USER_ACCESS_TOKEN;
  const refreshToken = process.env.TEST_USER_REFRESH_TOKEN;

  if (!accessToken || !refreshToken) {
    throw new Error(
      "TEST_USER_ACCESS_TOKEN and TEST_USER_REFRESH_TOKEN must be set for E2E tests"
    );
  }

  await page.goto("/");

  await page.evaluate(
    ({ ref, access, refresh }) => {
      const storageKey = `sb-${ref}-auth-token`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          access_token: access,
          refresh_token: refresh,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        })
      );
    },
    { ref: projectRef, access: accessToken, refresh: refreshToken }
  );

  await page.reload();
}

/**
 * Ensure user is logged out in Playwright.
 */
export async function logoutTestUser(page: Page) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];

  await page.evaluate((ref) => {
    localStorage.removeItem(`sb-${ref}-auth-token`);
  }, projectRef);

  await page.reload();
}
