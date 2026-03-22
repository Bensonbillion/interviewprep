import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApiAuth } from "@/lib/auth/verify";
import { feedbackLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { voiceSampleSchema } from "@/lib/validation/schemas";
import { encrypt, decrypt } from "@/lib/security/encryption";

function adminDb() {
  return createAdminClient();
}

/**
 * GET /api/feedback/voice-sample?sessionId=xxx
 * Load existing voice samples for a session so the UI can show saved versions.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  try {
    const db = adminDb();
    const { data, error } = await db
      .from("answer_voice_samples")
      .select("answer_type, user_version, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Voice sample query failed:", error);
      return NextResponse.json({ samples: {} });
    }

    // Dedupe: keep only the latest per answer_type, decrypt user_version
    const samples: Record<string, string> = {};
    for (const row of data ?? []) {
      if (samples[row.answer_type]) continue; // already have newer
      try {
        samples[row.answer_type] = decrypt(row.user_version);
      } catch {
        samples[row.answer_type] = row.user_version; // fallback if not encrypted
      }
    }

    return NextResponse.json({ samples });
  } catch (err) {
    console.warn("Voice sample GET failed:", err);
    return NextResponse.json({ samples: {} });
  }
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
