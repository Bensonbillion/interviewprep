/**
 * Company-specific prompt enrichment.
 *
 * Fetches playbook data for a company and formats it
 * for injection into the generation system prompt.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCompanyName } from "@/lib/privacy/normalizer";

function adminDb() {
  return createAdminClient();
}

export interface CompanyEnrichmentContext {
  companyName: string;
  avgDifficulty: number | null;
  positiveExperiencePct: number | null;
  topQuestions: Array<{ question: string; frequency: number; category: string }>;
  typicalStages: Array<{ stage: string; format: string; avgDurationMinutes: number }>;
  confidenceLevel: string;
}

/**
 * Fetch company playbook context for prompt injection.
 * Returns null if no playbook exists or threshold not met.
 */
export async function fetchCompanyEnrichment(companyName: string): Promise<CompanyEnrichmentContext | null> {
  const normalized = normalizeCompanyName(companyName);
  const db = adminDb();

  const { data } = await db
    .from("company_playbooks")
    .select("company_display_name, avg_difficulty, positive_experience_pct, top_questions_by_stage, typical_stages, confidence_level")
    .eq("company_name_normalized", normalized)
    .eq("report_threshold_met", true)
    .maybeSingle();

  if (!data) return null;

  return {
    companyName: data.company_display_name,
    avgDifficulty: data.avg_difficulty ? Number(data.avg_difficulty) : null,
    positiveExperiencePct: data.positive_experience_pct ? Number(data.positive_experience_pct) : null,
    topQuestions: (data.top_questions_by_stage ?? []) as CompanyEnrichmentContext["topQuestions"],
    typicalStages: (data.typical_stages ?? []) as CompanyEnrichmentContext["typicalStages"],
    confidenceLevel: data.confidence_level ?? "low",
  };
}

/**
 * Format company enrichment context as a system prompt section.
 */
export function formatCompanyEnrichmentSection(ctx: CompanyEnrichmentContext): string {
  const parts: string[] = [];

  parts.push(`COMPANY INTELLIGENCE — ${ctx.companyName} (confidence: ${ctx.confidenceLevel}):`);

  if (ctx.avgDifficulty !== null) {
    parts.push(`Average interview difficulty: ${ctx.avgDifficulty}/5`);
  }

  if (ctx.positiveExperiencePct !== null) {
    parts.push(`Candidate experience: ${ctx.positiveExperiencePct}% positive`);
  }

  if (ctx.topQuestions.length > 0) {
    const topQ = ctx.topQuestions
      .slice(0, 5)
      .map((q) => `- "${q.question}" (${q.category}, asked ${q.frequency}x)`)
      .join("\n");
    parts.push(`\nFREQUENTLY ASKED AT THIS COMPANY:\n${topQ}`);
    parts.push("Tailor the answer to anticipate these common questions and interview style.");
  }

  if (ctx.typicalStages.length > 0) {
    const stages = ctx.typicalStages
      .slice(0, 4)
      .map((s) => `- ${s.stage}: ${s.format}, ~${s.avgDurationMinutes}min`)
      .join("\n");
    parts.push(`\nTYPICAL PROCESS:\n${stages}`);
  }

  return parts.join("\n");
}

// ── Interview Intel (curated Glassdoor / community data) ──────────────────────

export interface CompanyInterviewIntel {
  companyName: string;
  interviewRounds: number | null;
  avgDaysToHire: number | null;
  keyTest: string | null;
  uniqueElement: string | null;
  mockCallFormat: string | null;
  commonQuestions: string[];
  redFlags: string[];
  tips: string[];
  sdrSatisfactionScore: number | null;
}

/**
 * Fetch curated interview intel for a company.
 * Returns null if no intel row exists.
 */
export async function fetchCompanyInterviewIntel(companyName: string): Promise<CompanyInterviewIntel | null> {
  const normalized = normalizeCompanyName(companyName);
  const db = adminDb();

  const { data } = await db
    .from("company_interview_intel")
    .select("company_name, interview_rounds, avg_days_to_hire, key_test, unique_element, mock_call_format, common_questions, red_flags, tips, sdr_satisfaction_score")
    .eq("company_name_normalized", normalized)
    .maybeSingle();

  if (!data) return null;

  return {
    companyName: data.company_name,
    interviewRounds: data.interview_rounds,
    avgDaysToHire: data.avg_days_to_hire,
    keyTest: data.key_test,
    uniqueElement: data.unique_element,
    mockCallFormat: data.mock_call_format,
    commonQuestions: data.common_questions ?? [],
    redFlags: data.red_flags ?? [],
    tips: data.tips ?? [],
    sdrSatisfactionScore: data.sdr_satisfaction_score ? Number(data.sdr_satisfaction_score) : null,
  };
}

/**
 * Format interview intel as a system prompt section.
 */
/**
 * Build fallback generic interview intelligence when no company-specific data exists.
 * Uses cross-industry patterns from 40+ researched companies.
 */
export function buildGenericInterviewIntel(stage?: string): string {
  const parts: string[] = [];

  parts.push("GENERAL INTERVIEW INTELLIGENCE (company-specific data not available — using cross-industry patterns from 40+ companies):");

  parts.push("\nStage-specific guidance:");

  const stageGuidance: Record<string, string> = {
    recruiter: "- Recruiter screen: They are filtering for energy, basic research, and phone presence. Your TMAY is 80% of this call. Keep answers to 60-90 seconds. End with a close.",
    hiring_manager: "- Hiring manager: Depth of thought and self-awareness matter most. Show decision rationale at career transitions. Be ready to explain WHY you moved, not just where.",
    role_play: "- Role play / mock call: This is a coachability test, not a performance test. When they give feedback, implement it visibly. Your first attempt barely matters — your response to coaching is everything.",
    panel: "- Panel: 3-4 evaluators will compare notes. Be consistent but tailor depth to each person's function.",
    take_home: "- Take-home: Allocate 2-3x the time you think it needs. Quality of research and personalization matter more than polish.",
  };

  if (stage && stageGuidance[stage]) {
    parts.push(stageGuidance[stage]);
  } else {
    parts.push(Object.values(stageGuidance).join("\n"));
  }

  parts.push(`
Universal patterns across 40 companies:
- 32 of 38 active SDR orgs use mock calls
- Average process: 3-5 rounds over 22-30 days
- Questions they ALL ask: Tell me about yourself, Why sales, Why this company, How do you handle rejection
- Universal red flags: No product research, passive interview style, inability to simplify the product
- Emerging trend: AI usage questions are becoming standard`);

  return parts.join("\n");
}

/**
 * Log company intel request for demand tracking.
 * Fire-and-forget — errors are swallowed.
 */
export async function logCompanyIntelRequest(companyName: string): Promise<void> {
  try {
    const normalized = normalizeCompanyName(companyName);
    const db = adminDb();
    await db.rpc("upsert_company_intel_request", {
      p_company_name: companyName,
      p_normalized: normalized,
    });
  } catch {
    // Non-fatal — demand tracking should never block generation
  }
}

export function formatInterviewIntelSection(intel: CompanyInterviewIntel): string {
  const parts: string[] = [];

  parts.push(`COMPANY-SPECIFIC INTERVIEW INTELLIGENCE — ${intel.companyName}:`);

  if (intel.interviewRounds || intel.avgDaysToHire) {
    const processDetails = [
      intel.interviewRounds && `${intel.interviewRounds} rounds`,
      intel.avgDaysToHire && `~${intel.avgDaysToHire} days to hire`,
    ].filter(Boolean).join(", ");
    parts.push(`Process: ${processDetails}`);
  }

  if (intel.keyTest) {
    parts.push(`Key test: ${intel.keyTest}`);
  }

  if (intel.uniqueElement) {
    parts.push(`Unique element: ${intel.uniqueElement}`);
  }

  if (intel.mockCallFormat) {
    parts.push(`Mock call format: ${intel.mockCallFormat}`);
  }

  if (intel.commonQuestions.length > 0) {
    parts.push(`\nQUESTIONS COMMONLY ASKED AT ${intel.companyName.toUpperCase()}:\n${intel.commonQuestions.map((q) => `- "${q}"`).join("\n")}`);
    parts.push("Structure your answer to anticipate and naturally address these questions.");
  }

  if (intel.redFlags.length > 0) {
    parts.push(`\nRED FLAGS TO AVOID AT ${intel.companyName.toUpperCase()}:\n${intel.redFlags.map((r) => `- ${r}`).join("\n")}`);
  }

  if (intel.tips.length > 0) {
    parts.push(`\nINSIDER TIPS FOR ${intel.companyName.toUpperCase()}:\n${intel.tips.map((t) => `- ${t}`).join("\n")}`);
  }

  if (intel.sdrSatisfactionScore !== null) {
    parts.push(`\nSDR satisfaction score: ${intel.sdrSatisfactionScore}/5${intel.sdrSatisfactionScore < 3.5 ? " — candidate should ask probing questions about culture and support" : ""}`);
  }

  return parts.join("\n");
}
