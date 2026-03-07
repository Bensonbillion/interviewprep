import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApiAuth } from "@/lib/auth/verify";
import { feedbackLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { confidenceFeedbackSchema } from "@/lib/validation/schemas";

function adminDb() {
  return createAdminClient();
}

/**
 * POST /api/feedback/confidence
 * Capture post-session confidence score (1–5) after all answers are ready.
 * Upserts on session_id — repeat views don't double-log.
 * Fire-and-forget — never blocks the user.
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
    const parsed = confidenceFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: true });
    }

    const { sessionId, stage, companyName, score, blockerText } = parsed.data;

    const db = adminDb();
    await db.from("session_confidence_scores").upsert(
      {
        session_id: sessionId,
        stage,
        company_name: companyName ?? null,
        score,
        blocker_text: blockerText ?? null,
      },
      { onConflict: "session_id" }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("Confidence score log failed:", err);
    return NextResponse.json({ ok: true });
  }
}
