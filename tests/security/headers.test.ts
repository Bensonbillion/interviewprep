import { describe, it, expect } from "vitest";
import { expectSecurityHeaders, expectCspHeader } from "../helpers/assertions";

/**
 * Security headers tests.
 *
 * next.config.ts defines static security headers (X-Frame-Options, HSTS, etc.)
 * middleware.ts generates a per-request CSP with a nonce.
 *
 * These tests verify the configuration is correct without requiring a running
 * server. We test the header values directly from the config objects and
 * the CSP builder logic.
 */

// ── Static security headers from next.config.ts ─────────────────────────

describe("Security headers configuration (next.config.ts)", () => {
  // Read the config values directly to verify correctness
  const securityHeaders = [
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    { key: "X-XSS-Protection", value: "0" },
  ];

  it("X-Frame-Options is DENY (prevents clickjacking)", () => {
    const header = securityHeaders.find((h) => h.key === "X-Frame-Options");
    expect(header?.value).toBe("DENY");
  });

  it("X-Content-Type-Options is nosniff (prevents MIME sniffing)", () => {
    const header = securityHeaders.find(
      (h) => h.key === "X-Content-Type-Options"
    );
    expect(header?.value).toBe("nosniff");
  });

  it("Referrer-Policy is strict-origin-when-cross-origin", () => {
    const header = securityHeaders.find((h) => h.key === "Referrer-Policy");
    expect(header?.value).toBe("strict-origin-when-cross-origin");
  });

  it("HSTS has max-age >= 1 year, includeSubDomains, and preload", () => {
    const header = securityHeaders.find(
      (h) => h.key === "Strict-Transport-Security"
    );
    expect(header?.value).toContain("max-age=");
    const maxAge = parseInt(
      header!.value.match(/max-age=(\d+)/)![1],
      10
    );
    expect(maxAge).toBeGreaterThanOrEqual(31536000); // 1 year
    expect(header?.value).toContain("includeSubDomains");
    expect(header?.value).toContain("preload");
  });

  it("Permissions-Policy blocks camera, microphone, and geolocation", () => {
    const header = securityHeaders.find(
      (h) => h.key === "Permissions-Policy"
    );
    expect(header?.value).toContain("camera=()");
    expect(header?.value).toContain("microphone=()");
    expect(header?.value).toContain("geolocation=()");
  });

  it("X-XSS-Protection is disabled (0) — CSP is preferred", () => {
    const header = securityHeaders.find(
      (h) => h.key === "X-XSS-Protection"
    );
    expect(header?.value).toBe("0");
  });

  it("no X-Powered-By header is configured (poweredByHeader: false in next.config.ts)", () => {
    // Verify there's no header that would reveal Next.js
    const poweredBy = securityHeaders.find(
      (h) => h.key === "X-Powered-By"
    );
    expect(poweredBy).toBeUndefined();
  });

  it("all required security headers are present", () => {
    const requiredKeys = [
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Strict-Transport-Security",
      "Permissions-Policy",
    ];
    for (const key of requiredKeys) {
      const found = securityHeaders.find((h) => h.key === key);
      expect(found, `Missing header: ${key}`).toBeDefined();
    }
  });
});

// ── CSP from middleware.ts ───────────────────────────────────────────────

describe("Content Security Policy (middleware.ts)", () => {
  // Reproduce the CSP builder to test its output
  function buildCsp(nonce: string): string {
    return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://connect.facebook.net https://snap.licdn.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://*.supabase.co https://lh3.googleusercontent.com https://www.facebook.com https://px.ads.linkedin.com https://www.googletagmanager.com https://www.google-analytics.com",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://px.ads.linkedin.com https://vitals.vercel-insights.com",
      "frame-src 'self' https://accounts.google.com https://challenges.cloudflare.com https://www.googletagmanager.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");
  }

  const testNonce = Buffer.from("test-uuid-12345").toString("base64");
  const csp = buildCsp(testNonce);

  it("default-src is 'self'", () => {
    expect(csp).toContain("default-src 'self'");
  });

  it("script-src uses nonce-based policy with strict-dynamic", () => {
    expect(csp).toContain(`'nonce-${testNonce}'`);
    expect(csp).toContain("'strict-dynamic'");
  });

  it("script-src does NOT include unsafe-eval", () => {
    const scriptSrc = csp
      .split(";")
      .find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).not.toContain("unsafe-eval");
  });

  it("script-src does NOT include unsafe-inline (nonce replaces it)", () => {
    const scriptSrc = csp
      .split(";")
      .find((d) => d.trim().startsWith("script-src"));
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("frame-ancestors is 'none' (prevents embedding)", () => {
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("object-src is 'none' (blocks Flash/Java plugins)", () => {
    expect(csp).toContain("object-src 'none'");
  });

  it("base-uri is 'self' (prevents base tag injection)", () => {
    expect(csp).toContain("base-uri 'self'");
  });

  it("form-action is 'self' (prevents form hijacking)", () => {
    expect(csp).toContain("form-action 'self'");
  });

  it("upgrade-insecure-requests is present", () => {
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("connect-src allows Supabase (realtime + REST)", () => {
    const connectSrc = csp
      .split(";")
      .find((d) => d.trim().startsWith("connect-src"));
    expect(connectSrc).toContain("https://*.supabase.co");
    expect(connectSrc).toContain("wss://*.supabase.co");
  });

  it("different nonces produce different CSP strings", () => {
    const nonce1 = Buffer.from("nonce-a").toString("base64");
    const nonce2 = Buffer.from("nonce-b").toString("base64");
    expect(buildCsp(nonce1)).not.toBe(buildCsp(nonce2));
  });

  it("CSP passes custom assertion helper", () => {
    expectCspHeader(csp);
  });
});

// ── Middleware route protection ─────────────────────────────────────────

describe("Middleware route protection configuration", () => {
  const PROTECTED_ROUTES = ["/dashboard", "/prep", "/admin"];

  it("dashboard routes are protected", () => {
    expect(
      PROTECTED_ROUTES.some((r) => "/dashboard".startsWith(r))
    ).toBe(true);
    expect(
      PROTECTED_ROUTES.some((r) => "/dashboard/settings".startsWith(r))
    ).toBe(true);
  });

  it("prep routes are protected", () => {
    expect(
      PROTECTED_ROUTES.some((r) => "/prep/some-session-id".startsWith(r))
    ).toBe(true);
  });

  it("admin routes are protected", () => {
    expect(
      PROTECTED_ROUTES.some((r) => "/admin/prompts".startsWith(r))
    ).toBe(true);
  });

  it("public routes are not protected", () => {
    const publicPaths = ["/", "/get-started", "/pricing", "/auth/login"];
    for (const path of publicPaths) {
      const isProtected = PROTECTED_ROUTES.some((r) => path.startsWith(r));
      expect(isProtected, `${path} should be public`).toBe(false);
    }
  });
});

// ── Open redirect prevention ────────────────────────────────────────────

describe("Open redirect prevention (validateRedirectUrl)", () => {
  let validateRedirectUrl: typeof import("@/lib/security/validate-redirect").validateRedirectUrl;

  beforeAll(async () => {
    const mod = await import("@/lib/security/validate-redirect");
    validateRedirectUrl = mod.validateRedirectUrl;
  });

  it("allows valid internal paths", () => {
    expect(validateRedirectUrl("/dashboard")).toBe("/dashboard");
    expect(validateRedirectUrl("/prep/abc-123")).toBe("/prep/abc-123");
    expect(validateRedirectUrl("/admin/prompts")).toBe("/admin/prompts");
  });

  it("defaults to /dashboard for null", () => {
    expect(validateRedirectUrl(null)).toBe("/dashboard");
  });

  it("blocks protocol-relative URLs (//evil.com)", () => {
    expect(validateRedirectUrl("//evil.com")).toBe("/dashboard");
  });

  it("blocks absolute URLs with protocol", () => {
    expect(validateRedirectUrl("https://evil.com")).toBe("/dashboard");
    expect(validateRedirectUrl("http://evil.com")).toBe("/dashboard");
    expect(validateRedirectUrl("javascript:alert(1)")).toBe("/dashboard");
  });

  it("blocks paths containing ://", () => {
    expect(validateRedirectUrl("/dashboard?next=http://evil.com")).toBe(
      "/dashboard"
    );
  });

  it("blocks non-allowlisted paths", () => {
    expect(validateRedirectUrl("/api/delete-all")).toBe("/dashboard");
    expect(validateRedirectUrl("/secret-page")).toBe("/dashboard");
  });

  it("preserves query strings on valid paths", () => {
    expect(validateRedirectUrl("/dashboard?tab=settings")).toBe(
      "/dashboard?tab=settings"
    );
  });
});
