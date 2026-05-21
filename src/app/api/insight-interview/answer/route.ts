import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { aiLimiter, checkRateLimit, buildRateLimitResponse } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin-config";
import { InsightAnswerInputSchema } from "@/lib/types/schemas";
import { evaluateInsightAnswer } from "@/lib/insight/evaluate";
import type { CapturedInsight, InterrogationLine } from "@/types";

/**
 * POST /api/insight-interview/answer
 *
 * Called when the candidate finishes one answer. Evaluates the answer
 * against the interrogation line's star_slot_hint (the rubric the
 * engine wrote), persists raw_answer + evaluation, returns both.
 *
 * On a "substantive" answer: final_answer = raw_answer immediately;
 * the card moves to its quiet confirmed state.
 * On "thin": follow_up_question is set; the card surfaces the drill
 * offer; final_answer stays raw_answer until / unless the drill runs.
 * On "unanswered": no follow-up, final_answer null, card stays open.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = await checkRateLimit(aiLimiter, auth.userId);
    if (!rl.allowed) return buildRateLimitResponse("insight-interview", rl);

    const body = await req.json().catch(() => ({}));
    const parsed = InsightAnswerInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { session_id, interrogation_line_index, raw_answer } = parsed.data;

    const db = createAdminClient();

    // Verify session ownership.
    const { data: sessionRow } = await db
      .from("prep_sessions")
      .select("id, user_id, insight_interview_status")
      .eq("id", session_id)
      .maybeSingle();
    if (!sessionRow) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (sessionRow.user_id !== auth.userId && !ADMIN_EMAILS.includes(auth.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Resolve the interrogation_line at the given index via positioning_brief.
    const { data: brief } = await db
      .from("positioning_briefs")
      .select("competitive_dynamic_id")
      .eq("session_id", session_id)
      .maybeSingle();

    if (!brief?.competitive_dynamic_id) {
      return NextResponse.json(
        { error: "Session has no positioning brief — nothing to answer" },
        { status: 422 }
      );
    }

    const { data: dyn } = await db
      .from("competitive_dynamics")
      .select("interrogation_lines")
      .eq("id", brief.competitive_dynamic_id)
      .maybeSingle();

    const lines = (dyn?.interrogation_lines ?? []) as InterrogationLine[];
    const line = lines[interrogation_line_index];
    if (!line) {
      return NextResponse.json(
        { error: `interrogation_line_index ${interrogation_line_index} out of range (have ${lines.length})` },
        { status: 422 }
      );
    }

    // Run the evaluation.
    const evaluation = await evaluateInsightAnswer(raw_answer, line);

    const isSubstantive = evaluation.quality === "substantive";
    const finalAnswer = isSubstantive ? raw_answer : null;

    // Upsert the captured_insights row. On conflict (re-answering the
    // same line) we reset drilled_answer / follow_up_dismissed so the
    // new evaluation governs.
    const nowIso = new Date().toISOString();
    const { data: upsertRow, error: upsertErr } = await db
      .from("captured_insights")
      .upsert(
        {
          session_id,
          interrogation_line_index,
          interrogation_question: line.question,
          star_slot_hint: line.star_slot_hint,
          raw_answer,
          drilled_answer: null,
          final_answer: finalAnswer,
          answer_quality: evaluation.quality,
          star_coverage: evaluation.star_coverage,
          follow_up_question: evaluation.follow_up_question,
          follow_up_dismissed: false,
          updated_at: nowIso,
        },
        { onConflict: "session_id,interrogation_line_index" }
      )
      .select("*")
      .single();
    if (upsertErr || !upsertRow) {
      console.error("[insight-interview answer] upsert failed:", upsertErr?.message);
      return NextResponse.json({ error: "Failed to save answer" }, { status: 500 });
    }

    // Bump session status to 'in_progress' on first answer.
    if (sessionRow.insight_interview_status === "pending") {
      await db
        .from("prep_sessions")
        .update({ insight_interview_status: "in_progress" })
        .eq("id", session_id);
    }

    const captured_insight = upsertRow as CapturedInsight;
    return NextResponse.json({ evaluation, captured_insight });
  } catch (err) {
    console.error("[/api/insight-interview/answer] error:", err);
    return NextResponse.json(
      { error: "Failed to evaluate answer" },
      { status: 500 }
    );
  }
}
