import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildLiveCards } from "@/lib/live-mode/build-cards";
import LiveInterviewMode from "@/components/live-mode/LiveInterviewMode";

export const dynamic = "force-dynamic";

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

  // Allow unauthenticated access via magic token in future
  // For now require auth
  if (!user) redirect("/auth/login");

  const db = createAdminClient();

  const [answersRes, interviewersRes] = await Promise.all([
    db.from("generated_answers")
      .select("answer_type, content, metadata")
      .eq("session_id", sessionId)
      .eq("status", "completed"),
    db.from("session_interviewers")
      .select("*")
      .eq("session_id", sessionId),
  ]);

  const cards = buildLiveCards(
    (answersRes.data ?? []).map((a) => ({
      answer_type: a.answer_type as string,
      content: a.content as string,
    })),
    (interviewersRes.data ?? []).map((i) => ({
      name: (i.name as string) ?? "",
      title: (i.title as string) ?? null,
      profile_data: (i.profile_data ?? null) as Record<string, unknown> | null,
    }))
  );

  if (cards.length === 0) {
    redirect(`/prep/${sessionId}`);
  }

  return <LiveInterviewMode cards={cards} />;
}
