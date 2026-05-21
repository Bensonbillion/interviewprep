import "server-only";
import { HAIKU } from "@/lib/ai";
import { callClaudeForJson } from "@/lib/ai/json-call";
import {
  buildSwitcherBriefPrompt,
  type SwitcherBriefContext,
} from "@/lib/ai/positioning-prompts";
import { SwitcherBriefSchema } from "@/lib/types/schemas";
import { checkAnswerQuality } from "@/lib/ai/quality-check";
import type {
  CompanyProfile,
  ParsedResume,
  PositioningClassification,
  RoleType,
  TransferableBridge,
} from "@/types";

export interface SwitcherBrief {
  transferable_bridges: TransferableBridge[];
  domain_gap_to_close: string;
  company_hook: string;
}

/**
 * Synthesize the brief for switcher / early-career types. One Haiku call
 * with the switcher prompt. Quality-checked (caller-orchestrated regen).
 * Never throws — degrades to an empty-ish brief that the orchestrator
 * still ships rather than blocking session creation.
 */
export async function synthesizeSwitcherBrief(
  classification: PositioningClassification,
  resume: ParsedResume,
  company: CompanyProfile,
  roleType: RoleType
): Promise<SwitcherBrief> {
  const promptCtx: SwitcherBriefContext = {
    classification,
    resumeSummary: serializeResume(resume),
    companySummary: serializeCompany(company),
    roleType,
  };
  const { system, user, maxTokens } = buildSwitcherBriefPrompt(promptCtx);

  let brief: SwitcherBrief;
  try {
    const { data } = await callClaudeForJson({
      model: HAIKU,
      system,
      user,
      maxTokens,
      schema: SwitcherBriefSchema,
      label: "synthesizeSwitcherBrief",
    });
    brief = data;
  } catch (err) {
    console.error("[positioning_engine] switcher synthesis failed; degrading", {
      type: classification.positioning_type,
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      transferable_bridges: [],
      domain_gap_to_close:
        "Insufficient data to identify a domain gap automatically. Candidate should describe in the Insight Interview which target-role responsibilities they have not yet practiced.",
      company_hook: `Genuine interest in ${company.name} grounded in the candidate's resume — to be sharpened during prep.`,
    };
  }

  // Quality-check pass on the generated text fields.
  brief = await applyQualityCheckPass(brief, promptCtx);
  return brief;
}

async function applyQualityCheckPass(
  brief: SwitcherBrief,
  promptCtx: SwitcherBriefContext
): Promise<SwitcherBrief> {
  const critical = await collectCriticalIssues(brief);
  if (critical.length === 0) return brief;

  const { system, user, maxTokens } = buildSwitcherBriefPrompt(promptCtx);
  const correctionPrompt = `\n\nYour previous response tripped these banned-phrase rules; rewrite the affected fields:\n${critical
    .slice(0, 5)
    .map((c) => `- "${c.pattern}" in ${c.location}: ${c.fix}`)
    .join("\n")}\nReturn the full JSON object again with the offending phrasing removed.`;

  try {
    const { data: retry } = await callClaudeForJson({
      model: HAIKU,
      system,
      user: user + correctionPrompt,
      maxTokens,
      schema: SwitcherBriefSchema,
      label: "synthesizeSwitcherBrief.qualityCheckRetry",
    });
    const retryCritical = await collectCriticalIssues(retry);
    return retryCritical.length < critical.length ? retry : brief;
  } catch {
    return brief;
  }
}

async function collectCriticalIssues(brief: SwitcherBrief) {
  const fields: { text: string; location: string }[] = [
    { text: brief.domain_gap_to_close, location: "domain_gap_to_close" },
    { text: brief.company_hook, location: "company_hook" },
    ...brief.transferable_bridges.map((b, i) => ({
      text: b.why_it_maps,
      location: `transferable_bridges[${i}].why_it_maps`,
    })),
  ].filter((f) => f.text && f.text.length > 0);

  const all = await Promise.all(
    fields.map(async (f) => {
      const r = await checkAnswerQuality(f.text, "career_switcher_bridge");
      return r.issues
        .filter((i) => i.severity === "critical")
        .map((i) => ({ pattern: i.pattern, location: f.location, fix: i.fix }));
    })
  );
  return all.flat();
}

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
  const skills = (r.skills ?? [])
    .slice(0, 12)
    .map((s) => s.name)
    .join(", ");
  return [
    `Background type: ${r.backgroundType}`,
    `Narrative: ${r.narrativeSummary}`,
    "Roles:",
    roles || "(no professional roles on resume)",
    `Skills: ${skills || "none listed"}`,
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
    `Culture signals: ${(c.cultureSignals ?? []).slice(0, 3).join("; ") || "none"}`,
  ].join("\n");
}
