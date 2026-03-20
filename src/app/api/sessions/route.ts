import { NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiLimiter, checkRateLimit } from "@/lib/security/rate-limit";

/**
 * GET /api/sessions
 * Returns lightweight session summaries for the authenticated user.
 * Used by the dashboard to list preps across devices.
 */
export async function GET() {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, headers: rlHeaders } = await checkRateLimit(apiLimiter, auth.userId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: rlHeaders }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("prep_sessions")
      .select("id, company_name, target_role, role_type, stage, created_at, interview_date")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[sessions] Supabase query error:", error);
      return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
    }

    // Map DB columns to SessionSummary shape expected by the client
    const sessions = (data ?? []).map((row) => ({
      id: row.id,
      companyName: row.company_name ?? "",
      targetRole: row.target_role,
      roleType: row.role_type,
      stage: row.stage,
      createdAt: new Date(row.created_at).getTime(),
      interviewDate: row.interview_date ?? undefined,
    }));

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[sessions] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
