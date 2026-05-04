import type { AnswerType } from "@/types";

/**
 * Answer types that stream response text live to the UI as Claude generates.
 *
 * All other answer types remain on the existing non-streaming path because
 * they emit JSON (parsed by ContentRouter into structured cards) — streaming
 * partial JSON to a JSON.parse() renderer produces unparseable garbage.
 *
 * These six are the spoken-narrative types where the FormattedTextContent
 * renderer accepts incremental string updates without parsing.
 *
 * QC NOTE: Streaming bypasses the post-Claude quality check + auto-regenerate
 * step that the non-streaming path runs. The tradeoff is: we get <2s TTFT
 * but we no longer rewrite low-confidence answers automatically. Reasoning:
 * QC issues that warrant regen tend to be structural (banned words, wrong
 * format) which apply more to JSON answer types than to spoken narrative.
 * The user can still hit the regenerate button if they don't like the answer.
 */
export const STREAMING_ANSWER_TYPES = new Set<AnswerType>([
  "tell_me_about_yourself",
  "resume_walkthrough",
  "why_sales",
  "why_this_company",
  "coachability_coaching",
  "constructive_feedback",
]);

export function isStreamingAnswerType(t: AnswerType): boolean {
  return STREAMING_ANSWER_TYPES.has(t);
}

/** Server-Sent Event payloads agreed between server route and client consumer. */
export type AnswerStreamEvent =
  | { type: "text"; text: string }
  | { type: "done"; answerId: string; model: string }
  | { type: "error"; message: string };
