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
    redirect(`/auth/login?redirectTo=/prep/${sessionId}/live`);
  }

  const db = createAdminClient();

  // Fetch session + generated answers + interviewers in parallel
  const [sessionResult, answersResult, interviewersResult] = await Promise.all([
    db.from("prep_sessions")
      .select("id, session_data")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single(),
    db.from("generated_answers")
      .select("answer_type, content, metadata")
      .eq("session_id", sessionId)
      .in("answer_type", [
        "weakness_audit",
        "defense_questions",
        "presentation_structure",
        "role_play_script",
        "cheat_sheet",
      ]),
    db.from("session_interviewers")
      .select("name, title, profile_data")
      .eq("session_id", sessionId),
  ]);

  if (!sessionResult.data) {
    redirect("/dashboard");
  }

  // Build the kit from generated_answers
  const answerMap = new Map<string, unknown>();
  for (const a of answersResult.data ?? []) {
    try {
      answerMap.set(a.answer_type, typeof a.content === "string" ? JSON.parse(a.content) : a.content);
    } catch {
      answerMap.set(a.answer_type, a.content);
    }
  }

  const interviewers = (interviewersResult.data ?? []).map((i) => ({
    name: i.name ?? "",
    title: (i.title as string) ?? "",
    profile: (i.profile_data ?? {}) as Record<string, unknown>,
  }));

  const kit = {
    weakness_audit: normalizeToArray(answerMap.get("weakness_audit")),
    hard_questions: normalizeToArray(answerMap.get("defense_questions")),
    timing_guide: normalizeToArray(answerMap.get("presentation_structure")),
    roleplay_script: answerMap.get("role_play_script") ?? {},
    cheat_sheet: answerMap.get("cheat_sheet") ?? {},
    interviewers,
  };

  const hasContent =
    kit.weakness_audit.length > 0 ||
    kit.hard_questions.length > 0 ||
    kit.interviewers.length > 0;

  if (!hasContent) {
    // No defense kit generated yet — redirect to normal prep view
    redirect(`/prep/${sessionId}`);
  }

  return <LiveInterviewMode sessionId={sessionId} kit={kit} />;
}

function normalizeToArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val;
  if (val && typeof val === "object" && !Array.isArray(val)) {
    // Try common wrapper keys
    const obj = val as Record<string, unknown>;
    for (const key of ["items", "points", "questions", "weak_spots", "slides", "lines"]) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
  }
  return [];
}
