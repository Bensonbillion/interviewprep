import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApiAuth } from "@/lib/auth/verify";
import { feedbackLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { voiceSampleSchema } from "@/lib/validation/schemas";
import { encrypt } from "@/lib/security/encryption";

function adminDb() {
  return createAdminClient();
}

/**
 * POST /api/feedback/voice-sample
 * Capture the user's rewritten version of an AI answer — builds voice/style dataset.
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
    const parsed = voiceSampleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: true });
    }

    const { sessionId, answerType, aiContentSnapshot, userVersion, stage, roleType } = parsed.data;

    const db = adminDb();
    await db.from("answer_voice_samples").insert({
      session_id: sessionId,
      answer_type: answerType,
      ai_content_snapshot: encrypt(aiContentSnapshot),
      user_version: encrypt(userVersion.trim()),
      stage: stage ?? null,
      role_type: roleType ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("Voice sample log failed:", err);
    return NextResponse.json({ ok: true });
  }
}
