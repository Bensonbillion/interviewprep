import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessionSaveSchema } from "@/lib/validation/schemas";
import { apiLimiter, checkRateLimit } from "@/lib/security/rate-limit";

/**
 * POST /api/session/save
 * Upserts a PrepSession blob into prep_sessions.
 * Called fire-and-forget from the client after session creation and on slot changes.
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const validation = sessionSaveSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { sessionId, sessionData, companyName, interviewDate } = validation.data;

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("prep_sessions")
      .upsert(
        {
          id: sessionId,
          user_id: auth.userId,
          session_data: sessionData,
          company_name: companyName ?? (sessionData as Record<string, unknown>).companyName ?? null,
          interview_date: interviewDate ?? null,
          job_description: (sessionData as Record<string, unknown>).jobDescription ?? "",
          target_role: (sessionData as Record<string, unknown>).targetRole ?? "",
          role_type: (sessionData as Record<string, unknown>).roleType ?? "sdr_bdr",
          stage: (sessionData as Record<string, unknown>).stage ?? "recruiter",
          relevance_map: (sessionData as Record<string, unknown>).relevanceMap ?? {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) {
      console.error("[session/save] Supabase upsert error:", error);
      return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[session/save] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
