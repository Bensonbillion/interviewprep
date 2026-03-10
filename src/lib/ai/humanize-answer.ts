import type { AnswerType } from "@/types";

/**
 * Answer types that represent spoken/narrative content.
 * Reference materials (company_brief, cheat_sheet, etc.) are NOT spoken.
 *
 * Used by style-lint to decide whether to apply contractions and
 * remove formal openings.
 */
const SPOKEN_ANSWER_TYPES: Set<AnswerType> = new Set([
  "tell_me_about_yourself",
  "why_sales",
  "why_this_company",
  "behavioral_star",
  "comp_expectations",
  "objection_response",
  "coachability_coaching",
  "coachability_game_plan",
  "career_switcher_bridge",
  "resume_walkthrough",
  "constructive_feedback",
]);

/**
 * Returns true if this answer type is a spoken answer (not reference material).
 */
export function shouldHumanize(answerType: AnswerType): boolean {
  return SPOKEN_ANSWER_TYPES.has(answerType);
}
