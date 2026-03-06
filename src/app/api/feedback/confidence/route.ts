import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  try {
    const body = await req.json() as {
      sessionId: string;
      stage: string;
      companyName?: string;
      score: number;
      blockerText?: string;
    };

    const { sessionId, stage, companyName, score, blockerText } = body;

    if (!sessionId || !stage || typeof score !== "number") {
      return NextResponse.json({ ok: true });
    }

    if (score < 1 || score > 5) {
      return NextResponse.json({ ok: true });
    }

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
