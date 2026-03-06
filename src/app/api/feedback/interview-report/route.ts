import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function adminDb() {
  return createAdminClient();
}

/**
 * POST /api/feedback/interview-report
 * Submit a post-interview intelligence report.
 * Required: companyName, roleTitle, stage.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      prepSessionId?: string;
      companyName: string;
      roleTitle: string;
      stage: string;
      interviewDate?: string;
      outcome?: string;
      durationMinutes?: number;
      numInterviewers?: number;
      interviewerRoles?: string[];
      questionsAsked?: Array<{ question: string; type: string; notes?: string }>;
      includedRoleplay?: boolean;
      roleplayScenario?: string;
      difficulty?: number;
      experience?: string;
      notes?: string;
    };

    const { companyName, roleTitle, stage } = body;

    if (!companyName || !roleTitle || !stage) {
      return NextResponse.json({ error: "companyName, roleTitle, stage required" }, { status: 400 });
    }

    const db = adminDb();
    const { data, error } = await db.from("interview_reports").insert({
      prep_session_id: body.prepSessionId ?? null,
      company_name: companyName,
      role_title: roleTitle,
      stage,
      interview_date: body.interviewDate ?? null,
      outcome: body.outcome ?? null,
      duration_minutes: body.durationMinutes ?? null,
      num_interviewers: body.numInterviewers ?? null,
      interviewer_roles: body.interviewerRoles ?? [],
      questions_asked: body.questionsAsked ?? [],
      included_roleplay: body.includedRoleplay ?? false,
      roleplay_scenario: body.roleplayScenario ?? null,
      difficulty: body.difficulty ?? null,
      experience: body.experience ?? null,
      notes: body.notes ?? null,
    }).select("id").single();

    if (error) throw error;

    return NextResponse.json({ id: data?.id, ok: true });
  } catch (err) {
    console.warn("Interview report submission failed:", err);
    return NextResponse.json({ ok: true });
  }
}
