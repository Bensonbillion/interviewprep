import "server-only";
import { HAIKU } from "@/lib/ai";
import { callClaudeForJson } from "@/lib/ai/json-call";
import {
  buildInsightEvaluationPrompt,
  type InsightEvaluationContext,
} from "@/lib/ai/positioning-prompts";
import { AnswerEvaluationSchema } from "@/lib/types/schemas";
import type { AnswerEvaluation, InterrogationLine } from "@/types";

// ─── Section 5 — the core weak-answer evaluation ─────────────────────────
//
// Runs every time a candidate finishes an answer. Cheap and fast — a
// Haiku call returning an AnswerEvaluation in ~1–2s.
//
// Behaviour:
//   - Empty / one-or-two-word answers short-circuit to "unanswered"
//     without a Claude call.
//   - Everything else goes to Haiku with buildInsightEvaluationPrompt.
//   - On Haiku/Zod failure: degrade to "substantive" (we do NOT block
//     the candidate behind a flaky evaluation — better to let a thin
//     answer through than to crash the surface).
//
// The rubric is the engine's own star_slot_hint. This function never
// invents a standard of quality; it just checks against the standard the
// engine already defined for this specific question.

/** Words below this count → automatic "unanswered" (no Claude call). */
const UNANSWERED_WORD_THRESHOLD = 3;

export async function evaluateInsightAnswer(
  rawAnswer: string,
  line: Pick<InterrogationLine, "question" | "star_slot_hint">
): Promise<AnswerEvaluation> {
  const trimmed = rawAnswer.trim();
  const wordCount = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;

  if (wordCount < UNANSWERED_WORD_THRESHOLD) {
    return {
      star_coverage: { s: false, t: false, a: false, r: false },
      quality: "unanswered",
      thin_reason: "",
      follow_up_question: null,
    };
  }

  const ctx: InsightEvaluationContext = {
    question: line.question,
    star_slot_hint: line.star_slot_hint,
    raw_answer: trimmed,
  };
  const { system, user, maxTokens } = buildInsightEvaluationPrompt(ctx);

  try {
    const { data } = await callClaudeForJson({
      model: HAIKU,
      system,
      user,
      maxTokens,
      schema: AnswerEvaluationSchema,
      label: "evaluateInsightAnswer",
    });
    // Belt-and-braces: if Haiku marks "thin" but emits no follow-up,
    // downgrade to "substantive" rather than show an empty drill prompt.
    if (data.quality === "thin" && !data.follow_up_question) {
      return { ...data, quality: "substantive", thin_reason: "" };
    }
    return data;
  } catch (err) {
    console.warn("[insight_interview] evaluation failed; defaulting to substantive", {
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      star_coverage: { s: true, t: true, a: true, r: true },
      quality: "substantive",
      thin_reason: "",
      follow_up_question: null,
    };
  }
}

/**
 * Trivial concatenation of the raw answer and the candidate's follow-up
 * answer into a single coherent account. Spec §5: "prefer the trivial
 * join unless Phase 0 conventions suggest otherwise — keep it cheap."
 * No Claude call.
 */
export function mergeDrilledAnswer(rawAnswer: string, followUpAnswer: string): string {
  const a = rawAnswer.trim();
  const b = followUpAnswer.trim();
  if (!a) return b;
  if (!b) return a;
  return `${a}\n\n${b}`;
}
