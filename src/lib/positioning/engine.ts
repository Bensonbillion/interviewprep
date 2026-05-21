import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { HAIKU } from "@/lib/ai";
import { callClaudeForJson } from "@/lib/ai/json-call";
import { findOrCreateCompanyProfile } from "@/lib/company-research";
import {
  buildCandidateHookPrompt,
  isCompetitivePositioningType,
  type CandidateHookContext,
} from "@/lib/ai/positioning-prompts";
import {
  CandidateHookSchema,
  PositioningBriefSchema,
} from "@/lib/types/schemas";
import { checkAnswerQuality } from "@/lib/ai/quality-check";
import { classifyPositioning } from "./classify";
import {
  researchCompetitiveDynamic,
  type ResearchRequest,
} from "./research";
import { synthesizeSwitcherBrief } from "./switcher";
import type {
  CompanyProfile,
  CompetitiveDynamic,
  InterrogationLine,
  ParsedResume,
  PositioningBrief,
  PositioningClassification,
  RoleType,
  SubstantiatedFact,
} from "@/types";

interface RunOpts {
  /** Optional URL for the target — improves anchor-side marketing scrapes. */
  targetCompanyUrl?: string;
  /** Force a full re-run of the competitive dynamic regardless of TTLs. */
  refresh?: boolean;
}

/**
 * Orchestrate the Positioning Engine for one session.
 *
 *   classify → (cache-check ∥ research ∥ switcher) → synthesize hook →
 *   quality-check → upsert positioning_briefs → return PositioningBrief.
 *
 * Never throws — every internal failure path degrades to a still-valid
 * brief rather than blocking session creation. The /api/create-session
 * call site adds a final .catch(() => null) belt-and-braces, but in
 * practice this function should always resolve.
 */
export async function runPositioningEngine(
  sessionId: string,
  resume: ParsedResume,
  company: CompanyProfile,
  roleType: RoleType,
  opts: RunOpts = {}
): Promise<PositioningBrief> {
  // ── 1. Classify ──────────────────────────────────────────────────
  // Runs first because nothing else can branch without it. The intel
  // lookup it does internally is concurrent with the no-op anchor scrape
  // below if the type turns out to be switcher.
  const classification = await classifyPositioning(resume, company, roleType);

  // ── 2. Branch: competitive vs switcher ──────────────────────────
  if (isCompetitivePositioningType(classification.positioning_type)) {
    return runCompetitivePath({ sessionId, classification, resume, company, roleType, opts });
  }
  return runSwitcherPath({ sessionId, classification, resume, company, roleType });
}

// ─── Competitive path ─────────────────────────────────────────────────────

interface CompetitivePathArgs {
  sessionId: string;
  classification: PositioningClassification;
  resume: ParsedResume;
  company: CompanyProfile;
  roleType: RoleType;
  opts: RunOpts;
}

async function runCompetitivePath(args: CompetitivePathArgs): Promise<PositioningBrief> {
  const { sessionId, classification, resume, company, roleType, opts } = args;

  // Resolve anchor + target company profiles → ids. Both run concurrently.
  const anchorName = classification.anchor_employer;
  if (!anchorName) {
    // Should not happen for competitive types — fall back to switcher path.
    console.warn("[positioning_engine] competitive type with null anchor_employer; degrading", {
      type: classification.positioning_type,
    });
    return runSwitcherPath({ sessionId, classification, resume, company, roleType });
  }

  const [anchorRow, targetRow] = await Promise.all([
    findOrCreateCompanyProfile({ name: anchorName }).catch(() => null),
    findOrCreateCompanyProfile({
      name: company.name,
      url: opts.targetCompanyUrl,
      profileHint: company,
    }).catch(() => null),
  ]);

  // If either company can't be resolved, the FK constraint on
  // competitive_dynamics cannot be satisfied. Degrade to a brief with no
  // competitive_dynamic_id — the orchestrator can still ship the
  // classification + a thin candidate hook.
  if (!anchorRow || !targetRow) {
    console.warn("[positioning_engine] failed to resolve company_profiles row; skipping competitive research", {
      anchorResolved: !!anchorRow,
      targetResolved: !!targetRow,
    });
    return assembleAndStore({
      sessionId,
      classification,
      competitiveDynamicId: null,
      competitiveDynamic: null,
      transferableBridges: [],
      domainGapToClose: null,
      companyHook: await thinHookFallback(classification, company),
    });
  }

  // Run research; this handles its own cache + degradation.
  // (Target interview-intel summary was previously sourced from
  // company_interview_intel, but the live table's schema doesn't match
  // the repo's migrations — see classify.ts header. Passed as empty
  // string; the synthesis prompt already handles the "may be empty" case.)
  const researchReq: ResearchRequest = {
    anchorCompanyId: anchorRow.id,
    targetCompanyId: targetRow.id,
    anchorProfile: anchorRow.profile,
    targetProfile: targetRow.profile,
    positioningType: classification.positioning_type,
    targetCompanyUrl: opts.targetCompanyUrl,
    targetInterviewIntelSummary: "",
    refresh: opts.refresh,
  };
  const dynamic = await researchCompetitiveDynamic(researchReq);

  // Candidate-specific hook (Haiku, never cached).
  const companyHook = await synthesizeCandidateHook({
    classification,
    dynamic,
    resume,
    company,
  });

  return assembleAndStore({
    sessionId,
    classification,
    competitiveDynamicId: dynamic.id || null,
    competitiveDynamic: dynamic.id ? dynamic : null,
    transferableBridges: [],
    domainGapToClose: null,
    companyHook,
  });
}

// ─── Switcher path ────────────────────────────────────────────────────────

interface SwitcherPathArgs {
  sessionId: string;
  classification: PositioningClassification;
  resume: ParsedResume;
  company: CompanyProfile;
  roleType: RoleType;
}

async function runSwitcherPath(args: SwitcherPathArgs): Promise<PositioningBrief> {
  const { sessionId, classification, resume, company, roleType } = args;
  const switcher = await synthesizeSwitcherBrief(classification, resume, company, roleType);

  return assembleAndStore({
    sessionId,
    classification,
    competitiveDynamicId: null,
    competitiveDynamic: null,
    transferableBridges: switcher.transferable_bridges,
    domainGapToClose: switcher.domain_gap_to_close,
    companyHook: switcher.company_hook,
  });
}

// ─── Candidate hook (competitive types only) ──────────────────────────────

interface SynthesizeHookArgs {
  classification: PositioningClassification;
  dynamic: CompetitiveDynamic;
  resume: ParsedResume;
  company: CompanyProfile;
}

async function synthesizeCandidateHook(args: SynthesizeHookArgs): Promise<string> {
  const { classification, dynamic, resume, company } = args;

  const ctx: CandidateHookContext = {
    classification,
    resumeSummary: serializeResume(resume),
    companySummary: serializeCompany(company),
    competitiveRelationship: dynamic.competitive_relationship ?? "",
    targetWedge: dynamic.target_company_wedge ?? "",
    anchorWedge: dynamic.anchor_company_wedge ?? "",
    substantiatedFactsText: serializeFacts(dynamic.substantiated_facts),
    interrogationLinesText: serializeInterrogationLines(dynamic.interrogation_lines),
  };
  const { system, user, maxTokens } = buildCandidateHookPrompt(ctx);

  try {
    const { data } = await callClaudeForJson({
      model: HAIKU,
      system,
      user,
      maxTokens,
      schema: CandidateHookSchema,
      label: "synthesizeCandidateHook",
    });
    // Quality-check the hook; one regen on critical hit.
    return await qualityCheckHook(data.company_hook, ctx);
  } catch (err) {
    console.warn("[positioning_engine] candidate hook synthesis failed; using fallback", {
      err: err instanceof Error ? err.message : String(err),
    });
    return thinHookFallback(classification, company);
  }
}

async function qualityCheckHook(hook: string, ctx: CandidateHookContext): Promise<string> {
  const r = await checkAnswerQuality(hook, "why_this_company");
  const critical = r.issues.filter((i) => i.severity === "critical");
  if (critical.length === 0) return hook;

  const { system, user, maxTokens } = buildCandidateHookPrompt(ctx);
  const correctionPrompt = `\n\nYour previous response tripped these banned-phrase rules; rewrite the hook:\n${critical
    .slice(0, 3)
    .map((c) => `- "${c.pattern}": ${c.fix}`)
    .join("\n")}\nReturn the full JSON object again.`;

  try {
    const { data: retry } = await callClaudeForJson({
      model: HAIKU,
      system,
      user: user + correctionPrompt,
      maxTokens,
      schema: CandidateHookSchema,
      label: "synthesizeCandidateHook.qualityCheckRetry",
    });
    const retryR = await checkAnswerQuality(retry.company_hook, "why_this_company");
    const retryCritical = retryR.issues.filter((i) => i.severity === "critical");
    return retryCritical.length < critical.length ? retry.company_hook : hook;
  } catch {
    return hook;
  }
}

async function thinHookFallback(
  classification: PositioningClassification,
  company: CompanyProfile
): Promise<string> {
  return `Interest in ${company.name} grounded in the candidate's background at ${classification.anchor_employer ?? "their prior roles"} — to be sharpened during prep.`;
}

// ─── Assemble + store ─────────────────────────────────────────────────────

interface AssembleArgs {
  sessionId: string;
  classification: PositioningClassification;
  competitiveDynamicId: string | null;
  competitiveDynamic: CompetitiveDynamic | null;
  transferableBridges: PositioningBrief["transferable_bridges"];
  domainGapToClose: string | null;
  companyHook: string;
}

async function assembleAndStore(args: AssembleArgs): Promise<PositioningBrief> {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();

  const payload = {
    session_id: args.sessionId,
    positioning_type: args.classification.positioning_type,
    anchor_employer: args.classification.anchor_employer,
    anchor_employer_role: args.classification.anchor_employer_role,
    classification_reasoning: args.classification.classification_reasoning,
    classification_confidence: args.classification.classification_confidence,
    classification_signal: args.classification.classification_signal,
    competitive_dynamic_id: args.competitiveDynamicId,
    transferable_bridges: args.transferableBridges,
    domain_gap_to_close: args.domainGapToClose,
    company_hook: args.companyHook,
    generated_at: nowIso,
  };

  const { data: row, error } = await db
    .from("positioning_briefs")
    .upsert(payload, { onConflict: "session_id" })
    .select("*")
    .single();

  if (error || !row) {
    console.error("[positioning_engine] positioning_briefs upsert failed", {
      err: error?.message,
      sessionId: args.sessionId,
    });
    // Return an in-memory brief so the route can still respond. The
    // create-session caller treats this as the best-available shape.
    const fallback: PositioningBrief = {
      id: "",
      session_id: args.sessionId,
      positioning_type: args.classification.positioning_type,
      anchor_employer: args.classification.anchor_employer,
      anchor_employer_role: args.classification.anchor_employer_role,
      classification_reasoning: args.classification.classification_reasoning,
      classification_confidence: args.classification.classification_confidence,
      classification_signal: args.classification.classification_signal,
      competitive_dynamic_id: args.competitiveDynamicId,
      competitive_dynamic: args.competitiveDynamic ?? undefined,
      transferable_bridges: args.transferableBridges,
      domain_gap_to_close: args.domainGapToClose,
      company_hook: args.companyHook,
      generated_at: nowIso,
    };
    return fallback;
  }

  const brief: PositioningBrief = {
    id: row.id as string,
    session_id: row.session_id as string,
    positioning_type: row.positioning_type,
    anchor_employer: row.anchor_employer,
    anchor_employer_role: row.anchor_employer_role,
    classification_reasoning: row.classification_reasoning,
    classification_confidence: Number(row.classification_confidence),
    classification_signal: row.classification_signal,
    competitive_dynamic_id: row.competitive_dynamic_id,
    competitive_dynamic: args.competitiveDynamic ?? undefined,
    transferable_bridges: (row.transferable_bridges ?? []) as PositioningBrief["transferable_bridges"],
    domain_gap_to_close: row.domain_gap_to_close,
    company_hook: row.company_hook,
    generated_at: row.generated_at,
  };

  // Validate against the schema before returning. Validation failure is
  // logged but does not throw — degraded data shipped is still better
  // than blocking the session.
  const parsed = PositioningBriefSchema.safeParse(brief);
  if (!parsed.success) {
    console.warn("[positioning_engine] brief failed PositioningBriefSchema validation", {
      issues: parsed.error.issues.slice(0, 5),
    });
  }

  return brief;
}

// ─── Serialization helpers ────────────────────────────────────────────────

function serializeResume(r: ParsedResume): string {
  const roles = (r.roles ?? [])
    .map((role) => {
      const range = `${role.startDate ?? "?"}–${role.endDate ?? "present"}`;
      const topBullets = (role.bullets ?? [])
        .slice(0, 3)
        .map((b) => `    • ${b.originalText}`)
        .join("\n");
      return `- ${role.title ?? "Role"} at ${role.company ?? "Company"} (${range})\n${topBullets}`;
    })
    .join("\n");
  return [
    `Background type: ${r.backgroundType}`,
    `Narrative: ${r.narrativeSummary}`,
    "Roles:",
    roles || "(no professional roles)",
  ].join("\n");
}

function serializeCompany(c: CompanyProfile): string {
  return [
    `Name: ${c.name}`,
    `Product: ${c.productDescription}`,
    `Sales motion: ${c.salesMotion}`,
    `Stage: ${c.stage}`,
    `ICP industries: ${(c.icp?.industries ?? []).join(", ") || "unknown"}`,
    `Buyer personas: ${(c.icp?.buyerPersonas ?? []).join(", ") || "unknown"}`,
  ].join("\n");
}

function serializeFacts(facts: SubstantiatedFact[]): string {
  if (facts.length === 0) return "";
  return facts
    .map((f) => `- (${f.about}) ${f.fact}`)
    .join("\n");
}

function serializeInterrogationLines(lines: InterrogationLine[]): string {
  if (lines.length === 0) return "";
  return lines
    .map((l) => `- Q: ${l.question}\n  STAR: ${l.star_slot_hint}`)
    .join("\n");
}
