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
    const sd = sessionData as Record<string, unknown>;
    const { error } = await supabase
      .from("prep_sessions")
      .upsert(
        {
          id: sessionId,
          user_id: auth.userId,
          session_data: sessionData,
          job_description: (sd.jobDescription as string) ?? "",
          target_role: (sd.targetRole as string) ?? "",
          role_type: (sd.roleType as string) ?? "sdr_bdr",
          stage: (sd.stage as string) ?? "recruiter",
          relevance_map: sd.relevanceMap ?? {},
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
