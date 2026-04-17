import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LiveInterviewMode from "@/components/live-mode/LiveInterviewMode";

/**
 * /prep/[sessionId]/live
 * Full-screen, phone-optimized live interview cheat sheet.
 * No header, no sidebar, no nav — just the cards.
 */
export default async function LiveModePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const db = createAdminClient();

  // Fetch generated answers + interviewers in parallel
  const [answersResult, interviewersResult] = await Promise.all([
    db.from("generated_answers")
      .select("answer_type, content, metadata")
      .eq("session_id", sessionId)
      .eq("status", "completed"),
    db.from("session_interviewers")
      .select("*")
      .eq("session_id", sessionId),
  ]);

  // Helper to extract parsed content by answer_type
  const getContent = (type: string): unknown => {
    const answer = (answersResult.data ?? []).find((a) => a.answer_type === type);
    if (!answer) return null;
    try {
      return typeof answer.content === "string" ? JSON.parse(answer.content) : answer.content;
    } catch {
      return answer.content;
    }
  };

  const kit = {
    weakness_audit: normalizeToArray(getContent("weakness_audit")),
    hard_questions: normalizeToArray(getContent("defense_questions")),
    timing_guide: normalizeToArray(getContent("presentation_structure")),
    roleplay_script: getContent("role_play_script") ?? {},
    cheat_sheet: getContent("cheat_sheet") ?? {},
    interviewers: (interviewersResult.data ?? []).map((i) => ({
      name: i.name ?? "",
      title: (i.title as string) ?? "",
      profile: (i.profile_data ?? {}) as Record<string, unknown>,
    })),
  };

  const hasContent =
    kit.weakness_audit.length > 0 ||
    kit.hard_questions.length > 0 ||
    kit.interviewers.length > 0;

  if (!hasContent) {
    redirect(`/prep/${sessionId}`);
  }

  return <LiveInterviewMode sessionId={sessionId} kit={kit} />;
}

function normalizeToArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val;
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    for (const key of ["items", "points", "questions", "weak_spots", "slides", "lines"]) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
  }
  return [];
}
