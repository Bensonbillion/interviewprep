/**
 * RAG context retrieval for generation pipeline.
 *
 * Assembly order (per spec):
 *  1. Voice profile — BASE_SYSTEM (in prompts.ts) + DB voice rules
 *  2. Seniority context
 *  3. Job listing signals
 *  4. Question-specific context: detection technique, probe questions,
 *     authenticity markers ("MUST include"), red flag patterns ("NEVER include")
 *  5. Golden example (good version reference)
 *  6. Red flag example (explicit anti-reference: "DO NOT generate this")
 *  7. Answer-type-specific structural instructions  ← USER message (in prompts.ts)
 *  8. Voice patterns for natural language selection
 *  9. Candidate resume/experience data             ← USER message (in prompts.ts)
 * 10. Company/role context                         ← USER message (in prompts.ts)
 *
 * Items 1–6, 8 are assembled here into the SYSTEM prompt via assembleSystemPrompt().
 * Items 7, 9, 10 remain in the USER message (built by individual prompt builders).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { generateEmbedding } from "@/lib/embeddings";
import { fetchCompanyEnrichment, formatCompanyEnrichmentSection } from "@/lib/feedback/company-enrichment";
import type { AnswerType, RoleType, InterviewStage } from "@/types";

function adminDb() {
  return createAdminClient();
}

export interface ProbeDepthQuestions {
  level_1?: string;
  level_2?: string;
  level_3?: string;
  trap_question?: string;
}

export interface RagContext {
  // ── Named sections (assembled in order by assembleSystemPrompt) ──────────────

  /** Item 1 extension: DB voice profile description + style rules. */
  sectionVoiceRules: string | null;
  /**
   * Item 4: Question-specific context — detection technique, probe sequence,
   * authenticity markers ("MUST include"), and red flag patterns ("NEVER include").
   * Positioned early so it shapes how the model interprets structural instructions.
   */
  sectionQuestionContext: string | null;
  /** Item 5: Good version golden example with authenticity markers. */
  sectionGoldenExample: string | null;
  /** Item 6: Red flag / anti-example with explicit "DO NOT generate" framing. */
  sectionRedFlagExample: string | null;
  /** Item 8: Structural language patterns (voice patterns from DB). */
  sectionVoicePatterns: string | null;
  /** Supporting knowledge chunks (relevant background for the answer type). */
  sectionKnowledge: string | null;
  /** Company-specific intelligence from playbook (interview patterns, common questions). */
  sectionCompanyIntel: string | null;

  // ── Meta ─────────────────────────────────────────────────────────────────────

  /** Override system prompt if an active prompt version exists for this answer type. */
  activePromptText: string | null;
  /** The active prompt version ID (for logging). */
  activePromptVersionId: string | null;
  /** IDs of knowledge chunks retrieved (for logging). */
  knowledgeChunkIds: string[];
  /** IDs of golden examples retrieved (for logging). */
  goldenExampleIds: string[];
  /** Probe depth questions (forwarded for potential use by caller). */
  probeDepthQuestions: ProbeDepthQuestions | null;
  /** Detection technique name (forwarded for potential use by caller). */
  detectionTechnique: string | null;
}

/**
 * Assemble the final system prompt in the correct order.
 *
 * @param baseSystem  BASE_SYSTEM from prompts.ts (voice profile rules, item 1)
 * @param rag         Fetched RAG context
 * @param ctx         Caller-computed seniority and job listing context (items 2–3)
 */
export function assembleSystemPrompt(
  baseSystem: string,
  rag: RagContext,
  ctx: {
    seniorityText?: string | null;     // item 2
    jobListingContext?: string | null; // item 3
  } = {}
): string {
  const parts: string[] = [baseSystem];

  // 1 (extension). DB voice profile + style rules
  if (rag.sectionVoiceRules) parts.push(rag.sectionVoiceRules);

  // 2. Seniority context
  if (ctx.seniorityText) parts.push(ctx.seniorityText);

  // 3. Job listing signals
  if (ctx.jobListingContext) parts.push(ctx.jobListingContext);

  // 4. Question-specific: detection technique + probes + authenticity/red-flag rules
  if (rag.sectionQuestionContext) parts.push(rag.sectionQuestionContext);

  // 5. Golden example — good version reference
  if (rag.sectionGoldenExample) parts.push(rag.sectionGoldenExample);

  // 6. Red flag anti-example
  if (rag.sectionRedFlagExample) parts.push(rag.sectionRedFlagExample);

  // 7. Structural instructions → USER message (skip here)

  // 8. Voice patterns
  if (rag.sectionVoicePatterns) parts.push(rag.sectionVoicePatterns);

  // Supporting knowledge
  if (rag.sectionKnowledge) parts.push(rag.sectionKnowledge);

  // Company-specific intelligence
  if (rag.sectionCompanyIntel) parts.push(rag.sectionCompanyIntel);

  return parts.join("\n\n---\n\n");
}

/**
 * Retrieve all RAG context needed for a single generation.
 * Designed to run in parallel where possible.
 */
export async function fetchRagContext(
  answerType: AnswerType,
  queryText: string,
  roleType?: RoleType,
  stage?: InterviewStage,
  companyName?: string
): Promise<RagContext> {
  const EMPTY: RagContext = {
    sectionVoiceRules: null,
    sectionQuestionContext: null,
    sectionGoldenExample: null,
    sectionRedFlagExample: null,
    sectionVoicePatterns: null,
    sectionKnowledge: null,
    sectionCompanyIntel: null,
    activePromptText: null,
    activePromptVersionId: null,
    knowledgeChunkIds: [],
    goldenExampleIds: [],
    probeDepthQuestions: null,
    detectionTechnique: null,
  };

  try {
    const db = adminDb();

    // ── Parallel DB lookups ────────────────────────────────────────────────────
    const [voiceRes, promptRes, queryEmbedding, questionBankRes, voicePatternsRes, companyEnrichment] = await Promise.all([
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
      db.from("voice_patterns")
        .select("pattern_name, pattern_type, examples, usage_context, frequency_guidance, bad_alternative")
        .eq("is_active", true)
        .order("pattern_type"),
      companyName ? fetchCompanyEnrichment(companyName).catch(() => null) : Promise.resolve(null),
    ]);

    const voicePatterns = (voicePatternsRes.data ?? []) as Array<{
      pattern_name: string;
      pattern_type: string;
      examples: string[];
      usage_context: string | null;
      frequency_guidance: string | null;
      bad_alternative: string | null;
    }>;

    const voice = voiceRes.data as { id: string; description: string; tone_keywords: string[] } | null;
    const activePrompt = promptRes.data as { id: string; prompt_text: string } | null;
    const questionBankRow = questionBankRes.data as {
      likely_followups: string[] | null;
      probe_depth_questions: ProbeDepthQuestions | null;
      detection_technique: string | null;
      hidden_evaluation: string | null;
    } | null;

    // ── Sequential: detection pattern needs technique name from question_bank ──
    const detectionTechniqueValue = (questionBankRow as { detection_technique?: string } | null)?.detection_technique;
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

    // ── Style rules (needs voice profile ID) ──────────────────────────────────
    let styleRules: Array<{ rule_type: string; rule_text: string; replacement: string | null }> = [];
    if (voice?.id) {
      const rulesRes = await db
        .from("style_rules")
        .select("rule_type, rule_text, replacement")
        .eq("voice_id", voice.id)
        .eq("is_active", true);
      styleRules = (rulesRes.data ?? []) as typeof styleRules;
    }

    // ── RAG retrieval via pgvector ─────────────────────────────────────────────
    let knowledgeChunks: Array<{ id: string; content: string }> = [];
    let goldenExamples: Array<{
      id: string;
      question_text: string;
      answer_text: string;
      framework: string | null;
      authenticity_markers: string[] | null;
      red_flag_version: string | null;
      red_flag_why: string | null;
    }> = [];

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

    // ── Build section 1 (voice rules): voice profile + style rules ────────────
    const voiceParts: string[] = [];

    if (voice?.description) {
      voiceParts.push(`VOICE & TONE:\n${voice.description}`);
      if ((voice.tone_keywords ?? []).length > 0) {
        voiceParts.push(`Tone keywords: ${voice.tone_keywords.join(", ")}`);
      }
    }

    const bannedPhrases = styleRules.filter((r) => r.rule_type === "banned_phrase");
    const replacements  = styleRules.filter((r) => r.rule_type === "replacement");
    const instructions  = styleRules.filter((r) => r.rule_type === "instruction");

    if (bannedPhrases.length > 0) {
      voiceParts.push(
        `BANNED PHRASES (never use these):\n${bannedPhrases.map((r) => `- "${r.rule_text}"${r.replacement ? ` → use: ${r.replacement}` : ""}`).join("\n")}`
      );
    }
    if (replacements.length > 0) {
      voiceParts.push(
        `WORD REPLACEMENTS:\n${replacements.map((r) => `- "${r.rule_text}" → "${r.replacement ?? "avoid"}"`).join("\n")}`
      );
    }
    if (instructions.length > 0) {
      voiceParts.push(
        `STYLE INSTRUCTIONS:\n${instructions.map((r) => `- ${r.rule_text}`).join("\n")}`
      );
    }

    const sectionVoiceRules = voiceParts.length > 0 ? voiceParts.join("\n\n") : null;

    // ── Build section 4 (question context): detection + probes + must/never ───
    let sectionQuestionContext: string | null = null;
    if (questionBankRow || goldenExamples.length > 0) {
      const qcParts: string[] = [];

      // 4a. The interviewer is testing
      if (questionBankRow?.detection_technique) {
        const techniqueDescriptions: Record<string, string> = {
          detail_drill:    "drilling for granular specifics — vague answers will be pushed on immediately",
          obstacle_probe:  "looking for what went wrong or what was genuinely hard",
          learning_loop:   "testing whether the candidate extracts real lessons vs. just claiming growth",
          reverse_order:   "may ask you to replay the story in reverse to test for fabrication",
          ownership_test:  "specifically separating YOUR contribution from the team's",
          coachability_test: "watching how you receive and implement feedback in real time",
        };
        const desc = techniqueDescriptions[questionBankRow.detection_technique];
        qcParts.push(
          `THE INTERVIEWER IS TESTING: ${questionBankRow.detection_technique}${desc ? ` — ${desc}` : ""}`
        );

        if (detectionPattern?.what_interviewer_is_testing) {
          qcParts.push(`WHAT THE TECHNIQUE ACTUALLY TESTS: ${detectionPattern.what_interviewer_is_testing}`);
        }
        if (detectionPattern?.green_flag_response && detectionPattern?.red_flag_response) {
          qcParts.push(
            `GREEN FLAG (aim for this): ${detectionPattern.green_flag_response}\nRED FLAG (avoid this): ${detectionPattern.red_flag_response}`
          );
        }
        if (detectionPattern?.coaching_note) {
          qcParts.push(`COACHING NOTE FOR THIS TECHNIQUE: ${detectionPattern.coaching_note}`);
        }
      }

      if (questionBankRow?.hidden_evaluation) {
        qcParts.push(`WHAT THE INTERVIEWER IS ACTUALLY EVALUATING: ${questionBankRow.hidden_evaluation}`);
      }

      // 4b. Likely follow-up probes
      if (questionBankRow?.likely_followups?.length) {
        qcParts.push(
          `LIKELY FOLLOW-UP PROBES:\n${questionBankRow.likely_followups.map((q) => `- "${q}"`).join("\n")}`
        );
      }
      if (questionBankRow?.probe_depth_questions) {
        const pdq = questionBankRow.probe_depth_questions;
        const probeLines = [
          pdq.level_1 && `Level 1 — "Tell me more": "${pdq.level_1}"`,
          pdq.level_2 && `Level 2 — Specificity drill: "${pdq.level_2}"`,
          pdq.level_3 && `Level 3 — Process/reasoning: "${pdq.level_3}"`,
          pdq.trap_question && `Trap question: "${pdq.trap_question}"`,
        ].filter(Boolean);
        if (probeLines.length > 0) {
          qcParts.push(
            `PROBE SEQUENCE THIS ANSWER MUST SURVIVE:\n${probeLines.join("\n")}\nStructure the answer so each probe already has a specific detail to reference.`
          );
        }
      }

      // 4c. Authenticity markers — "Your answer MUST include"
      const allAuthMarkers = goldenExamples
        .flatMap((ex) => ex.authenticity_markers ?? [])
        .filter(Boolean);
      if (allAuthMarkers.length > 0) {
        qcParts.push(
          `YOUR ANSWER MUST INCLUDE (authenticity markers that make this answer survive probing):\n${allAuthMarkers.map((m) => `- ${m}`).join("\n")}`
        );
      }

      // 4d. Red flag patterns — "Your answer must NEVER include"
      const redFlagWhys = goldenExamples
        .map((ex) => ex.red_flag_why)
        .filter(Boolean) as string[];
      if (redFlagWhys.length > 0) {
        qcParts.push(
          `YOUR ANSWER MUST NEVER INCLUDE (fabrication / weakness signals):\n${redFlagWhys.map((w) => `- ${w}`).join("\n")}`
        );
      }

      if (qcParts.length > 0) sectionQuestionContext = qcParts.join("\n\n");
    }

    // ── Build section 5 (golden example — good version only) ──────────────────
    let sectionGoldenExample: string | null = null;
    const examplesWithAnswer = goldenExamples.filter((ex) => ex.answer_text);
    if (examplesWithAnswer.length > 0) {
      const blocks = examplesWithAnswer.map((ex, i) => {
        const lines: string[] = [];
        lines.push(`GOLDEN EXAMPLE ${i + 1}${ex.framework ? ` (${ex.framework})` : ""}:`);
        lines.push(`Q: ${ex.question_text}`);
        lines.push(`A: ${ex.answer_text.slice(0, 700)}`);
        if (ex.authenticity_markers?.length) {
          lines.push(`WHAT MAKES THIS AUTHENTIC: ${ex.authenticity_markers.join(", ")}`);
        }
        return lines.join("\n");
      });
      sectionGoldenExample = `REFERENCE ANSWER — match the depth and authenticity of this example:\n\n${blocks.join("\n\n")}`;
    }

    // ── Build section 6 (red flag anti-example) ───────────────────────────────
    let sectionRedFlagExample: string | null = null;
    const examplesWithRedFlag = goldenExamples.filter((ex) => ex.red_flag_version);
    if (examplesWithRedFlag.length > 0) {
      const blocks = examplesWithRedFlag.map((ex, i) => {
        const lines: string[] = [];
        lines.push(`ANTI-EXAMPLE ${i + 1} — DO NOT GENERATE ANYTHING RESEMBLING THIS:`);
        lines.push(`"${ex.red_flag_version!.slice(0, 400)}"`);
        if (ex.red_flag_why) {
          lines.push(`WHY THIS FAILS: ${ex.red_flag_why}`);
        }
        return lines.join("\n");
      });
      sectionRedFlagExample = `RED FLAG CONTRAST — the following answer would immediately signal a weak or fabricated candidate. Generate the opposite:\n\n${blocks.join("\n\n")}`;
    }

    // ── Build section 8 (voice patterns) ─────────────────────────────────────
    let sectionVoicePatterns: string | null = null;
    if (voicePatterns.length > 0) {
      const patternsByType: Record<string, typeof voicePatterns> = {};
      for (const p of voicePatterns) {
        if (!patternsByType[p.pattern_type]) patternsByType[p.pattern_type] = [];
        patternsByType[p.pattern_type].push(p);
      }
      const typeOrder = ["opener", "transition", "vulnerability", "closer", "recovery", "cognitive_marker", "emphasis"];
      const patternBlocks = typeOrder
        .filter((t) => patternsByType[t]?.length)
        .map((t) =>
          patternsByType[t].map((p) => {
            const lines = [`${p.pattern_type.toUpperCase()} — ${p.pattern_name}:`];
            if (p.usage_context) lines.push(`When: ${p.usage_context}`);
            if (p.frequency_guidance) lines.push(`How often: ${p.frequency_guidance}`);
            lines.push(`Examples: ${p.examples.slice(0, 4).map((e) => `"${e}"`).join(" | ")}`);
            if (p.bad_alternative) lines.push(`Never use instead: ${p.bad_alternative}`);
            return lines.join("\n");
          }).join("\n")
        );
      if (patternBlocks.length > 0) {
        sectionVoicePatterns = `VOICE PATTERNS — use these structural phrases, never their AI alternatives:\n\n${patternBlocks.join("\n\n")}`;
      }
    }

    // ── Build knowledge section ────────────────────────────────────────────────
    let sectionKnowledge: string | null = null;
    if (knowledgeChunks.length > 0) {
      sectionKnowledge = `RELEVANT KNOWLEDGE:\n${knowledgeChunks.map((c, i) => `[${i + 1}] ${c.content.slice(0, 400)}`).join("\n\n")}`;
    }

    // ── Build company intelligence section ───────────────────────────────────
    const sectionCompanyIntel = companyEnrichment
      ? formatCompanyEnrichmentSection(companyEnrichment)
      : null;

    return {
      sectionVoiceRules,
      sectionQuestionContext,
      sectionGoldenExample,
      sectionRedFlagExample,
      sectionVoicePatterns,
      sectionKnowledge,
      sectionCompanyIntel,
      activePromptText:      activePrompt?.prompt_text ?? null,
      activePromptVersionId: activePrompt?.id ?? null,
      knowledgeChunkIds:     knowledgeChunks.map((c) => c.id),
      goldenExampleIds:      goldenExamples.map((e) => e.id),
      probeDepthQuestions:   questionBankRow?.probe_depth_questions ?? null,
      detectionTechnique:    questionBankRow?.detection_technique ?? null,
    };
  } catch (err) {
    // RAG errors are non-fatal — generation continues without enrichment
    console.warn("RAG context fetch failed (non-fatal):", err);
    return EMPTY;
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
      session_id:          params.sessionId,
      answer_type:         params.answerType,
      content:             params.content,
      generation_type:     params.generationType,
      quick_action:        params.quickAction ?? null,
      prompt_version_id:   params.promptVersionId ?? null,
      knowledge_chunk_ids: params.knowledgeChunkIds ?? [],
      golden_example_ids:  params.goldenExampleIds ?? [],
    });
  } catch (err) {
    console.warn("Failed to log answer version (non-fatal):", err);
  }
}
