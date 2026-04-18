import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildLiveCards } from "@/lib/live-mode/build-cards";
import LiveInterviewMode from "@/components/live-mode/LiveInterviewMode";

export const metadata = {
  title: "Live Interview Mode — SalesPrep AI",
};

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const db = createAdminClient();

  const [answersResult, interviewersResult] = await Promise.all([
    db.from("generated_answers")
      .select("answer_type, content")
      .eq("session_id", sessionId)
      .eq("status", "completed"),
    db.from("session_interviewers")
      .select("name, title, profile_data")
      .eq("session_id", sessionId),
  ]);

  const answers = (answersResult.data ?? []).map((a) => ({
    answer_type: a.answer_type as string,
    content: a.content as string,
  }));

  const interviewers = (interviewersResult.data ?? []).map((i) => ({
    name: (i.name as string) ?? "",
    title: (i.title as string) ?? null,
    profile_data: (i.profile_data ?? null) as Record<string, unknown> | null,
  }));

  const cards = buildLiveCards(answers, interviewers);

  if (cards.length === 0) {
    redirect(`/prep/${sessionId}`);
  }

  return <LiveInterviewMode sessionId={sessionId} cards={cards} />;
}
