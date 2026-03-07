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

// Helper: check rate limit and return appropriate response
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  if (!limiter) {
    return { allowed: true, headers: {} };
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return {
    allowed: success,
    headers: {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
    },
  };
}
