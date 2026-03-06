/**
 * Prompt optimization signal generator.
 *
 * Converts aggregated feedback data into actionable suggestions
 * for improving answer generation prompts.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { FailureDimension, UserAlternative, QualityAlert } from "./quality-analyzer";
import { anonymizeText } from "@/lib/privacy/anonymizer";
import { canShowQuestionFrequency } from "@/lib/privacy/k-anonymity";

function adminDb() {
  return createAdminClient();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OptimizationSignal {
  answerType: string;
  priority: "high" | "medium" | "low";
  signal: string;
  suggestion: string;
  evidence: string;
}

export interface CompanyPlaybookUpdate {
  companyNameNormalized: string;
  companyDisplayName: string;
  totalReports: number;
  avgDifficulty: number | null;
  positiveExperiencePct: number | null;
  offerRatePct: number | null;
  topQuestions: Array<{ question: string; frequency: number; category: string }>;
  confidenceLevel: "low" | "medium" | "high";
}

// ─── Signal Generation ────────────────────────────────────────────────────────

/**
 * Generate optimization signals from failure dimensions and alerts.
 */
export function generateOptimizationSignals(
  failures: FailureDimension[],
  alternatives: UserAlternative[],
  alerts: QualityAlert[]
): OptimizationSignal[] {
  const signals: OptimizationSignal[] = [];

  // From failure dimensions
  for (const f of failures) {
    if (f.count < 3) continue; // need enough signal

    const suggestion = DIMENSION_SUGGESTIONS[f.dimension];
    if (suggestion) {
      signals.push({
        answerType: f.answerType,
        priority: f.pct >= 50 ? "high" : f.pct >= 30 ? "medium" : "low",
        signal: `${f.pct}% of negative feedback cites "${f.dimension}"`,
        suggestion,
        evidence: `${f.count} reports in this dimension`,
      });
    }
  }

  // From user-written alternatives
  const altsByType = new Map<string, number>();
  for (const alt of alternatives) {
    altsByType.set(alt.answerType, (altsByType.get(alt.answerType) ?? 0) + 1);
  }
  for (const [answerType, count] of altsByType) {
    if (count >= 3) {
      signals.push({
        answerType,
        priority: count >= 10 ? "high" : "medium",
        signal: `${count} users wrote their own alternative answers`,
        suggestion: "Review user alternatives for common patterns. Consider adding them as golden examples or adjusting the prompt voice.",
        evidence: `${count} user-written alternatives available`,
      });
    }
  }

  // From quality alerts
  for (const alert of alerts) {
    signals.push({
      answerType: alert.answerType,
      priority: alert.severity === "critical" ? "high" : "medium",
      signal: `${alert.metric} changed ${alert.changePercent}% week-over-week`,
      suggestion: METRIC_SUGGESTIONS[alert.metric] ?? "Investigate prompt changes or data quality.",
      evidence: `${alert.previousValue.toFixed(2)} -> ${alert.currentValue.toFixed(2)}`,
    });
  }

  return signals.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const DIMENSION_SUGGESTIONS: Record<string, string> = {
  too_generic: "Add more specificity instructions. Include resume bullet matching. Require concrete numbers, names, or timeframes.",
  too_long: "Reduce max_tokens or add explicit length constraints. Add 'Keep it under X sentences' to the prompt.",
  too_short: "Increase detail requirements. Add 'Include at least X specific details' to the prompt.",
  missing_detail: "Strengthen resume context injection. Ensure the prompt references specific experience bullets.",
  sounds_unnatural: "Review voice patterns and style rules. Consider adding more golden examples with natural phrasing.",
};

const METRIC_SUGGESTIONS: Record<string, string> = {
  avg_rating: "Rating dropped — check recent prompt changes, golden example updates, or voice rule modifications.",
  edit_rate: "Edit rate rising — users are rewriting more answers. The generation may be drifting from user expectations.",
  regeneration_rate: "Regeneration rate rising — first attempts aren't satisfying. Check if the prompt is too generic or if context is being dropped.",
};

// ─── Company Playbook Updates ─────────────────────────────────────────────────

/**
 * Rebuild company playbook data from interview reports.
 * Called by the aggregation pipeline.
 */
export async function updateCompanyPlaybooks(): Promise<number> {
  const db = adminDb();

  // Get companies with >= 5 reports
  const { data: companies } = await db
    .from("interview_reports")
    .select("company_name_normalized, company_name")
    .not("company_name_normalized", "is", null);

  if (!companies?.length) return 0;

  // Count reports per company
  const companyCounts = new Map<string, { count: number; displayName: string }>();
  for (const r of companies) {
    const norm = r.company_name_normalized;
    const existing = companyCounts.get(norm);
    if (existing) {
      existing.count++;
    } else {
      companyCounts.set(norm, { count: 1, displayName: r.company_name });
    }
  }

  let updated = 0;

  for (const [normalized, { count, displayName }] of companyCounts) {
    if (count < 5) continue;

    // Fetch all reports for this company
    const { data: reports } = await db
      .from("interview_reports")
      .select("difficulty, experience, outcome, stage, interview_format, duration_minutes, total_stages_in_process, days_since_application")
      .eq("company_name_normalized", normalized);

    if (!reports?.length) continue;

    // Fetch questions
    const { data: questions } = await db
      .from("interview_questions_reported")
      .select("question_text, question_category, interview_stage")
      .eq("company_name_normalized", normalized)
      .limit(100);

    // Compute aggregates
    const difficulties = reports.map((r) => r.difficulty).filter(Boolean) as number[];
    const avgDifficulty = difficulties.length > 0
      ? Math.round(difficulties.reduce((a, b) => a + b, 0) / difficulties.length * 100) / 100
      : null;

    const withExperience = reports.filter((r) => r.experience);
    const positivePct = withExperience.length > 0
      ? Math.round(withExperience.filter((r) => r.experience === "positive").length / withExperience.length * 100)
      : null;

    const withOutcome = reports.filter((r) => r.outcome && r.outcome !== "pending");
    const offerPct = withOutcome.length > 0
      ? Math.round(withOutcome.filter((r) => r.outcome === "offer").length / withOutcome.length * 100)
      : null;

    // Top questions by frequency
    const questionFreq = new Map<string, { count: number; category: string }>();
    for (const q of questions ?? []) {
      const key = q.question_text.toLowerCase().trim();
      const existing = questionFreq.get(key);
      if (existing) {
        existing.count++;
      } else {
        questionFreq.set(key, { count: 1, category: q.question_category ?? "behavioral" });
      }
    }
    const topQuestions = Array.from(questionFreq.entries())
      .map(([q, { count: freq, category }]) => ({
        question: anonymizeText(q),
        frequency: freq,
        category,
      }))
      .filter((q) => canShowQuestionFrequency(q.frequency))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    // Stage breakdown
    const stageFreq = new Map<string, { count: number; formats: string[]; durations: number[] }>();
    for (const r of reports) {
      const key = r.stage;
      const existing = stageFreq.get(key) ?? { count: 0, formats: [], durations: [] };
      existing.count++;
      if (r.interview_format) existing.formats.push(r.interview_format);
      if (r.duration_minutes) existing.durations.push(r.duration_minutes);
      stageFreq.set(key, existing);
    }
    const typicalStages = Array.from(stageFreq.entries())
      .map(([stage, data]) => ({
        stage,
        format: mode(data.formats) ?? "video",
        avgDurationMinutes: data.durations.length > 0
          ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
          : 45,
        frequencyPct: Math.round((data.count / reports.length) * 100),
      }))
      .sort((a, b) => b.frequencyPct - a.frequencyPct);

    const confidenceLevel = count >= 50 ? "high" : count >= 15 ? "medium" : "low";

    // Upsert playbook
    await db.from("company_playbooks").upsert(
      {
        company_name_normalized: normalized,
        company_display_name: displayName,
        total_reports: count,
        avg_difficulty: avgDifficulty,
        positive_experience_pct: positivePct,
        offer_rate_pct: offerPct,
        typical_stages: typicalStages,
        top_questions_by_stage: topQuestions,
        confidence_level: confidenceLevel,
        report_threshold_met: true,
        last_updated: new Date().toISOString(),
      },
      { onConflict: "company_name_normalized" }
    );

    updated++;
  }

  return updated;
}

function mode(arr: string[]): string | null {
  if (arr.length === 0) return null;
  const freq = new Map<string, number>();
  for (const v of arr) freq.set(v, (freq.get(v) ?? 0) + 1);
  let maxVal = "", maxCount = 0;
  for (const [v, c] of freq) {
    if (c > maxCount) { maxVal = v; maxCount = c; }
  }
  return maxVal;
}
