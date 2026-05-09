import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Tier 1: General API — 60 requests per minute per IP
export const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "60 s"),
      prefix: "rl:api",
      analytics: true,
    })
  : null;

// Tier 2: AI Generation — 10 requests per minute per user
// Most expensive operation (Claude API calls)
export const aiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "rl:ai",
      analytics: true,
    })
  : null;

// Tier 3: Auth endpoints — 5 attempts per 15 minutes per IP
export const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "900 s"),
      prefix: "rl:auth",
      analytics: true,
    })
  : null;

// Tier 4: Feedback/Report submission — 20 per hour per user
export const feedbackLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "3600 s"),
      prefix: "rl:feedback",
      analytics: true,
    })
  : null;

// Helper: check rate limit and return appropriate response.
// Fail-open: if Upstash is unreachable, allow the request rather than block
// every user during a Redis hiccup. Errors are logged loudly.
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ allowed: boolean; headers: Record<string, string>; reset?: number }> {
  if (!limiter) {
    return { allowed: true, headers: {} };
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    return {
      allowed: success,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      },
      reset,
    };
  } catch (err) {
    // Recurring failures need a human — log loudly.
    console.error("[rate-limit] Upstash error:", err);
    return { allowed: true, headers: {} };
  }
}

/**
 * Build a stable rate-limit identifier.
 * Authed: scope by user ID (one user across multiple devices = one bucket).
 * Anonymous: scope by client IP. Vercel sets `x-forwarded-for`; the first
 * value in the comma-separated chain is the real client.
 *
 * Use this anywhere a route needs to mix authed + unauthed traffic on the
 * same limiter. Routes that only ever see authed users can keep passing
 * `auth.userId` directly to checkRateLimit.
 */
export function getRateLimitKey(req: Request, userId?: string | null): string {
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() ?? realIp ?? "unknown";
  return `ip:${ip}`;
}

/**
 * Opt-in helper for routes that want a polished 429 response with a
 * route-specific message and a Retry-After header.
 *
 * Existing callers using `checkRateLimit().headers` directly continue to
 * work — this is purely additive. New routes can do:
 *
 *   const rl = await checkRateLimit(aiLimiter, key);
 *   if (!rl.allowed) return buildRateLimitResponse("answer generation", rl);
 */
export function buildRateLimitResponse(
  routeName: string,
  rl: { headers: Record<string, string>; reset?: number }
): Response {
  const retryAfterSec = rl.reset
    ? Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))
    : 60;
  const minutes = Math.ceil(retryAfterSec / 60);
  return new Response(
    JSON.stringify({
      error: "rate_limit_exceeded",
      message:
        `You've hit the limit for ${routeName}. ` +
        `Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
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
}
