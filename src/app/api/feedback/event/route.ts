import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApiAuth } from "@/lib/auth/verify";
import { eventFeedbackSchema } from "@/lib/validation/schemas";

function adminDb() {
  return createAdminClient();
}

/**
 * POST /api/feedback/event
 * Log implicit page-level events (card expand/collapse, time-on-card, edit, regen sequences).
 * Fire-and-forget — never blocks the user.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = eventFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: true });
    }

    const { sessionId, answerType, eventType, durationMs, editDistance, wordsChangedPct, regenSequence } = parsed.data;

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
