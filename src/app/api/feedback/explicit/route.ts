import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApiAuth } from "@/lib/auth/verify";
import { feedbackLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { explicitFeedbackSchema } from "@/lib/validation/schemas";
import { encrypt } from "@/lib/security/encryption";

function adminDb() {
  return createAdminClient();
}

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
    const parsed = explicitFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { sessionId, answerType, rating, ...rest } = parsed.data;

    const db = adminDb();
    await db.from("answer_explicit_feedback").insert({
      session_id: sessionId,
      answer_id: rest.answerId ?? null,
      answer_type: answerType,
      rating,
      sounds_natural: rest.soundsNatural ?? null,
      too_robotic: rest.tooRobotic ?? null,
      easy_to_say_out_loud: rest.easyToSayOutLoud ?? null,
      too_long: rest.tooLong ?? null,
      too_short: rest.tooShort ?? null,
      too_generic: rest.tooGeneric ?? null,
      missing_detail: rest.missingDetail ?? null,
      quick_tag: rest.quickTag ?? null,
      how_would_you_say_it: rest.howWouldYouSayIt ? encrypt(rest.howWouldYouSayIt) : null,
      what_would_improve: rest.whatWouldImprove ? encrypt(rest.whatWouldImprove) : null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("Explicit feedback insert failed:", err);
    return NextResponse.json({ ok: true });
  }
}
