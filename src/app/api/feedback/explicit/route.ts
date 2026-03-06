import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function adminDb() {
  return createAdminClient();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sessionId: string;
      answerId?: string | null;
      answerType: string;
      rating: number;
      soundsNatural?: boolean;
      tooLong?: boolean;
      tooShort?: boolean;
      tooGeneric?: boolean;
      missingDetail?: boolean;
      howWouldYouSayIt?: string;
      whatWouldImprove?: string;
    };

    const { sessionId, answerType, rating } = body;
    if (!sessionId || !answerType || !rating) {
      return NextResponse.json({ error: "sessionId, answerType, rating required" }, { status: 400 });
    }

    const db = adminDb();
    await db.from("answer_explicit_feedback").insert({
      session_id: sessionId,
      answer_id: body.answerId ?? null,
      answer_type: answerType,
      rating,
      sounds_natural: body.soundsNatural ?? null,
      too_long: body.tooLong ?? null,
      too_short: body.tooShort ?? null,
      too_generic: body.tooGeneric ?? null,
      missing_detail: body.missingDetail ?? null,
      how_would_you_say_it: body.howWouldYouSayIt ?? null,
      what_would_improve: body.whatWouldImprove ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("Explicit feedback insert failed:", err);
    return NextResponse.json({ ok: true });
  }
}
