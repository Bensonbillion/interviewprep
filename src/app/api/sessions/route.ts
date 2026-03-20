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
      .select("id, session_data, target_role, role_type, stage, created_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[sessions] Supabase query error:", error);
      return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
    }

    // Extract fields from session_data JSONB (company_name and interview_date
    // are not standalone columns — they live inside the session_data blob)
    const sessions = (data ?? []).map((row) => {
      const sd = row.session_data as Record<string, unknown> | null;
      return {
        id: row.id,
        companyName: (sd?.companyName as string) ?? "",
        targetRole: (sd?.targetRole as string) ?? row.target_role,
        roleType: (sd?.roleType as string) ?? row.role_type,
        stage: (sd?.stage as string) ?? row.stage,
        createdAt: new Date(row.created_at).getTime(),
        interviewDate: (sd?.interviewDate as string) ?? undefined,
      };
    });

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[sessions] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
