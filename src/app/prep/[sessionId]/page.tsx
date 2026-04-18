import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrepSessionView } from "./PrepSessionView";
import DefensePrepPage from "@/components/session/DefensePrepPage";
import type { PrepSession, AnswerSlot } from "@/types";

/**
 * Server Component wrapper for the prep page.
 * - Verifies auth via getUser() (cookie-based client)
 * - Detects stage_type to choose layout (defense vs standard)
 * - Loads session_data from prep_sessions if available
 * - Falls back to client-side sessionStorage for pre-migration sessions
 * - Merges generated_answers into answerSlots
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

  // Use admin client for data queries
  const db = createAdminClient();

  const { data: row } = await db
    .from("prep_sessions")
    .select("session_data, stage_type")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  // ─── Defense layout (presentation_defense) ──────────────────────────────
  const sessionData = row?.session_data as Record<string, unknown> | null;
  if (row?.stage_type === "presentation_defense" || sessionData?.stageType === "presentation_defense") {
    const session = (sessionData ?? {}) as unknown as PrepSession;

    // Fetch generated answers + interviewers in parallel
    const [answersResult, interviewersResult] = await Promise.all([
      db.from("generated_answers")
        .select("answer_type, content, metadata")
        .eq("session_id", sessionId)
        .eq("status", "completed"),
      db.from("session_interviewers")
        .select("name, title, profile_data")
        .eq("session_id", sessionId),
    ]);

    // Parse answers into kit sections
    const getContent = (type: string): unknown => {
      const answer = (answersResult.data ?? []).find((a) => a.answer_type === type);
      if (!answer) return null;
      try {
        return typeof answer.content === "string" ? JSON.parse(answer.content) : answer.content;
      } catch {
        return answer.content;
      }
    };

    const normalize = (val: unknown): unknown[] => {
      if (Array.isArray(val)) return val;
      if (val && typeof val === "object") {
        const obj = val as Record<string, unknown>;
        for (const key of ["items", "points", "questions", "weak_spots", "slides", "lines"]) {
          if (Array.isArray(obj[key])) return obj[key] as unknown[];
        }
      }
      return [];
    };

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const kit = {
      weakness_audit: normalize(getContent("weakness_audit")) as any[],
      hard_questions: normalize(getContent("defense_questions")) as any[],
      timing_guide: normalize(getContent("presentation_structure")) as any[],
      roleplay_script: (getContent("role_play_script") ?? {}) as any,
      cheat_sheet: (getContent("cheat_sheet") ?? {}) as any,
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const interviewers = (interviewersResult.data ?? []).map((i) => ({
      name: i.name ?? "",
      title: (i.title as string) ?? null,
      profile_data: (i.profile_data ?? null) as Record<string, unknown> | null,
    }));

    return (
      <DefensePrepPage
        session={session}
        sessionId={sessionId}
        interviewers={interviewers}
        kit={kit}
      />
    );
  }

  // ─── Standard layout (legacy + all other stage types) ───────────────────
  if (row?.session_data) {
    const session = row.session_data as PrepSession;

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

  // No DB data — let client component try sessionStorage
  return <PrepSessionView initialSession={null} sessionId={sessionId} />;
}
