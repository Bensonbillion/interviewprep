import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiLimiter, checkRateLimit } from "@/lib/security/rate-limit";

/**
 * GET /api/session/[id]
 * Returns the full PrepSession from Supabase.
 * Merges any generated_answers rows back into answerSlots.
 * Includes interviewers and parent session info for defense flow.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  const { allowed, headers: rlHeaders } = await checkRateLimit(apiLimiter, auth.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: rlHeaders }
    );
  }

  try {
    const db = createAdminClient();

    // Fetch session + interviewers in parallel
    const [sessionResult, interviewersResult] = await Promise.all([
      db.from("prep_sessions")
        .select("*")
        .eq("id", id)
        .eq("user_id", auth.userId)
        .single(),
      db.from("session_interviewers")
        .select("*")
        .eq("session_id", id),
    ]);

    const { data: row, error } = sessionResult;

    if (error || !row) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!row.session_data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const session = row.session_data as Record<string, unknown>;

    // Fetch generated_answers for this session to merge latest content into slots
    const { data: answers } = await db
      .from("generated_answers")
      .select("id, answer_type, content, rating, status")
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    if (answers && answers.length > 0 && Array.isArray(session.answerSlots)) {
      const answerMap = new Map(
        answers.map((a) => [a.answer_type, a])
      );

      session.answerSlots = (session.answerSlots as Array<Record<string, unknown>>).map((slot) => {
        const dbAnswer = answerMap.get(slot.type as string);
        if (dbAnswer && dbAnswer.content) {
          return {
            ...slot,
            content: dbAnswer.content,
            answerId: dbAnswer.id,
            status: slot.status === "loading" ? "locked" : slot.status,
          };
        }
        return slot;
      });
    }

    // Add interviewers and parent info for defense flow
    const interviewers = (interviewersResult.data ?? []).map((iv) => ({
      name: iv.name,
      title: iv.title,
      company: iv.company,
      profile_data: iv.profile_data,
      researched_at: iv.researched_at,
    }));

    return NextResponse.json({
      session: {
        ...session,
        // Ensure these are accessible at the top level
        parent_session_id: row.parent_session_id ?? session.parentSessionId ?? null,
        stage_type: row.stage_type ?? session.stageType ?? null,
        stage_name: row.stage_name ?? session.stageName ?? null,
        company_name: session.companyName ?? null,
      },
      interviewers,
    });
  } catch (err) {
    console.error("[session/[id]] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
