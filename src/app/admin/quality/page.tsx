"use client";

import { useEffect, useState } from "react";
import { HandThumbUpIcon, HandThumbDownIcon, DocumentDuplicateIcon, SparklesIcon } from "@heroicons/react/24/outline";

interface QualitySummary {
  totalGenerated: number;
  thumbsUp: number;
  thumbsDown: number;
  copies: number;
  daysBack: number;
}

interface ByTypeRow {
  type: string;
  thumbsUp: number;
  thumbsDown: number;
  total: number;
  satisfactionPct: number | null;
}

interface IssueRow {
  category: string;
  count: number;
}

interface RecentThumbsDown {
  id: string;
  answer_type: string;
  feedback_type: string;
  issue_category: string | null;
  created_at: string;
}

const DAYS_OPTIONS = [7, 14, 30, 90];

const ISSUE_CATEGORY_LABELS: Record<string, string> = {
  too_generic: "Too generic",
  wrong_tone: "Wrong tone",
  not_specific_enough: "Not specific enough",
  missing_context: "Missing context",
};

function pct(n: number, total: number) {
  if (total === 0) return "—";
  return `${Math.round((n / total) * 100)}%`;
}

function SatisfactionBar({ pct: p }: { pct: number | null }) {
  if (p === null) return <span className="text-xs text-gray-400">—</span>;
  const color = p >= 80 ? "bg-green-500" : p >= 60 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-8 text-right">{p}%</span>
    </div>
  );
}

export default function QualityDashboardPage() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<QualitySummary | null>(null);
  const [byType, setByType] = useState<ByTypeRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [recentDown, setRecentDown] = useState<RecentThumbsDown[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData(d: number) {
    setLoading(true);
    const res = await fetch(`/api/admin/quality?days=${d}`);
    const json = await res.json();
    setSummary(json.summary ?? null);
    setByType(json.byType ?? []);
    setIssues(json.issues ?? []);
    setRecentDown(json.recentThumbsDown ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchData(days); }, [days]);

  const totalFeedback = (summary?.thumbsUp ?? 0) + (summary?.thumbsDown ?? 0);
  const overallSatisfaction = totalFeedback > 0
    ? Math.round(((summary?.thumbsUp ?? 0) / totalFeedback) * 100)
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quality Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Answer quality metrics and user feedback analysis.</p>
        </div>
        <div className="flex items-center gap-2">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                days === d ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<SparklesIcon className="w-5 h-5 text-indigo-600" />}
              label="Total Generated"
              value={summary?.totalGenerated ?? 0}
              bg="bg-indigo-50"
            />
            <StatCard
              icon={<HandThumbUpIcon className="w-5 h-5 text-green-600" />}
              label="Thumbs Up"
              value={summary?.thumbsUp ?? 0}
              sub={overallSatisfaction !== null ? `${overallSatisfaction}% satisfaction` : undefined}
              bg="bg-green-50"
            />
            <StatCard
              icon={<HandThumbDownIcon className="w-5 h-5 text-red-500" />}
              label="Thumbs Down"
              value={summary?.thumbsDown ?? 0}
              sub={totalFeedback > 0 ? `${pct(summary?.thumbsDown ?? 0, totalFeedback)} of feedback` : undefined}
              bg="bg-red-50"
            />
            <StatCard
              icon={<DocumentDuplicateIcon className="w-5 h-5 text-blue-600" />}
              label="Copies (implicit 👍)"
              value={summary?.copies ?? 0}
              bg="bg-blue-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* By answer type */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Satisfaction by Answer Type</h2>
              </div>
              {byType.length === 0 ? (
                <p className="text-center py-10 text-sm text-gray-400">No feedback data yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Answer Type</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">👍</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">👎</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[120px]">Satisfaction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {byType.map((row) => (
                      <tr key={row.type} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800">{row.type.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3 text-right text-green-700 font-medium">{row.thumbsUp}</td>
                        <td className="px-4 py-3 text-right text-red-500 font-medium">{row.thumbsDown}</td>
                        <td className="px-5 py-3">
                          <SatisfactionBar pct={row.satisfactionPct} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Issue categories */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Issue Categories</h2>
                <p className="text-xs text-gray-400 mt-0.5">From thumbs-down follow-ups</p>
              </div>
              {issues.length === 0 ? (
                <p className="text-center py-10 text-sm text-gray-400">No issues reported yet.</p>
              ) : (
                <div className="p-5 space-y-3">
                  {issues.map((issue) => {
                    const maxCount = issues[0]?.count ?? 1;
                    const widthPct = Math.round((issue.count / maxCount) * 100);
                    return (
                      <div key={issue.category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{ISSUE_CATEGORY_LABELS[issue.category] ?? issue.category}</span>
                          <span className="font-medium text-gray-900">{issue.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full" style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent thumbs-down */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recent Thumbs Down</h2>
              <p className="text-xs text-gray-400 mt-0.5">Latest 20 negative signals for review</p>
            </div>
            {recentDown.length === 0 ? (
              <p className="text-center py-10 text-sm text-gray-400">No thumbs-down feedback yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Answer Type</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Issue</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentDown.map((fb) => (
                    <tr key={fb.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-700">{fb.answer_type.replace(/_/g, " ")}</td>
                      <td className="px-5 py-3">
                        {fb.issue_category ? (
                          <span className="text-xs bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full">
                            {ISSUE_CATEGORY_LABELS[fb.issue_category] ?? fb.issue_category}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {new Date(fb.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, bg }: { icon: React.ReactNode; label: string; value: number; sub?: string; bg: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
