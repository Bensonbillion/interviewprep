import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApiAuth } from "@/lib/auth/verify";
import { reportSchema } from "@/lib/validation/schemas";
import { normalizeCompanyName } from "@/lib/privacy/normalizer";

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
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const data = parsed.data;
    const companyNameNormalized = normalizeCompanyName(data.companyName);
    const db = adminDb();

    // Insert the report
    const { data: report, error: reportErr } = await db
      .from("interview_reports")
      .insert({
        prep_session_id: data.prepSessionId ?? null,
        company_name: data.companyName.trim(),
        company_name_normalized: companyNameNormalized,
        role_title: data.roleTitle.trim(),
        stage: data.stage,
        interview_format: data.interviewFormat ?? null,
        duration_minutes: data.durationMinutes ?? null,
        difficulty: data.difficultyRating ?? null,
        experience: data.experienceRating ?? null,
        notes: data.overallNotes?.trim() ?? null,
        interviewer_title: data.interviewerTitle?.trim() ?? null,
        total_stages_in_process: data.totalStagesInProcess ?? null,
        current_stage_number: data.currentStageNumber ?? null,
        days_since_application: data.daysSinceApplication ?? null,
        outcome: data.outcome ?? "pending",
      })
      .select("id")
      .single();

    if (reportErr) throw reportErr;
    const reportId = report?.id;

    // Insert questions if provided
    if (reportId && data.questions?.length) {
      const questionRows = data.questions
        .filter((q) => q.questionText?.trim())
        .slice(0, 10)
        .map((q) => {
          const cleaned = cleanQuestionText(q.questionText);
          return {
            report_id: reportId,
            question_text: cleaned,
            question_category: q.questionCategory || autoCategorize(cleaned),
            interview_stage: data.stage,
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
