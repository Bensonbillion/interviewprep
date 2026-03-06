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
