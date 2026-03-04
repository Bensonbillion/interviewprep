/**
 * RAG context retrieval for generation pipeline.
 * Fetches knowledge chunks, golden examples, voice profile, and active prompt version.
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/embeddings";
import type { AnswerType, RoleType, InterviewStage } from "@/types";

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface ProbeDepthQuestions {
  level_1?: string;
  level_2?: string;
  level_3?: string;
  trap_question?: string;
}

export interface RagContext {
  /** Suffix to append to the base system prompt. Contains voice rules + golden examples. */
  systemSuffix: string;
  /** Override system prompt if an active prompt version exists for this answer type. */
  activePromptText: string | null;
  /** The active prompt version ID (for logging). */
  activePromptVersionId: string | null;
  /** IDs of knowledge chunks retrieved. */
  knowledgeChunkIds: string[];
  /** IDs of golden examples retrieved. */
  goldenExampleIds: string[];
  /** Probe depth questions from question_bank (for system suffix injection). */
  probeDepthQuestions: ProbeDepthQuestions | null;
  /** Detection technique used by the interviewer for this question type. */
  detectionTechnique: string | null;
}

/**
 * Retrieve all RAG context needed for a single generation.
 * Designed to run in parallel where possible.
 */
export async function fetchRagContext(
  answerType: AnswerType,
  queryText: string,
  roleType?: RoleType,
  stage?: InterviewStage
): Promise<RagContext> {
  try {
    const db = adminDb();

    // Run all lookups in parallel (voice/rules, active prompt, embeddings, probe data)
    const [voiceRes, promptRes, queryEmbedding, questionBankRes] = await Promise.all([
      db.from("voice_profile").select("id, description, tone_keywords").eq("is_active", true).limit(1).single(),
      db.from("prompt_versions").select("id, prompt_text").eq("question_key", answerType).eq("is_active", true).limit(1).maybeSingle(),
      generateEmbedding(queryText).catch(() => null),
      db.from("question_bank")
        .select("likely_followups, probe_depth_questions, detection_technique, hidden_evaluation")
        .eq("answer_type", answerType)
        .eq("is_active", true)
        .or(`stage.eq.${stage ?? "all"},stage.eq.all`)
        .or(`role_type.eq.${roleType ?? "all"},role_type.eq.all`)
        .order("frequency_score", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // Fetch detection pattern coaching note if we have a technique
    const detectionTechniqueValue = (questionBankRes.data as { detection_technique?: string } | null)?.detection_technique;
    const detectionPatternRes = detectionTechniqueValue
      ? await db.from("interviewer_detection_patterns")
          .select("what_interviewer_is_testing, green_flag_response, red_flag_response, coaching_note")
          .eq("technique_name", detectionTechniqueValue)
          .eq("is_active", true)
          .maybeSingle()
      : { data: null };
    const detectionPattern = detectionPatternRes.data as {
      what_interviewer_is_testing: string | null;
      green_flag_response: string | null;
      red_flag_response: string | null;
      coaching_note: string | null;
    } | null;

    const voice = voiceRes.data as { id: string; description: string; tone_keywords: string[] } | null;
    const activePrompt = promptRes.data as { id: string; prompt_text: string } | null;
    const questionBankRow = questionBankRes.data as {
      likely_followups: string[] | null;
      probe_depth_questions: ProbeDepthQuestions | null;
      detection_technique: string | null;
      hidden_evaluation: string | null;
    } | null;

    // Fetch style rules if we have a voice profile
    let styleRules: Array<{ rule_type: string; rule_text: string; replacement: string | null }> = [];
    if (voice?.id) {
      const rulesRes = await db
        .from("style_rules")
        .select("rule_type, rule_text, replacement")
        .eq("voice_id", voice.id)
        .eq("is_active", true);
      styleRules = (rulesRes.data ?? []) as typeof styleRules;
    }

    // RAG retrieval (only if embeddings are available)
    let knowledgeChunks: Array<{ id: string; content: string }> = [];
    let goldenExamples: Array<{ id: string; question_text: string; answer_text: string; framework: string | null; authenticity_markers: string[] | null; red_flag_version: string | null; red_flag_why: string | null }> = [];

    if (queryEmbedding) {
      const [chunksRes, examplesRes] = await Promise.all([
        db.rpc("match_knowledge_chunks", {
          query_embedding: queryEmbedding,
          match_count: 4,
          match_threshold: 0.55,
        }),
        db.rpc("match_golden_examples", {
          query_embedding: queryEmbedding,
          match_count: 2,
          filter_question_key: answerType,
          filter_role: roleType ?? null,
        }),
      ]);

      knowledgeChunks = (chunksRes.data ?? []) as typeof knowledgeChunks;
      goldenExamples = (examplesRes.data ?? []) as typeof goldenExamples;
    }

    // Build system prompt suffix
    const parts: string[] = [];

    // 1. Voice description
    if (voice?.description) {
      parts.push(`VOICE & TONE:\n${voice.description}`);
      if ((voice.tone_keywords ?? []).length > 0) {
        parts.push(`Tone keywords: ${voice.tone_keywords.join(", ")}`);
      }
    }

    // 2. Style rules
    const bannedPhrases = styleRules.filter((r) => r.rule_type === "banned_phrase");
    const replacements = styleRules.filter((r) => r.rule_type === "replacement");
    const instructions = styleRules.filter((r) => r.rule_type === "instruction");

    if (bannedPhrases.length > 0) {
      parts.push(
        `BANNED PHRASES (never use these):\n${bannedPhrases.map((r) => `- "${r.rule_text}"${r.replacement ? ` → use: ${r.replacement}` : ""}`).join("\n")}`
      );
    }
    if (replacements.length > 0) {
      parts.push(
        `WORD REPLACEMENTS:\n${replacements.map((r) => `- "${r.rule_text}" → "${r.replacement ?? "avoid"}"`).join("\n")}`
      );
    }
    if (instructions.length > 0) {
      parts.push(
        `STYLE INSTRUCTIONS:\n${instructions.map((r) => `- ${r.rule_text}`).join("\n")}`
      );
    }

    // 3. Knowledge chunks
    if (knowledgeChunks.length > 0) {
      parts.push(
        `RELEVANT KNOWLEDGE:\n${knowledgeChunks.map((c, i) => `[${i + 1}] ${c.content.slice(0, 400)}`).join("\n\n")}`
      );
    }

    // 4. Golden examples (few-shot) with authenticity markers and red flag contrast
    if (goldenExamples.length > 0) {
      const exampleBlocks = goldenExamples.map((ex, i) => {
        const lines: string[] = [];
        lines.push(`GOLDEN EXAMPLE ${i + 1}${ex.framework ? ` (${ex.framework})` : ""}:`);
        lines.push(`Q: ${ex.question_text}`);
        lines.push(`A: ${ex.answer_text.slice(0, 700)}`);
        if (ex.authenticity_markers?.length) {
          lines.push(`WHAT MAKES THIS AUTHENTIC: ${ex.authenticity_markers.join(", ")}`);
        }
        if (ex.red_flag_version) {
          lines.push(`\nCONTRAST — HOW A FABRICATING CANDIDATE SAYS IT:\n"${ex.red_flag_version.slice(0, 400)}"`);
          if (ex.red_flag_why) {
            lines.push(`WHY THIS FAILS: ${ex.red_flag_why}`);
          }
        }
        return lines.join("\n");
      });
      parts.push(`GOLDEN EXAMPLES — match the depth and authenticity of the GOOD version, never the contrast version:\n\n${exampleBlocks.join("\n\n")}`);
    }

    // 5. Probe survival context from question_bank
    if (questionBankRow) {
      const probeParts: string[] = [];

      if (questionBankRow.detection_technique) {
        const techniqueDescriptions: Record<string, string> = {
          detail_drill: "drilling for granular specifics — vague answers will be pushed on immediately",
          obstacle_probe: "looking for what went wrong or what was genuinely hard",
          learning_loop: "testing whether the candidate extracts real lessons vs. just claiming growth",
          reverse_order: "may ask you to replay the story in reverse to test for fabrication",
          ownership_test: "specifically separating YOUR contribution from the team's",
          coachability_test: "watching how you receive and implement feedback in real time",
        };
        const desc = techniqueDescriptions[questionBankRow.detection_technique];
        probeParts.push(`INTERVIEWER TECHNIQUE: ${questionBankRow.detection_technique}${desc ? ` — ${desc}` : ""}`);

        if (detectionPattern) {
          if (detectionPattern.what_interviewer_is_testing) {
            probeParts.push(`WHAT THE TECHNIQUE ACTUALLY TESTS: ${detectionPattern.what_interviewer_is_testing}`);
          }
          if (detectionPattern.green_flag_response && detectionPattern.red_flag_response) {
            probeParts.push(`GREEN FLAG (aim for this): ${detectionPattern.green_flag_response}\nRED FLAG (avoid this): ${detectionPattern.red_flag_response}`);
          }
          if (detectionPattern.coaching_note) {
            probeParts.push(`COACHING NOTE FOR THIS TECHNIQUE: ${detectionPattern.coaching_note}`);
          }
        }
      }

      if (questionBankRow.hidden_evaluation) {
        probeParts.push(`WHAT THE INTERVIEWER IS ACTUALLY EVALUATING: ${questionBankRow.hidden_evaluation}`);
      }

      if (questionBankRow.likely_followups?.length) {
        probeParts.push(`LIKELY FOLLOW-UP PROBES:\n${questionBankRow.likely_followups.map((q) => `- "${q}"`).join("\n")}`);
      }

      if (questionBankRow.probe_depth_questions) {
        const pdq = questionBankRow.probe_depth_questions;
        const probeLines = [
          pdq.level_1 && `Level 1 — "Tell me more": "${pdq.level_1}"`,
          pdq.level_2 && `Level 2 — Specificity drill: "${pdq.level_2}"`,
          pdq.level_3 && `Level 3 — Process/reasoning: "${pdq.level_3}"`,
          pdq.trap_question && `Trap question: "${pdq.trap_question}"`,
        ].filter(Boolean);
        if (probeLines.length > 0) {
          probeParts.push(`PROBE SEQUENCE THIS ANSWER MUST SURVIVE:\n${probeLines.join("\n")}\nStructure the answer so each probe already has a specific detail to reference.`);
        }
      }

      if (probeParts.length > 0) {
        parts.push(probeParts.join("\n\n"));
      }
    }

    return {
      systemSuffix: parts.length > 0 ? `\n\n---\n${parts.join("\n\n")}` : "",
      activePromptText: activePrompt?.prompt_text ?? null,
      activePromptVersionId: activePrompt?.id ?? null,
      knowledgeChunkIds: knowledgeChunks.map((c) => c.id),
      goldenExampleIds: goldenExamples.map((e) => e.id),
      probeDepthQuestions: questionBankRow?.probe_depth_questions ?? null,
      detectionTechnique: questionBankRow?.detection_technique ?? null,
    };
  } catch (err) {
    // RAG errors are non-fatal — generation continues without enrichment
    console.warn("RAG context fetch failed (non-fatal):", err);
    return {
      systemSuffix: "",
      activePromptText: null,
      activePromptVersionId: null,
      knowledgeChunkIds: [],
      goldenExampleIds: [],
      probeDepthQuestions: null,
      detectionTechnique: null,
    };
  }
}

/**
 * Log an answer generation event to answer_versions table.
 * Fire-and-forget — errors are swallowed so generation is never blocked.
 */
export async function logAnswerVersion(params: {
  sessionId: string;
  answerType: AnswerType;
  content: string;
  generationType: "initial" | "regen" | "edit";
  quickAction?: string | null;
  promptVersionId?: string | null;
  knowledgeChunkIds?: string[];
  goldenExampleIds?: string[];
}): Promise<void> {
  try {
    const db = adminDb();
    await db.from("answer_versions").insert({
      session_id: params.sessionId,
      answer_type: params.answerType,
      content: params.content,
      generation_type: params.generationType,
      quick_action: params.quickAction ?? null,
      prompt_version_id: params.promptVersionId ?? null,
      knowledge_chunk_ids: params.knowledgeChunkIds ?? [],
      golden_example_ids: params.goldenExampleIds ?? [],
    });
  } catch (err) {
    console.warn("Failed to log answer version (non-fatal):", err);
  }
}
