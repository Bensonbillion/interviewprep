/**
 * Account deletion pipeline.
 *
 * When a user deletes their account:
 * 1. Delete their interview_reports records
 * 2. Delete their answer_explicit_feedback records
 * 3. Delete their answer_interactions records
 * 4. Delete their session_feedback records
 * 5. KEEP contributions to company playbooks (aggregate stats survive)
 * 6. Recalculate playbook aggregates after deletion
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { updateCompanyPlaybooks } from "@/lib/feedback/prompt-optimizer";

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface DeletionResult {
  interviewReportsDeleted: number;
  explicitFeedbackDeleted: number;
  interactionsDeleted: number;
  sessionFeedbackDeleted: number;
  questionsReportedDeleted: number;
  sessionEventsDeleted: number;
  voiceSamplesDeleted: number;
  confidenceScoresDeleted: number;
  playbooksRecalculated: number;
}

/**
 * Delete all user-specific data while preserving aggregated playbook stats.
 *
 * The company playbooks table contains only aggregate statistics
 * (averages, percentages, counts) — no individual user data.
 * After deleting individual records, we recalculate the aggregates
 * so they reflect the reduced dataset accurately.
 */
export async function deleteUserData(userId: string): Promise<DeletionResult> {
  const db = adminDb();

  // Track which companies are affected (for playbook recalculation)
  const { data: affectedReports } = await db
    .from("interview_reports")
    .select("company_name_normalized")
    .eq("user_id", userId);

  const affectedCompanies = new Set(
    (affectedReports ?? [])
      .map((r) => r.company_name_normalized)
      .filter(Boolean) as string[]
  );

  // Delete in dependency order (questions reference reports via CASCADE,
  // but we delete explicitly for accurate counts)

  // 1. Delete reported questions (child of interview_reports)
  const { data: questionsDeleted } = await db
    .from("interview_questions_reported")
    .delete()
    .eq("user_id", userId)
    .select("id");

  // 2. Delete interview reports
  const { data: reportsDeleted } = await db
    .from("interview_reports")
    .delete()
    .eq("user_id", userId)
    .select("id");

  // 3. Delete explicit feedback
  const { data: explicitDeleted } = await db
    .from("answer_explicit_feedback")
    .delete()
    .eq("user_id", userId)
    .select("id");

  // 4. Delete implicit interactions
  const { data: interactionsDeleted } = await db
    .from("answer_interactions")
    .delete()
    .eq("user_id", userId)
    .select("id");

  // 5. Delete session feedback
  const { data: sessionFbDeleted } = await db
    .from("session_feedback")
    .delete()
    .eq("user_id", userId)
    .select("id");

  // 6. Delete session events (from migration 009)
  const { data: eventsDeleted } = await db
    .from("session_events")
    .delete()
    .eq("user_id", userId)
    .select("id");

  // 7. Delete voice samples
  const { data: voiceDeleted } = await db
    .from("answer_voice_samples")
    .delete()
    .eq("user_id", userId)
    .select("id");

  // 8. Delete confidence scores
  const { data: confidenceDeleted } = await db
    .from("session_confidence_scores")
    .delete()
    .eq("user_id", userId)
    .select("id");

  // 9. Recalculate playbook aggregates for affected companies
  let playbooksRecalculated = 0;
  if (affectedCompanies.size > 0) {
    playbooksRecalculated = await updateCompanyPlaybooks();
  }

  return {
    interviewReportsDeleted: reportsDeleted?.length ?? 0,
    explicitFeedbackDeleted: explicitDeleted?.length ?? 0,
    interactionsDeleted: interactionsDeleted?.length ?? 0,
    sessionFeedbackDeleted: sessionFbDeleted?.length ?? 0,
    questionsReportedDeleted: questionsDeleted?.length ?? 0,
    sessionEventsDeleted: eventsDeleted?.length ?? 0,
    voiceSamplesDeleted: voiceDeleted?.length ?? 0,
    confidenceScoresDeleted: confidenceDeleted?.length ?? 0,
    playbooksRecalculated,
  };
}
