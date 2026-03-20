import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrepSessionView } from "./PrepSessionView";
import type { PrepSession, AnswerSlot } from "@/types";

/**
 * Server Component wrapper for the prep page.
 * - Verifies auth via getUser() (cookie-based client)
 * - Loads session_data from prep_sessions (admin client — bypasses nullable user_id type issue)
 * - Merges generated_answers into answerSlots
 * - Passes hydrated PrepSession to the client component
 */
export default async function PrepPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // Auth check with cookie-based client
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirectTo=/prep/${sessionId}`);
  }

  // Use admin client for data queries (avoids Supabase TS inference issues
  // with nullable user_id column). Auth is already verified above.
  const db = createAdminClient();

  const { data: row } = await db
    .from("prep_sessions")
    .select("session_data")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!row?.session_data) {
    notFound();
  }

  const session = row.session_data as PrepSession;

  // Load generated answers and merge into slots
  const { data: answers } = await db
    .from("generated_answers")
    .select("id, answer_type, content, rating, status")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (answers && answers.length > 0 && Array.isArray(session.answerSlots)) {
    const answerMap = new Map(
      answers.map((a: { answer_type: string; id: string; content: string }) => [a.answer_type, a])
    );

    session.answerSlots = session.answerSlots.map((slot: AnswerSlot) => {
      const dbAnswer = answerMap.get(slot.type);
      if (dbAnswer && dbAnswer.content) {
        return {
          ...slot,
          content: dbAnswer.content,
          answerId: dbAnswer.id,
          status: slot.status === "loading" ? ("locked" as const) : slot.status,
        };
      }
      return slot;
    });
  }

  return <PrepSessionView initialSession={session} sessionId={sessionId} />;
}
