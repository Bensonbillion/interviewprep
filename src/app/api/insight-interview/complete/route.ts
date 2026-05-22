import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { apiLimiter, checkRateLimit, buildRateLimitResponse } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin-config";
import { InsightCompleteInputSchema } from "@/lib/types/schemas";
import { buildNarrativeSpine } from "@/lib/spine/build";

/**
 * POST /api/insight-interview/complete
 *
 * Marks the Insight Interview stage done for this session. The actual
 * priority-answer pre-gen (the "reframed step 6" from Phase 0) is
 * triggered client-side after this call returns, because /api/generate-
 * answer needs the full session blob in its request body — easier to
 * pass from the client (which already has it loaded) than to load it
 * server-side here. Returns a `next` hint the client uses to decide
 * what to do next.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = await checkRateLimit(apiLimiter, auth.userId);
    if (!rl.allowed) return buildRateLimitResponse("insight-interview", rl);

    const body = await req.json().catch(() => ({}));
    const parsed = InsightCompleteInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { session_id, skipped } = parsed.data;

    const db = createAdminClient();

    const { data: sessionRow } = await db
      .from("prep_sessions")
      .select("id, user_id")
      .eq("id", session_id)
      .maybeSingle();
    if (!sessionRow) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (sessionRow.user_id !== auth.userId && !ADMIN_EMAILS.includes(auth.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const status = skipped ? "skipped" : "completed";
    const { error: updateErr } = await db
      .from("prep_sessions")
      .update({
        insight_interview_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session_id);
    if (updateErr) {
      console.error("[insight-interview complete] update failed:", updateErr.message);
      return NextResponse.json({ error: "Failed to mark complete" }, { status: 500 });
    }

    // ── Narrative Spine — build BEFORE returning. ────────────────────
    // The chain is: Positioning Engine → Insight Interview → Narrative
    // Spine → priority pre-gen. The spine must be in the DB before the
    // client's subsequent generate-answer call so the priority answer
    // isn't built spine-blind (same ordering mistake we caught with the
    // Insight Interview itself). Switcher / skipped sessions also get a
    // spine — buildNarrativeSpine handles the no-captured-insights case.
    //
    // Best-effort: buildNarrativeSpine has its own degrade-not-throw
    // path, but if even that fails (e.g. no session_data.resume in the
    // row) we log and continue. A missing spine downstream falls back
    // to today's spine-blind behavior.
    let spineBuilt = false;
    try {
      await buildNarrativeSpine(session_id);
      spineBuilt = true;
    } catch (err) {
      console.error("[insight-interview complete] spine build failed:", {
        sessionId: session_id,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json({
      status,
      spine_built: spineBuilt,
      // The client kicks priority pre-gen and navigates next; this field
      // is informational, not load-bearing.
      next: `/prep/${session_id}`,
    });
  } catch (err) {
    console.error("[/api/insight-interview/complete] error:", err);
    return NextResponse.json(
      { error: "Failed to complete insight interview" },
      { status: 500 }
    );
  }
}
