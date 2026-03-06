import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCompanyName } from "@/lib/privacy/normalizer";
import { anonymizeText } from "@/lib/privacy/anonymizer";

function adminDb() {
  return createAdminClient();
}

function cleanQuestionText(text: string): string {
  return text
    .replace(/^(they asked me|the question was|i was asked|they wanted to know)\s*[:—–-]?\s*/i, "")
    .trim();
}

function autoCategorize(text: string): string | null {
  const lower = text.toLowerCase();
  if (/tell me about a time|give me an example|describe a situation|walk me through.*experience/i.test(lower)) return "behavioral";
  if (/what would you do if|imagine|how would you handle|if you were/i.test(lower)) return "situational";
  if (/sell me|cold call|pitch|roleplay|role play|prospect|demo/i.test(lower)) return "roleplay";
  if (/walk me through|explain|how does|what is|technical/i.test(lower)) return "technical";
  if (/culture|values|team|work.?life|remote|office/i.test(lower)) return "culture_fit";
  if (/questions? for (us|me)|anything.*ask/i.test(lower)) return "closing";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      prepSessionId?: string;
      companyName: string;
      roleTitle: string;
      stage: string;
      interviewFormat?: string;
      durationMinutes?: number;
      difficultyRating?: number;
      experienceRating?: string;
      overallNotes?: string;
      interviewerTitle?: string;
      totalStagesInProcess?: number;
      currentStageNumber?: number;
      daysSinceApplication?: number;
      outcome?: string;
      questions?: Array<{
        questionText: string;
        questionCategory?: string;
        wasExpected?: boolean;
        feltPrepared?: boolean;
        ourAnswerWasHelpful?: boolean | null;
        whatIActuallySaid?: string;
        whatIWishISaid?: string;
        matchedAnswerType?: string;
      }>;
    };

    const { companyName, roleTitle, stage } = body;
    if (!companyName?.trim() || !roleTitle?.trim() || !stage?.trim()) {
      return NextResponse.json({ error: "companyName, roleTitle, stage required" }, { status: 400 });
    }

    const companyNameNormalized = normalizeCompanyName(companyName);
    const db = adminDb();

    // Insert the report
    const { data: report, error: reportErr } = await db
      .from("interview_reports")
      .insert({
        prep_session_id: body.prepSessionId ?? null,
        company_name: companyName.trim(),
        company_name_normalized: companyNameNormalized,
        role_title: roleTitle.trim(),
        stage,
        interview_format: body.interviewFormat ?? null,
        duration_minutes: body.durationMinutes ?? null,
        difficulty: body.difficultyRating ?? null,
        experience: body.experienceRating ?? null,
        notes: body.overallNotes?.trim() ?? null,
        interviewer_title: body.interviewerTitle?.trim() ?? null,
        total_stages_in_process: body.totalStagesInProcess ?? null,
        current_stage_number: body.currentStageNumber ?? null,
        days_since_application: body.daysSinceApplication ?? null,
        outcome: body.outcome ?? "pending",
      })
      .select("id")
      .single();

    if (reportErr) throw reportErr;
    const reportId = report?.id;

    // Insert questions if provided
    if (reportId && body.questions?.length) {
      const questionRows = body.questions
        .filter((q) => q.questionText?.trim())
        .slice(0, 10)
        .map((q) => {
          const cleaned = cleanQuestionText(q.questionText);
          return {
            report_id: reportId,
            question_text: cleaned,
            question_category: q.questionCategory || autoCategorize(cleaned),
            interview_stage: stage,
            was_expected: q.wasExpected ?? null,
            felt_prepared: q.feltPrepared ?? null,
            our_answer_was_helpful: q.ourAnswerWasHelpful ?? null,
            what_i_actually_said: q.whatIActuallySaid?.trim() ?? null,
            what_i_wish_i_said: q.whatIWishISaid?.trim() ?? null,
            matched_answer_type: q.matchedAnswerType ?? null,
            company_name_normalized: companyNameNormalized,
          };
        });

      if (questionRows.length > 0) {
        await db.from("interview_questions_reported").insert(questionRows);
      }
    }

    return NextResponse.json({ id: reportId, ok: true });
  } catch (err) {
    console.warn("Report submission failed:", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
