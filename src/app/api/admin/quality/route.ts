import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin-config";

function admin() {
  return createAdminClient();
}

async function requireAdmin(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const daysBack = parseInt(searchParams.get("days") ?? "30", 10);
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  const db = admin();

  const [versionsRes, feedbackRes] = await Promise.all([
    db
      .from("answer_versions")
      .select("id, answer_type, generation_type, created_at")
      .gte("created_at", since),
    db
      .from("answer_feedback")
      .select("id, answer_type, feedback_type, issue_category, created_at")
      .gte("created_at", since),
  ]);

  const versions = (versionsRes.data ?? []) as Array<{
    id: string;
    answer_type: string;
    generation_type: string;
    created_at: string;
  }>;
  const feedback = (feedbackRes.data ?? []) as Array<{
    id: string;
    answer_type: string;
    feedback_type: string;
    issue_category: string | null;
    created_at: string;
  }>;

  // Aggregate stats
  const totalGenerated = versions.filter((v) => v.generation_type === "initial").length;
  const thumbsUp = feedback.filter((f) => f.feedback_type === "thumbs_up").length;
  const thumbsDown = feedback.filter((f) => f.feedback_type === "thumbs_down").length;
  const copies = feedback.filter((f) => f.feedback_type === "copy").length;

  // By question type
  const allAnswerTypes = [
    "tell_me_about_yourself", "why_sales", "why_this_company", "behavioral_star",
    "comp_expectations", "role_play_script", "objection_response", "company_brief",
    "cheat_sheet", "questions_to_ask", "coachability_coaching", "career_switcher_bridge",
  ];

  const byType = allAnswerTypes
    .map((type) => {
      const typeFeedback = feedback.filter((f) => f.answer_type === type);
      const up = typeFeedback.filter((f) => f.feedback_type === "thumbs_up").length;
      const down = typeFeedback.filter((f) => f.feedback_type === "thumbs_down").length;
      const total = up + down;
      return {
        type,
        thumbsUp: up,
        thumbsDown: down,
        total,
        satisfactionPct: total > 0 ? Math.round((up / total) * 100) : null,
      };
    })
    .filter((t) => t.total > 0)
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0));

  // Issue categories (from thumbs-down follow-ups)
  const issueCounts: Record<string, number> = {};
  for (const f of feedback) {
    if (f.feedback_type === "thumbs_down" && f.issue_category) {
      issueCounts[f.issue_category] = (issueCounts[f.issue_category] ?? 0) + 1;
    }
  }
  const issues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  // Recent thumbs-down (for review list)
  const recentThumbsDown = feedback
    .filter((f) => f.feedback_type === "thumbs_down")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  return NextResponse.json({
    summary: { totalGenerated, thumbsUp, thumbsDown, copies, daysBack },
    byType,
    issues,
    recentThumbsDown,
  });
}
