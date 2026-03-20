import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiLimiter, checkRateLimit } from "@/lib/security/rate-limit";

/**
 * GET /api/session/[id]
 * Returns the full PrepSession from Supabase.
 * Merges any generated_answers rows back into answerSlots.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  const { allowed, headers: rlHeaders } = await checkRateLimit(apiLimiter, auth.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: rlHeaders }
    );
  }

  try {
    const supabase = createAdminClient();

    // Fetch session row
    const { data: row, error } = await supabase
      .from("prep_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", auth.userId)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // If we have the full session_data blob, use it directly
    if (!row.session_data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const session = row.session_data as Record<string, unknown>;

    // Fetch generated_answers for this session to merge latest content into slots
    const { data: answers } = await supabase
      .from("generated_answers")
      .select("id, answer_type, content, rating, status")
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    if (answers && answers.length > 0 && Array.isArray(session.answerSlots)) {
      const answerMap = new Map(
        answers.map((a) => [a.answer_type, a])
      );

      session.answerSlots = (session.answerSlots as Array<Record<string, unknown>>).map((slot) => {
        const dbAnswer = answerMap.get(slot.type as string);
        if (dbAnswer && dbAnswer.content) {
          return {
            ...slot,
            content: dbAnswer.content,
            answerId: dbAnswer.id,
            status: slot.status === "loading" ? "locked" : slot.status,
          };
        }
        return slot;
      });
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error("[session/[id]] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
