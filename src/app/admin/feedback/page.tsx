"use client";

import { useEffect, useState } from "react";

interface FailureDimension {
  answerType: string;
  dimension: string;
  count: number;
  pct: number;
}

interface UserAlternative {
  id: string;
  answerType: string;
  howWouldYouSayIt: string;
  rating: number;
  createdAt: string;
}

interface QualityTrend {
  answerType: string;
  weeks: Array<{
    weekStart: string;
    avgRating: number | null;
    editRate: number;
    regenerationRate: number;
    copyRate: number;
  }>;
}

interface QualityAlert {
  answerType: string;
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  severity: "warning" | "critical";
}

interface OptimizationSignal {
  answerType: string;
  priority: "high" | "medium" | "low";
  signal: string;
  suggestion: string;
  evidence: string;
}

interface FeedbackData {
  failures: FailureDimension[];
  alternatives: UserAlternative[];
  trends: QualityTrend[];
  alerts: QualityAlert[];
  signals: OptimizationSignal[];
}

const DAYS_OPTIONS = [7, 14, 30, 90];

const DIMENSION_LABELS: Record<string, string> = {
  too_generic: "Too generic",
  too_long: "Too long",
  too_short: "Too short",
  missing_detail: "Missing detail",
  sounds_unnatural: "Sounds unnatural",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-50 text-red-700 border-red-100",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-100",
  low: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function FeedbackDashboardPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aggregating, setAggregating] = useState(false);

  async function fetchData(d: number) {
    setLoading(true);
    const res = await fetch(`/api/admin/feedback?days=${d}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  async function triggerAggregation() {
    setAggregating(true);
    await fetch("/api/admin/feedback/aggregate", { method: "POST" });
    setAggregating(false);
    fetchData(days);
  }

  useEffect(() => {
    // fetchData synchronously calls setLoading(true) before its await — that
    // is intentional so the spinner shows while days-filter changes propagate.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(days);
  }, [days]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback Intelligence</h1>
          <p className="text-sm text-gray-500 mt-1">
            Feedback analysis, prompt optimization signals, and quality trends.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  days === d
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={triggerAggregation}
            disabled={aggregating}
            className="px-3 py-1.5 text-sm rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {aggregating ? "Aggregating..." : "Run Aggregation"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : !data ? (
        <div className="text-center py-16 text-gray-400">No data available.</div>
      ) : (
        <>
          {/* Quality Alerts */}
          {data.alerts.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Alerts</h2>
              {data.alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                    alert.severity === "critical"
                      ? "bg-red-50 border-red-200"
                      : "bg-yellow-50 border-yellow-200"
                  }`}
                >
                  <div>
                    <span className="font-medium text-sm">
                      {alert.answerType.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm text-gray-600 ml-2">
                      {alert.metric.replace(/_/g, " ")} {alert.changePercent > 0 ? "+" : ""}
                      {alert.changePercent}%
                    </span>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      alert.severity === "critical"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Optimization Signals */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Optimization Signals</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Actionable suggestions derived from feedback patterns
              </p>
            </div>
            {data.signals.length === 0 ? (
              <p className="text-center py-10 text-sm text-gray-400">
                No optimization signals yet. Need more feedback data.
              </p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.signals.map((signal, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          PRIORITY_COLORS[signal.priority]
                        }`}
                      >
                        {signal.priority}
                      </span>
                      <span className="text-sm font-medium text-gray-800">
                        {signal.answerType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{signal.signal}</p>
                    <p className="text-sm text-indigo-700 mt-1 font-medium">{signal.suggestion}</p>
                    <p className="text-xs text-gray-400 mt-1">Evidence: {signal.evidence}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Failure Dimensions */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Failure Dimensions</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Why users rate answers negatively
                </p>
              </div>
              {data.failures.length === 0 ? (
                <p className="text-center py-10 text-sm text-gray-400">No negative feedback yet.</p>
              ) : (
                <div className="p-5 space-y-3">
                  {data.failures.slice(0, 15).map((f, i) => {
                    const maxCount = data.failures[0]?.count ?? 1;
                    const widthPct = Math.round((f.count / maxCount) * 100);
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">
                            <span className="font-medium">{f.answerType.replace(/_/g, " ")}</span>
                            <span className="text-gray-400 mx-1">/</span>
                            {DIMENSION_LABELS[f.dimension] ?? f.dimension}
                          </span>
                          <span className="font-medium text-gray-900">
                            {f.count} ({f.pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-400 rounded-full"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quality Trends */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Weekly Trends</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Edit rate, regen rate, and copy rate by answer type
                </p>
              </div>
              {data.trends.length === 0 ? (
                <p className="text-center py-10 text-sm text-gray-400">
                  No trend data yet. Run aggregation first.
                </p>
              ) : (
                <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
                  {data.trends.map((trend) => (
                    <div key={trend.answerType}>
                      <p className="text-sm font-medium text-gray-800 mb-2">
                        {trend.answerType.replace(/_/g, " ")}
                      </p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400">
                            <th className="text-left py-1">Week</th>
                            <th className="text-right py-1">Rating</th>
                            <th className="text-right py-1">Edit %</th>
                            <th className="text-right py-1">Regen %</th>
                            <th className="text-right py-1">Copy %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trend.weeks.map((w) => (
                            <tr key={w.weekStart} className="border-t border-gray-50">
                              <td className="py-1 text-gray-500">
                                {new Date(w.weekStart).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </td>
                              <td className="py-1 text-right font-medium">
                                {w.avgRating?.toFixed(1) ?? "--"}
                              </td>
                              <td className="py-1 text-right">
                                {(w.editRate * 100).toFixed(0)}%
                              </td>
                              <td className="py-1 text-right">
                                {(w.regenerationRate * 100).toFixed(0)}%
                              </td>
                              <td className="py-1 text-right">
                                {(w.copyRate * 100).toFixed(0)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* User-Written Alternatives */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">User-Written Alternatives</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Answers users wrote themselves — potential golden example candidates
              </p>
            </div>
            {data.alternatives.length === 0 ? (
              <p className="text-center py-10 text-sm text-gray-400">
                No user alternatives submitted yet.
              </p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.alternatives.slice(0, 20).map((alt) => (
                  <div key={alt.id} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                        {alt.answerType.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-gray-400">
                        rated {alt.rating}/5
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(alt.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap line-clamp-4">
                      {alt.howWouldYouSayIt}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
