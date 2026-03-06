import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function adminDb() {
  return createAdminClient();
}

/**
 * POST /api/answer-feedback
 * Log a thumbs-up, thumbs-down, or copy event to answer_feedback table.
 * Used by the Quality Dashboard for aggregation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      sessionId: string;
      answerType: string;
      feedbackType: "thumbs_up" | "thumbs_down" | "copy";
      issueCategory?: string | null;
    };

    const { sessionId, answerType, feedbackType, issueCategory } = body;

    if (!sessionId || !answerType || !feedbackType) {
      return NextResponse.json({ error: "sessionId, answerType, feedbackType required" }, { status: 400 });
    }

    const db = adminDb();
    await db.from("answer_feedback").insert({
      session_id: sessionId,
      answer_type: answerType,
      feedback_type: feedbackType,
      issue_category: issueCategory ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Non-fatal — never block the user
    console.warn("Answer feedback log failed:", err);
    return NextResponse.json({ ok: true });
  }
}
