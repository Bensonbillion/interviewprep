import Link from "next/link";
import { BookOpen, Sparkles, Mic2, FlaskConical, LineChart } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

async function getOverviewStats() {
  try {
    const admin = createAdminClient();
    const [sources, examples, rules, versions] = await Promise.all([
      admin.from("knowledge_sources").select("id, status", { count: "exact" }),
      admin.from("golden_examples").select("id, is_active", { count: "exact" }),
      admin.from("style_rules").select("id", { count: "exact" }),
      admin.from("prompt_versions").select("id, is_active", { count: "exact" }),
    ]);
    return {
      totalSources: sources.count ?? 0,
      readySources: (sources.data ?? []).filter((s) => s.status === "ready").length,
      totalExamples: examples.count ?? 0,
      activeExamples: (examples.data ?? []).filter((s) => s.is_active).length,
      totalRules: rules.count ?? 0,
      totalVersions: versions.count ?? 0,
      activeVersions: (versions.data ?? []).filter((s) => s.is_active).length,
    };
  } catch {
    return null;
  }
}

const SECTIONS = [
  {
    href: "/admin/knowledge",
    icon: BookOpen,
    label: "Knowledge Sources",
    description: "Upload playbooks, guides, and docs. Powers RAG retrieval.",
    color: "text-blue-600 bg-blue-50",
  },
  {
    href: "/admin/examples",
    icon: Sparkles,
    label: "Golden Examples",
    description: "Curated Q&A pairs used as few-shot examples in every prompt.",
    color: "text-amber-600 bg-amber-50",
  },
  {
    href: "/admin/voice",
    icon: Mic2,
    label: "Voice & Style",
    description: "Banned phrases, tone keywords, and writing instructions.",
    color: "text-purple-600 bg-purple-50",
  },
  {
    href: "/admin/prompts",
    icon: FlaskConical,
    label: "Prompt Lab",
    description: "Version, test, and deploy system prompts.",
    color: "text-green-600 bg-green-50",
  },
  {
    href: "/admin/quality",
    icon: LineChart,
    label: "Quality Dashboard",
    description: "Feedback trends, thumbs ratings, and weak answer analysis.",
    color: "text-red-600 bg-red-50",
  },
];

export default async function AdminPage() {
  const stats = await getOverviewStats();

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage the Knowledge Bank that powers every answer SalesPrep generates.
        </p>
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Knowledge Sources", value: `${stats.readySources} ready / ${stats.totalSources}` },
            { label: "Golden Examples", value: `${stats.activeExamples} active / ${stats.totalExamples}` },
            { label: "Style Rules", value: stats.totalRules },
            { label: "Prompt Versions", value: `${stats.activeVersions} active / ${stats.totalVersions}` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Section cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map(({ href, icon: Icon, label, description, color }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-amber-800 mb-1">Priority Actions</p>
        <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
          <li>Write 2-3 Golden Examples per question type (highest impact)</li>
          <li>Review and activate Style Rules (eliminates AI slop immediately)</li>
          <li>Upload sales playbooks to Knowledge Sources (enriches context)</li>
          <li>Run the SQL migration in Supabase if you haven&apos;t already</li>
        </ol>
      </div>
    </div>
  );
}
