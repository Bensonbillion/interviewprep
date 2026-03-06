import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function adminDb() {
  return createAdminClient();
}

/**
 * POST /api/feedback/voice-sample
 * Capture the user's rewritten version of an AI answer — builds voice/style dataset.
 * Fire-and-forget — never blocks the user.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      sessionId: string;
      answerType: string;
      aiContentSnapshot: string;
      userVersion: string;
      stage?: string;
      roleType?: string;
    };

    const { sessionId, answerType, aiContentSnapshot, userVersion, stage, roleType } = body;

    if (!sessionId || !answerType || !aiContentSnapshot || !userVersion) {
      return NextResponse.json({ ok: true });
    }

    // Minimum meaningful user version
    if (userVersion.trim().length < 10) {
      return NextResponse.json({ ok: true });
    }

    const db = adminDb();
    await db.from("answer_voice_samples").insert({
      session_id: sessionId,
      answer_type: answerType,
      ai_content_snapshot: aiContentSnapshot,
      user_version: userVersion.trim(),
      stage: stage ?? null,
      role_type: roleType ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("Voice sample log failed:", err);
    return NextResponse.json({ ok: true });
  }
}
