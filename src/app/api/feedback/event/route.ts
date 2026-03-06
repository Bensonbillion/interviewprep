import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function adminDb() {
  return createAdminClient();
}

/**
 * POST /api/feedback/event
 * Log implicit page-level events (card expand/collapse, time-on-card, edit, regen sequences).
 * Fire-and-forget — never blocks the user.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      sessionId: string;
      answerType?: string;
      eventType: string;
      durationMs?: number;
      editDistance?: number;
      wordsChangedPct?: number;
      regenSequence?: number;
    };

    const { sessionId, answerType, eventType, durationMs, editDistance, wordsChangedPct, regenSequence } = body;

    if (!sessionId || !eventType) {
      return NextResponse.json({ ok: true });
    }

    const db = adminDb();
    await db.from("session_events").insert({
      session_id: sessionId,
      answer_type: answerType ?? null,
      event_type: eventType,
      duration_ms: durationMs ?? null,
      edit_distance: editDistance ?? null,
      words_changed_pct: wordsChangedPct ?? null,
      regen_sequence: regenSequence ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("Event log failed:", err);
    return NextResponse.json({ ok: true });
  }
}
