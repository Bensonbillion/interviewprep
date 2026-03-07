import { vi } from "vitest";

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
