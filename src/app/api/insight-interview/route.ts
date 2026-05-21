import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { apiLimiter, checkRateLimit, buildRateLimitResponse } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin-config";
import type {
  CapturedInsight,
  InsightInterviewStatus,
  InterrogationLine,
  PositioningType,
} from "@/types";

/**
 * GET /api/insight-interview?session_id=<uuid>
 *
 * Returns the interrogation_lines for the session (from its
 * positioning_brief's competitive_dynamic) plus any captured_insights
 * already saved, so the surface can render and resume.
 *
 * When the session is a switcher / early-career type, or for any reason
 * has no competitive_dynamic, interrogation_lines is empty — the UI uses
 * that signal to auto-skip per spec §8.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = await checkRateLimit(apiLimiter, auth.userId);
    if (!rl.allowed) return buildRateLimitResponse("insight-interview", rl);

    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    const db = createAdminClient();

    // Verify session ownership (or admin override).
    const { data: sessionRow, error: sessionErr } = await db
      .from("prep_sessions")
      .select("id, user_id, insight_interview_status")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionErr || !sessionRow) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (sessionRow.user_id !== auth.userId && !ADMIN_EMAILS.includes(auth.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load positioning_brief → competitive_dynamic → interrogation_lines.
    const { data: brief } = await db
      .from("positioning_briefs")
      .select("positioning_type, competitive_dynamic_id")
      .eq("session_id", sessionId)
      .maybeSingle();

    let interrogation_lines: InterrogationLine[] = [];
    const positioning_type: PositioningType | null =
      (brief?.positioning_type as PositioningType | undefined) ?? null;

    if (brief?.competitive_dynamic_id) {
      const { data: dyn } = await db
        .from("competitive_dynamics")
        .select("interrogation_lines")
        .eq("id", brief.competitive_dynamic_id)
        .maybeSingle();
      const raw = (dyn?.interrogation_lines ?? []) as InterrogationLine[];
      interrogation_lines = Array.isArray(raw) ? raw : [];
    }

    // Load any existing captured_insights for this session.
    const { data: capturedRows } = await db
      .from("captured_insights")
      .select("*")
      .eq("session_id", sessionId)
      .order("interrogation_line_index", { ascending: true });

    const captured_insights = (capturedRows ?? []) as CapturedInsight[];

    return NextResponse.json({
      interrogation_lines,
      captured_insights,
      insight_interview_status: (sessionRow.insight_interview_status ?? "pending") as InsightInterviewStatus,
      positioning_type,
    });
  } catch (err) {
    console.error("[/api/insight-interview GET] error:", err);
    return NextResponse.json(
      { error: "Failed to load insight interview" },
      { status: 500 }
    );
  }
}
