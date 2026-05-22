import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SONNET } from "@/lib/ai";
import { callClaudeForJson } from "@/lib/ai/json-call";
import {
  buildNarrativeSpinePrompt,
  type NarrativeSpineContext,
} from "@/lib/ai/positioning-prompts";
import { NarrativeSpineSynthesisSchema } from "@/lib/types/schemas";
import { checkAnswerQuality } from "@/lib/ai/quality-check";
import { loadPositioningBriefWithDynamic } from "@/lib/positioning/load";
import { loadCapturedInsightsForSession } from "@/lib/insight/load";
import type {
  CapturedInsight,
  CompetitiveDynamic,
  NarrativeSpine,
  ParsedResume,
  PositioningBrief,
  PositioningType,
} from "@/types";
import type { z } from "zod";

type SynthesisOutput = z.infer<typeof NarrativeSpineSynthesisSchema>;

interface BuildOpts {
  /** Optional resume override — by default we read session_data.resume from prep_sessions. */
  resume?: ParsedResume;
}

/**
 * Build the narrative spine for a session.
 *
 * Process:
 *   1. Load positioning brief + dynamic (if competitive) + captured insights + resume.
 *   2. One Claude Sonnet call via buildNarrativeSpinePrompt — produces
 *      the full spine JSON with proof points already STAR-gated.
 *   3. Validate against NarrativeSpineSynthesisSchema; callClaudeForJson
 *      retries once internally on parse/validation failure.
 *   4. On a second failure: degrade, do not throw. Build a minimal spine
 *      from the brief's company_hook + resume narrative, with
 *      narrative_risks naming the degradation. Kit generation must never
 *      block on a failed spine.
 *   5. Quality-check pass on the generated text fields (banned-phrase
 *      regen via correctionPrompt).
 *   6. Idempotent upsert on session_id — re-running cleanly replaces.
 *
 * Throws only on truly catastrophic conditions (no session row found).
 */
export async function buildNarrativeSpine(
  sessionId: string,
  opts: BuildOpts = {}
): Promise<NarrativeSpine> {
  const db = createAdminClient();

  // ── 1. Gather inputs ──────────────────────────────────────────────
  const { data: sessionRow } = await db
    .from("prep_sessions")
    .select("session_data, insight_interview_status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!sessionRow) {
    throw new Error(`buildNarrativeSpine: session ${sessionId} not found`);
  }

  const sessionData = (sessionRow.session_data ?? {}) as { resume?: ParsedResume; company?: { name?: string }; targetRole?: string };
  const resume = opts.resume ?? sessionData.resume;
  if (!resume) {
    throw new Error(`buildNarrativeSpine: session ${sessionId} has no resume in session_data`);
  }
  const targetCompany = sessionData.company?.name ?? "the target company";
  const insightStatus = (sessionRow.insight_interview_status as string | null) ?? "pending";

  const briefAndDynamic = await loadPositioningBriefWithDynamic(sessionId);
  const captured = await loadCapturedInsightsForSession(sessionId);

  const positioningType: PositioningType | null = briefAndDynamic?.brief.positioning_type ?? null;

  // ── 2. Build prompt context ──────────────────────────────────────
  // For sessions with no brief, we still build a degraded spine — the
  // resume alone yields some proof points; narrative_risks records the
  // missing positioning data honestly.
  const promptCtx = assembleSpineContext({
    brief: briefAndDynamic?.brief ?? null,
    dynamic: briefAndDynamic?.dynamic ?? null,
    captured,
    resume,
    targetCompany,
  });

  // ── 3. Sonnet synthesis (with internal retry on parse/zod failure) ──
  // If no brief exists at all, skip the Sonnet call and degrade — there's
  // nothing meaningful to synthesize.
  let synth: SynthesisOutput;
  let degraded = false;
  let degradeReason: string | null = null;

  if (!briefAndDynamic) {
    degraded = true;
    degradeReason = "No positioning brief for this session — spine built from resume alone.";
    synth = minimalSpineFromResume(resume, null);
  } else {
    const { system, user, maxTokens } = buildNarrativeSpinePrompt(promptCtx);
    try {
      const { data } = await callClaudeForJson({
        model: SONNET,
        system,
        user,
        maxTokens,
        schema: NarrativeSpineSynthesisSchema,
        label: "buildNarrativeSpine",
      });
      synth = data;
    } catch (err) {
      console.error("[spine] synthesis failed; degrading to minimal", {
        sessionId,
        err: err instanceof Error ? err.message : String(err),
      });
      degraded = true;
      degradeReason = `Synthesis failed (${err instanceof Error ? err.message : "unknown"}); spine built from positioning brief + resume.`;
      synth = minimalSpineFromResume(resume, briefAndDynamic.brief);
    }
  }

  // ── 4. Quality-check pass on generated text ───────────────────────
  if (!degraded) {
    synth = await applyQualityCheckPass(synth, promptCtx);
  }

  // ── 5. Upsert ────────────────────────────────────────────────────
  const built_from: NarrativeSpine["built_from"] = {
    has_positioning_brief: !!briefAndDynamic,
    captured_insight_count: captured.length,
    positioning_type: positioningType,
    insight_interview_status: insightStatus,
  };

  const payload = {
    session_id: sessionId,
    core_thesis: synth.core_thesis,
    signature_proof_points: synth.signature_proof_points,
    competitive_truths: synth.competitive_truths,
    company_hook: synth.company_hook,
    positioning_frame: synth.positioning_frame,
    narrative_risks: degraded && degradeReason
      ? [degradeReason, ...synth.narrative_risks]
      : synth.narrative_risks,
    built_from,
    generated_at: new Date().toISOString(),
  };

  const { data: row, error: upsertErr } = await db
    .from("narrative_spines")
    .upsert(payload, { onConflict: "session_id" })
    .select("*")
    .single();

  if (upsertErr || !row) {
    console.error("[spine] upsert failed:", upsertErr?.message);
    // Return in-memory spine so callers can still proceed.
    return {
      id: "",
      session_id: sessionId,
      core_thesis: payload.core_thesis,
      signature_proof_points: payload.signature_proof_points,
      competitive_truths: payload.competitive_truths,
      company_hook: payload.company_hook,
      positioning_frame: payload.positioning_frame,
      narrative_risks: payload.narrative_risks,
      built_from: payload.built_from,
      generated_at: payload.generated_at,
    };
  }

  return row as NarrativeSpine;
}

// ─── Context assembly ────────────────────────────────────────────────────

interface AssembleArgs {
  brief: PositioningBrief | null;
  dynamic: CompetitiveDynamic | null;
  captured: CapturedInsight[];
  resume: ParsedResume;
  targetCompany: string;
}

function assembleSpineContext(a: AssembleArgs): NarrativeSpineContext {
  const positioningType: PositioningType = a.brief?.positioning_type ?? "early_career";
  const isCompetitive =
    positioningType === "direct_competitor" ||
    positioningType === "adjacent_player" ||
    positioningType === "ecosystem";

  const positioningBriefBlock = buildPositioningBriefBlock(a.brief, a.dynamic);
  const substantiatedFactsBlock = isCompetitive
    ? buildSubstantiatedFactsBlock(a.dynamic)
    : "";
  const capturedInsightsBlock = isCompetitive
    ? buildCapturedInsightsBlock(a.captured)
    : "";
  const resumeBlock = buildResumeBlock(a.resume);

  return {
    positioningType,
    anchorEmployer: a.brief?.anchor_employer ?? null,
    anchorRole: a.brief?.anchor_employer_role ?? null,
    positioningBriefBlock,
    substantiatedFactsBlock,
    capturedInsightsBlock,
    resumeBlock,
    targetCompany: a.targetCompany,
  };
}

function buildPositioningBriefBlock(
  brief: PositioningBrief | null,
  dynamic: CompetitiveDynamic | null
): string {
  if (!brief) return "(no positioning brief — spine will degrade gracefully)";

  const parts: string[] = [
    `company_hook: ${brief.company_hook ?? "(none)"}`,
    `classification_reasoning: ${brief.classification_reasoning}`,
    `classification_confidence: ${brief.classification_confidence}`,
  ];

  // Switcher specifics
  if (brief.transferable_bridges?.length) {
    parts.push("transferable_bridges:");
    for (const b of brief.transferable_bridges) {
      parts.push(`  - ${b.from} → ${b.to}: ${b.why_it_maps}`);
    }
  }
  if (brief.domain_gap_to_close) {
    parts.push(`domain_gap_to_close: ${brief.domain_gap_to_close}`);
  }

  // Competitive specifics (from dynamic)
  if (dynamic) {
    if (dynamic.competitive_relationship) {
      parts.push(`competitive_relationship: ${dynamic.competitive_relationship}`);
    }
    if (dynamic.target_company_wedge) {
      parts.push(`target_company_wedge: ${dynamic.target_company_wedge}`);
    }
    if (dynamic.anchor_company_wedge) {
      parts.push(`anchor_company_wedge: ${dynamic.anchor_company_wedge}`);
    }
    if (dynamic.shared_buyers?.length) {
      parts.push(`shared_buyers: ${dynamic.shared_buyers.join(", ")}`);
    }
  }

  return parts.join("\n");
}

function buildSubstantiatedFactsBlock(dynamic: CompetitiveDynamic | null): string {
  if (!dynamic?.substantiated_facts?.length) return "";
  return dynamic.substantiated_facts
    .map((f, i) => `[${i + 1}] (${f.about}, confidence ${f.confidence}) ${f.fact}`)
    .join("\n");
}

function buildCapturedInsightsBlock(captured: CapturedInsight[]): string {
  if (captured.length === 0) return "";
  return captured
    .map((c, i) => {
      const lines: string[] = [`── Captured answer #${i + 1} ──`];
      lines.push(`Question: ${c.interrogation_question}`);
      lines.push(`STAR rubric for this question: ${c.star_slot_hint}`);
      lines.push(`Quality flag from evaluation: ${c.answer_quality}`);
      lines.push(`Candidate's answer:`);
      lines.push(c.final_answer ?? c.raw_answer ?? "(empty)");
      return lines.join("\n");
    })
    .join("\n\n");
}

function buildResumeBlock(resume: ParsedResume): string {
  const roles = (resume.roles ?? [])
    .map((r) => {
      const range = `${r.startDate ?? "?"}–${r.endDate ?? "present"}`;
      const top = (r.bullets ?? [])
        .slice(0, 4)
        .map((b) => `    • ${b.originalText}`)
        .join("\n");
      return `- ${r.title ?? "Role"} at ${r.company ?? "Company"} (${range})\n${top}`;
    })
    .join("\n");
  return [
    `Background type: ${resume.backgroundType}`,
    `Narrative: ${resume.narrativeSummary}`,
    "Roles:",
    roles || "(no roles)",
  ].join("\n");
}

// ─── Degraded minimal spine ──────────────────────────────────────────────
// Used when Sonnet synthesis fails (or no brief exists). Produces a
// schema-valid spine from what we have — the company_hook (if any), a
// thin proof point from the resume narrative, and an honest narrative_risk
// explaining the degradation. The kit still ships.

function minimalSpineFromResume(
  resume: ParsedResume,
  brief: PositioningBrief | null
): SynthesisOutput {
  const positioningType: PositioningType = brief?.positioning_type ?? "early_career";
  const companyHook = brief?.company_hook ?? null;

  // A single resume-derived proof point, deliberately marked
  // star_complete: false so downstream answer generation knows it's a
  // weak input and falls back to its current behavior.
  const proof = {
    label: "Background sketch (degraded fallback)",
    situation: "Background sketch derived from the resume — no Insight Interview answers available.",
    task: "",
    action: "",
    result: "",
    star_complete: false,
    source: "resume" as const,
    gaps: ["spine synthesis degraded — proof points were not extracted; the resume narrative is available but not STAR-gated"],
  };

  return {
    core_thesis: resume.narrativeSummary || "Candidate background; spine synthesis degraded.",
    signature_proof_points: [proof],
    competitive_truths: [],
    company_hook: companyHook,
    positioning_frame: {
      type: positioningType,
      frame_statement: "Spine generation degraded — answer generation will fall back to per-card behavior.",
    },
    narrative_risks: [
      "Spine was generated via the degraded fallback path; downstream answer generation should not lean on the spine for this session.",
    ],
  };
}

// ─── Quality-check pass ─────────────────────────────────────────────────

async function applyQualityCheckPass(
  synth: SynthesisOutput,
  promptCtx: NarrativeSpineContext
): Promise<SynthesisOutput> {
  const corrections = await collectCriticalIssues(synth);
  if (corrections.length === 0) return synth;

  const { system, user, maxTokens } = buildNarrativeSpinePrompt(promptCtx);
  const correctionPrompt = `\n\nYour previous response tripped these banned-phrase rules; rewrite the affected fields:\n${corrections
    .slice(0, 8)
    .map((c) => `- "${c.pattern}" in ${c.location}: ${c.fix}`)
    .join("\n")}\nReturn the full JSON object again with the offending phrasing removed.`;

  try {
    const { data: retry } = await callClaudeForJson({
      model: SONNET,
      system,
      user: user + correctionPrompt,
      maxTokens,
      schema: NarrativeSpineSynthesisSchema,
      label: "buildNarrativeSpine.qualityCheckRetry",
    });
    const retryCritical = await collectCriticalIssues(retry);
    return retryCritical.length < corrections.length ? retry : synth;
  } catch {
    return synth;
  }
}

async function collectCriticalIssues(synth: SynthesisOutput) {
  const fields: { text: string; location: string }[] = [
    { text: synth.core_thesis, location: "core_thesis" },
    ...(synth.company_hook ? [{ text: synth.company_hook, location: "company_hook" }] : []),
    ...synth.signature_proof_points.flatMap((p, i) => [
      { text: p.label, location: `signature_proof_points[${i}].label` },
      { text: p.situation, location: `signature_proof_points[${i}].situation` },
      { text: p.task, location: `signature_proof_points[${i}].task` },
      { text: p.action, location: `signature_proof_points[${i}].action` },
      { text: p.result, location: `signature_proof_points[${i}].result` },
    ]),
    ...synth.competitive_truths.map((t, i) => ({
      text: t.truth,
      location: `competitive_truths[${i}].truth`,
    })),
    ...synth.narrative_risks.map((r, i) => ({ text: r, location: `narrative_risks[${i}]` })),
  ].filter((f) => f.text && f.text.trim().length > 0);

  const all = await Promise.all(
    fields.map(async (f) => {
      // checkAnswerQuality takes an AnswerType but treats it as a tag for
      // the rule set; "company_brief" is the closest neutral baseline.
      const r = checkAnswerQuality(f.text, "company_brief");
      return r.issues
        .filter((i) => i.severity === "critical")
        .map((i) => ({ pattern: i.pattern, location: f.location, fix: i.fix }));
    })
  );
  return all.flat();
}
