import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CapturedInsight } from "@/types";

/**
 * Load the captured insights for a session, ordered by interrogation_line
 * index. Returns only rows with a usable final_answer (substantive answers
 * — including drilled ones — that downstream answer generation can read
 * as the candidate's lived competitive truth).
 *
 * This is the import the Narrative Spine build (and any answer-generation
 * change that wants to ground prompts in what the candidate actually said)
 * uses to reach captured_insights. The seam from spec §12 test case 7:
 * "answer generation reads the table — confirm it reads it."
 *
 * Returns an empty array for sessions with no captured insights (switcher
 * / skipped / no-brief), so callers can compose unconditionally.
 */
export async function loadCapturedInsightsForSession(
  sessionId: string
): Promise<CapturedInsight[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("captured_insights")
    .select("*")
    .eq("session_id", sessionId)
    .not("final_answer", "is", null)
    .order("interrogation_line_index", { ascending: true });
  if (error) {
    console.warn("[insight] loadCapturedInsightsForSession failed:", error.message);
    return [];
  }
  return (data ?? []) as CapturedInsight[];
}
