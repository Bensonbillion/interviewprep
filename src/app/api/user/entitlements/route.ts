import { NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { apiLimiter, checkRateLimit, buildRateLimitResponse } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/user/entitlements
 *
 * Returns the caller's active entitlements (search_pass not yet expired,
 * full_interview and single_round with status='active'). Read-only; the
 * UI in Session 3+ uses this to render the Navbar chip ("Pass: 23d left")
 * and the kit-page coverage indicators.
 *
 * Service-role read so we can scope by user_id without depending on the
 * client's auth cookie roundtrip. RLS would also allow this, but going
 * through the admin client matches every other authenticated read in
 * this codebase.
 */
export async function GET() {
  const auth = await verifyApiAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(apiLimiter, auth.userId);
  if (!rl.allowed) return buildRateLimitResponse("entitlements", rl);

  const db = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await db
    .from("entitlements")
    .select("id, type, company_scope, round_scope, expires_at, status, created_at")
    .eq("user_id", auth.userId)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[/api/user/entitlements] read failed:", error.message);
    return NextResponse.json({ entitlements: [] }, { status: 200 });
  }

  return NextResponse.json({ entitlements: data ?? [] });
}
