/**
 * Feedback quality analyzer — aggregates implicit + explicit feedback
 * into prompt_quality_metrics rows and surfaces optimization signals.
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeeklyMetrics {
  answerType: string;
  weekStart: string;
  totalGenerations: number;
  avgExplicitRating: number | null;
  editRate: number;
  avgEditDistance: number;
  regenerationRate: number;
  copyRate: number;
  avgTimeOnCardSeconds: number;
  avgOutcomeScore: number | null;
}

export interface FailureDimension {
  answerType: string;
  dimension: string; // too_generic, too_long, etc.
  count: number;
  pct: number;
}

export interface UserAlternative {
  id: string;
  answerType: string;
  howWouldYouSayIt: string;
  rating: number;
  createdAt: string;
}

export interface QualityTrend {
  answerType: string;
  weeks: Array<{
    weekStart: string;
    avgRating: number | null;
    editRate: number;
    regenerationRate: number;
    copyRate: number;
  }>;
}

export interface QualityAlert {
  answerType: string;
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  severity: "warning" | "critical";
}

// ─── Weekly Aggregation ───────────────────────────────────────────────────────

/**
 * Compute and upsert prompt_quality_metrics for a given week.
 * Call this from a scheduled job or manual trigger.
 */
export async function aggregateWeeklyMetrics(weekStart: Date): Promise<WeeklyMetrics[]> {
  const db = adminDb();
  const weekStartISO = weekStart.toISOString().slice(0, 10);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndISO = weekEnd.toISOString().slice(0, 10);

  // Fetch raw interactions for the week
  const { data: interactions } = await db
    .from("answer_interactions")
    .select("answer_type, edit_distance_words, edit_type, time_on_card_seconds, copied_to_clipboard, regeneration_count, card_expanded")
    .gte("created_at", weekStartISO)
    .lt("created_at", weekEndISO);

  // Fetch explicit ratings for the week
  const { data: ratings } = await db
    .from("answer_explicit_feedback")
    .select("answer_type, rating, sounds_natural, too_long, too_short, too_generic, missing_detail")
    .gte("created_at", weekStartISO)
    .lt("created_at", weekEndISO);

  // Group interactions by answer type
  const byType = new Map<string, typeof interactions>();
  for (const row of interactions ?? []) {
    const arr = byType.get(row.answer_type) ?? [];
    arr.push(row);
    byType.set(row.answer_type, arr);
  }

  // Group ratings by answer type
  const ratingsByType = new Map<string, typeof ratings>();
  for (const row of ratings ?? []) {
    const arr = ratingsByType.get(row.answer_type) ?? [];
    arr.push(row);
    ratingsByType.set(row.answer_type, arr);
  }

  // Merge all answer types
  const allTypes = new Set([...byType.keys(), ...ratingsByType.keys()]);
  const results: WeeklyMetrics[] = [];

  for (const answerType of allTypes) {
    const ints = byType.get(answerType) ?? [];
    const rats = ratingsByType.get(answerType) ?? [];
    const total = ints.length || 1; // avoid /0

    const edited = ints.filter((i) => i.edit_type && i.edit_type !== "none").length;
    const regenerated = ints.filter((i) => (i.regeneration_count ?? 0) > 0).length;
    const copied = ints.filter((i) => i.copied_to_clipboard).length;
    const editDistances = ints.map((i) => i.edit_distance_words ?? 0).filter((d) => d > 0);
    const times = ints.map((i) => i.time_on_card_seconds ?? 0).filter((t) => t > 0);

    const avgRating = rats.length > 0
      ? rats.reduce((s, r) => s + r.rating, 0) / rats.length
      : null;

    const metrics: WeeklyMetrics = {
      answerType,
      weekStart: weekStartISO,
      totalGenerations: ints.length,
      avgExplicitRating: avgRating ? Math.round(avgRating * 100) / 100 : null,
      editRate: Math.round((edited / total) * 10000) / 10000,
      avgEditDistance: editDistances.length > 0
        ? Math.round(editDistances.reduce((a, b) => a + b, 0) / editDistances.length * 100) / 100
        : 0,
      regenerationRate: Math.round((regenerated / total) * 10000) / 10000,
      copyRate: Math.round((copied / total) * 10000) / 10000,
      avgTimeOnCardSeconds: times.length > 0
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length * 100) / 100
        : 0,
      avgOutcomeScore: null, // computed separately via outcome correlation
    };

    results.push(metrics);

    // Upsert into prompt_quality_metrics
    await db.from("prompt_quality_metrics").upsert(
      {
        answer_type: answerType,
        week_start: weekStartISO,
        total_generations: metrics.totalGenerations,
        avg_explicit_rating: metrics.avgExplicitRating,
        edit_rate: metrics.editRate,
        avg_edit_distance: metrics.avgEditDistance,
        regeneration_rate: metrics.regenerationRate,
        copy_rate: metrics.copyRate,
        avg_time_on_card_seconds: metrics.avgTimeOnCardSeconds,
        avg_outcome_score: metrics.avgOutcomeScore,
      },
      { onConflict: "answer_type,week_start" }
    );
  }

  return results;
}

// ─── Failure Dimensions ───────────────────────────────────────────────────────

/**
 * Cluster negative feedback by issue dimension per answer type.
 */
export async function getFailureDimensions(daysBacks = 30): Promise<FailureDimension[]> {
  const db = adminDb();
  const since = new Date();
  since.setDate(since.getDate() - daysBacks);

  const { data: feedback } = await db
    .from("answer_explicit_feedback")
    .select("answer_type, rating, too_long, too_short, too_generic, missing_detail, sounds_natural")
    .lte("rating", 2)
    .gte("created_at", since.toISOString());

  if (!feedback?.length) return [];

  const counts = new Map<string, Map<string, number>>();
  const typeTotals = new Map<string, number>();

  for (const fb of feedback) {
    const at = fb.answer_type;
    typeTotals.set(at, (typeTotals.get(at) ?? 0) + 1);
    if (!counts.has(at)) counts.set(at, new Map());
    const dims = counts.get(at)!;

    if (fb.too_generic) dims.set("too_generic", (dims.get("too_generic") ?? 0) + 1);
    if (fb.too_long) dims.set("too_long", (dims.get("too_long") ?? 0) + 1);
    if (fb.too_short) dims.set("too_short", (dims.get("too_short") ?? 0) + 1);
    if (fb.missing_detail) dims.set("missing_detail", (dims.get("missing_detail") ?? 0) + 1);
    if (fb.sounds_natural === false) dims.set("sounds_unnatural", (dims.get("sounds_unnatural") ?? 0) + 1);
  }

  const results: FailureDimension[] = [];
  for (const [answerType, dims] of counts) {
    const total = typeTotals.get(answerType) ?? 1;
    for (const [dimension, count] of dims) {
      results.push({
        answerType,
        dimension,
        count,
        pct: Math.round((count / total) * 100),
      });
    }
  }

  return results.sort((a, b) => b.count - a.count);
}

// ─── User-Written Alternatives ────────────────────────────────────────────────

/**
 * Extract user-submitted alternative answers (training gold).
 */
export async function getUserAlternatives(limit = 50): Promise<UserAlternative[]> {
  const db = adminDb();
  const { data } = await db
    .from("answer_explicit_feedback")
    .select("id, answer_type, how_would_you_say_it, rating, created_at")
    .not("how_would_you_say_it", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id,
    answerType: r.answer_type,
    howWouldYouSayIt: r.how_would_you_say_it,
    rating: r.rating,
    createdAt: r.created_at,
  }));
}

// ─── Quality Trends ──────────────────────────────────────────────────────────

/**
 * Get weekly quality trends for the last N weeks.
 */
export async function getQualityTrends(weeks = 8): Promise<QualityTrend[]> {
  const db = adminDb();
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const { data } = await db
    .from("prompt_quality_metrics")
    .select("answer_type, week_start, avg_explicit_rating, edit_rate, regeneration_rate, copy_rate")
    .gte("week_start", since.toISOString().slice(0, 10))
    .order("week_start");

  if (!data?.length) return [];

  const byType = new Map<string, QualityTrend["weeks"]>();
  for (const row of data) {
    const arr = byType.get(row.answer_type) ?? [];
    arr.push({
      weekStart: row.week_start,
      avgRating: row.avg_explicit_rating ? Number(row.avg_explicit_rating) : null,
      editRate: Number(row.edit_rate ?? 0),
      regenerationRate: Number(row.regeneration_rate ?? 0),
      copyRate: Number(row.copy_rate ?? 0),
    });
    byType.set(row.answer_type, arr);
  }

  return Array.from(byType.entries()).map(([answerType, wks]) => ({
    answerType,
    weeks: wks,
  }));
}

// ─── Quality Alerts ──────────────────────────────────────────────────────────

/**
 * Detect week-over-week quality regressions.
 */
export async function detectQualityAlerts(): Promise<QualityAlert[]> {
  const db = adminDb();

  // Get last 2 weeks of metrics
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const { data } = await db
    .from("prompt_quality_metrics")
    .select("answer_type, week_start, avg_explicit_rating, edit_rate, regeneration_rate, copy_rate")
    .gte("week_start", twoWeeksAgo.toISOString().slice(0, 10))
    .order("week_start");

  if (!data || data.length < 2) return [];

  // Group by answer type, sorted by week
  const byType = new Map<string, typeof data>();
  for (const row of data) {
    const arr = byType.get(row.answer_type) ?? [];
    arr.push(row);
    byType.set(row.answer_type, arr);
  }

  const alerts: QualityAlert[] = [];
  const THRESHOLDS = {
    avg_explicit_rating: { warningDrop: -10, criticalDrop: -20 }, // % change
    edit_rate: { warningRise: 30, criticalRise: 50 },
    regeneration_rate: { warningRise: 30, criticalRise: 50 },
  };

  for (const [answerType, rows] of byType) {
    if (rows.length < 2) continue;
    const prev = rows[rows.length - 2];
    const curr = rows[rows.length - 1];

    // Rating drop
    if (prev.avg_explicit_rating && curr.avg_explicit_rating) {
      const prevVal = Number(prev.avg_explicit_rating);
      const currVal = Number(curr.avg_explicit_rating);
      if (prevVal > 0) {
        const change = ((currVal - prevVal) / prevVal) * 100;
        if (change <= THRESHOLDS.avg_explicit_rating.criticalDrop) {
          alerts.push({ answerType, metric: "avg_rating", currentValue: currVal, previousValue: prevVal, changePercent: Math.round(change), severity: "critical" });
        } else if (change <= THRESHOLDS.avg_explicit_rating.warningDrop) {
          alerts.push({ answerType, metric: "avg_rating", currentValue: currVal, previousValue: prevVal, changePercent: Math.round(change), severity: "warning" });
        }
      }
    }

    // Edit rate rise
    const prevEdit = Number(prev.edit_rate ?? 0);
    const currEdit = Number(curr.edit_rate ?? 0);
    if (prevEdit > 0) {
      const change = ((currEdit - prevEdit) / prevEdit) * 100;
      if (change >= THRESHOLDS.edit_rate.criticalRise) {
        alerts.push({ answerType, metric: "edit_rate", currentValue: currEdit, previousValue: prevEdit, changePercent: Math.round(change), severity: "critical" });
      } else if (change >= THRESHOLDS.edit_rate.warningRise) {
        alerts.push({ answerType, metric: "edit_rate", currentValue: currEdit, previousValue: prevEdit, changePercent: Math.round(change), severity: "warning" });
      }
    }

    // Regen rate rise
    const prevRegen = Number(prev.regeneration_rate ?? 0);
    const currRegen = Number(curr.regeneration_rate ?? 0);
    if (prevRegen > 0) {
      const change = ((currRegen - prevRegen) / prevRegen) * 100;
      if (change >= THRESHOLDS.regeneration_rate.criticalRise) {
        alerts.push({ answerType, metric: "regeneration_rate", currentValue: currRegen, previousValue: prevRegen, changePercent: Math.round(change), severity: "critical" });
      } else if (change >= THRESHOLDS.regeneration_rate.warningRise) {
        alerts.push({ answerType, metric: "regeneration_rate", currentValue: currRegen, previousValue: prevRegen, changePercent: Math.round(change), severity: "warning" });
      }
    }
  }

  return alerts.sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1));
}
