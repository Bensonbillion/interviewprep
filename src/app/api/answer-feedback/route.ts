import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApiAuth } from "@/lib/auth/verify";
import { feedbackLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { answerFeedbackSchema } from "@/lib/validation/schemas";

function adminDb() {
  return createAdminClient();
}

/**
 * POST /api/answer-feedback
 * Log a thumbs-up, thumbs-down, or copy event to answer_feedback table.
 * Used by the Quality Dashboard for aggregation.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(feedbackLimiter, auth.userId);
  if (!allowed) {
    return NextResponse.json({ ok: true });
  }

  try {
    const body = await req.json();
    const parsed = answerFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { sessionId, answerType, feedbackType, issueCategory } = parsed.data;

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
