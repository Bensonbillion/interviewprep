/**
 * K-anonymity thresholds for public data display.
 *
 * Ensures that shared/aggregated data can't be traced back to
 * individual users by enforcing minimum sample sizes.
 */

// ─── Thresholds ──────────────────────────────────────────────────────────────

/** Minimum reports before a company playbook is visible */
export const PLAYBOOK_MIN_REPORTS = 5;

/** Minimum occurrences before showing "X people reported this question" */
export const QUESTION_FREQUENCY_MIN = 3;

/** Minimum salary data points before showing ranges */
export const SALARY_RANGE_MIN_DATAPOINTS = 5;

/** Minimum reports before showing advice/notes quotes */
export const ADVICE_QUOTES_MIN_REPORTS = 10;

/** Minimum data points for any aggregated statistic */
export const AGGREGATE_STAT_MIN = 3;

// ─── Guard functions ──────────────────────────────────────────────────────────

/**
 * Check if a company has enough reports to show its playbook.
 */
export function canShowPlaybook(totalReports: number): boolean {
  return totalReports >= PLAYBOOK_MIN_REPORTS;
}

/**
 * Check if a question has been reported enough times to show its frequency.
 */
export function canShowQuestionFrequency(reportCount: number): boolean {
  return reportCount >= QUESTION_FREQUENCY_MIN;
}

/**
 * Check if there are enough salary data points to show a range.
 */
export function canShowSalaryRange(dataPointCount: number): boolean {
  return dataPointCount >= SALARY_RANGE_MIN_DATAPOINTS;
}

/**
 * Check if there are enough reports to show anonymized advice quotes.
 */
export function canShowAdviceQuotes(totalReportsForCompany: number): boolean {
  return totalReportsForCompany >= ADVICE_QUOTES_MIN_REPORTS;
}

/**
 * Filter a list of questions to only those meeting frequency threshold.
 */
export function filterByFrequencyThreshold<T extends { frequency: number }>(
  items: T[]
): T[] {
  return items.filter((item) => item.frequency >= QUESTION_FREQUENCY_MIN);
}

/**
 * Compute a safe salary range from data points.
 * Returns null if insufficient data points.
 * Uses 10th and 90th percentile to further protect outliers.
 */
export function computeSafeSalaryRange(
  salaries: number[]
): { low: number; high: number; median: number } | null {
  if (salaries.length < SALARY_RANGE_MIN_DATAPOINTS) return null;

  const sorted = [...salaries].sort((a, b) => a - b);
  const p10Index = Math.floor(sorted.length * 0.1);
  const p90Index = Math.ceil(sorted.length * 0.9) - 1;
  const medianIndex = Math.floor(sorted.length / 2);

  return {
    low: sorted[p10Index],
    high: sorted[p90Index],
    median: sorted[medianIndex],
  };
}

/**
 * Redact a date to month/year only — never expose exact interview dates.
 */
export function redactToMonthYear(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
