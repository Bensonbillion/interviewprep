import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApiAuth } from "@/lib/auth/verify";
import { feedbackLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { interviewReportFeedbackSchema } from "@/lib/validation/schemas";
import { encrypt } from "@/lib/security/encryption";

function adminDb() {
  return createAdminClient();
}

/**
 * POST /api/feedback/interview-report
 * Submit a post-interview intelligence report.
 * Required: companyName, roleTitle, stage.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(feedbackLimiter, auth.userId);
  if (!allowed) {
    return NextResponse.json({ ok: true });
  }

  try {
    const body = await req.json();
    const parsed = interviewReportFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const data = parsed.data;

    const db = adminDb();
    const { data: result, error } = await db.from("interview_reports").insert({
      prep_session_id: data.prepSessionId ?? null,
      company_name: data.companyName,
      role_title: data.roleTitle,
      stage: data.stage,
      interview_date: data.interviewDate ?? null,
      outcome: data.outcome ?? null,
      duration_minutes: data.durationMinutes ?? null,
      num_interviewers: data.numInterviewers ?? null,
      interviewer_roles: data.interviewerRoles ?? [],
      questions_asked: data.questionsAsked ?? [],
      included_roleplay: data.includedRoleplay ?? false,
      roleplay_scenario: data.roleplayScenario ? encrypt(data.roleplayScenario) : null,
      difficulty: data.difficulty ?? null,
      experience: data.experience ?? null,
      notes: data.notes ? encrypt(data.notes) : null,
    }).select("id").single();

    if (error) throw error;

    return NextResponse.json({ id: result?.id, ok: true });
  } catch (err) {
    console.warn("Interview report submission failed:", err);
    return NextResponse.json({ ok: true });
  }
}
