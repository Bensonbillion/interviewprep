import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { apiLimiter, checkRateLimit, buildRateLimitResponse } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin-config";
import { InsightDrillInputSchema } from "@/lib/types/schemas";
import { mergeDrilledAnswer } from "@/lib/insight/evaluate";
import type { CapturedInsight } from "@/types";

/**
 * POST /api/insight-interview/drill
 *
 * Called when the candidate answers the inline follow-up question. Merges
 * raw_answer + follow_up_answer into drilled_answer, sets final_answer,
 * marks the row substantive (spec §5: one drill, then move on — no
 * re-evaluation regardless of the second answer's quality; the offer was
 * made, the candidate's time is respected).
 *
 * No Claude call. Trivial join — kept cheap per the spec.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = await checkRateLimit(apiLimiter, auth.userId);
    if (!rl.allowed) return buildRateLimitResponse("insight-interview", rl);

    const body = await req.json().catch(() => ({}));
    const parsed = InsightDrillInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { session_id, interrogation_line_index, follow_up_answer } = parsed.data;

    const db = createAdminClient();

    // Verify session ownership.
    const { data: sessionRow } = await db
      .from("prep_sessions")
      .select("id, user_id")
      .eq("id", session_id)
      .maybeSingle();
    if (!sessionRow) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (sessionRow.user_id !== auth.userId && !ADMIN_EMAILS.includes(auth.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load the existing captured_insights row.
    const { data: existing } = await db
      .from("captured_insights")
      .select("*")
      .eq("session_id", session_id)
      .eq("interrogation_line_index", interrogation_line_index)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json(
        { error: "No prior answer to drill — call /answer first" },
        { status: 422 }
      );
    }

    const drilled = mergeDrilledAnswer(existing.raw_answer ?? "", follow_up_answer);

    const { data: updated, error: updateErr } = await db
      .from("captured_insights")
      .update({
        drilled_answer: drilled,
        final_answer: drilled,
        // Per §5: one drill, then move on. The drilled answer is treated
        // as substantive regardless of its own evaluation — the candidate
        // took the offer; the engine respects their time.
        answer_quality: "substantive",
        follow_up_dismissed: false,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", session_id)
      .eq("interrogation_line_index", interrogation_line_index)
      .select("*")
      .single();
    if (updateErr || !updated) {
      console.error("[insight-interview drill] update failed:", updateErr?.message);
      return NextResponse.json({ error: "Failed to save drilled answer" }, { status: 500 });
    }

    return NextResponse.json({ captured_insight: updated as CapturedInsight });
  } catch (err) {
    console.error("[/api/insight-interview/drill] error:", err);
    return NextResponse.json(
      { error: "Failed to merge drill answer" },
      { status: 500 }
    );
  }
}
