import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { validateRedirectUrl } from "@/lib/security/validate-redirect";

const PROTECTED_ROUTES = ["/dashboard", "/prep", "/admin"];

// Admin email allowlist — add more emails as needed
const ADMIN_EMAILS = [
  "benson@salesprep.ai",
  "paulhills566@gmail.com", // dev access
];

// ── CSP builder ──────────────────────────────────────────────────────────────

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

// ── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  // Generate a per-request CSP nonce
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  // Inject nonce + CSP into forwarded request headers so Next.js
  // can apply the nonce to its own inline scripts, and server
  // components can read it via headers().get('x-nonce').
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Re-create request headers with updated cookies + our custom headers
          const updatedHeaders = new Headers(request.headers);
          updatedHeaders.set("x-nonce", nonce);
          updatedHeaders.set("Content-Security-Policy", csp);
          supabaseResponse = NextResponse.next({
            request: { headers: updatedHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session (important — do not remove)
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("redirectTo", validateRedirectUrl(pathname));
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  // Admin routes: additional email allowlist check
  if (pathname.startsWith("/admin") && user) {
    if (!ADMIN_EMAILS.includes(user.email ?? "")) {
      const response = NextResponse.redirect(new URL("/dashboard", request.url));
      response.headers.set("Content-Security-Policy", csp);
      return response;
    }
  }

  supabaseResponse.headers.set("Content-Security-Policy", csp);
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
