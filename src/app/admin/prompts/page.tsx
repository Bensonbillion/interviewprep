"use client";

import { useEffect, useState } from "react";
import { PlusIcon, CheckCircleIcon, ArrowUpCircleIcon } from "@heroicons/react/24/outline";
import type { AnswerType, PrepSession } from "@/types";

interface PromptVersion {
  id: string;
  name: string;
  question_key: string | null;
  prompt_text: string;
  is_active: boolean;
  is_default: boolean;
  created_by: string;
  created_at: string;
}

const ANSWER_TYPES = [
  "tell_me_about_yourself", "why_sales", "why_this_company", "behavioral_star",
  "comp_expectations", "role_play_script", "objection_response", "company_brief",
  "cheat_sheet", "questions_to_ask", "coachability_coaching", "career_switcher_bridge",
];

// Sample session for prompt testing
const SAMPLE_SESSION: PrepSession = {
  id: "test-session",
  companyName: "Salesforce",
  createdAt: Date.now(),
  resume: {
    rawText: "5 years in B2B SaaS sales. Closed $2M ARR last year at HubSpot as AE.",
    personalInfo: { name: "Alex Sample" },
    roles: [
      {
        company: "HubSpot",
        title: "Enterprise Account Executive",
        startDate: "2021",
        endDate: "2024",
        durationMonths: 36,
        bullets: [
          { originalText: "Closed $2M ARR, 118% of $1.7M annual quota", category: "metric", salesRelevanceScore: 10, quantified: true, extractedMetrics: ["$2M ARR", "118%"] },
          { originalText: "Multi-threaded deals across VP Eng, CFO, and Procurement", category: "responsibility", salesRelevanceScore: 9, quantified: false, extractedMetrics: [] },
        ],
      },
    ],
    skills: [{ name: "MEDDIC", category: "methodology", salesRelevance: 10 }],
    education: [{ institution: "University of Michigan", degree: "BA Economics", year: "2018" }],
    backgroundType: "experienced_sales",
    narrativeSummary: "Enterprise AE with 5 years closing complex B2B SaaS deals using MEDDIC methodology.",
  },
  company: {
    name: "Salesforce",
    productDescription: "World's #1 CRM platform for enterprise sales teams.",
    icp: { companySizes: ["Enterprise", "Mid-Market"], industries: ["SaaS", "Financial Services"], buyerPersonas: ["VP Sales", "CRO", "CEO"] },
    salesMotion: "outbound",
    competitors: ["HubSpot", "Microsoft Dynamics"],
    techStack: ["Salesforce", "Gong", "Outreach"],
    stage: "public",
    recentNews: ["Q4 earnings beat", "Einstein AI launch"],
    cultureSignals: ["Ohana culture", "customer success first"],
  },
  relevanceMap: {
    strongMatches: [{ resumeItem: "Enterprise AE at HubSpot", relevance: "Direct enterprise AE experience in competitive SaaS" }],
    gaps: [],
    leadStories: ["Closed $2M ARR at 118% quota at HubSpot", "Multi-threaded 6-figure deal across VP, CFO, Procurement"],
  },
  targetRole: "Enterprise Account Executive",
  roleType: "account_executive",
  stage: "hiring_manager",
  jobDescription: "Looking for a high-performing AE to drive enterprise deals in the EMEA region.",
  answerSlots: [],
};

export default function PromptLabPage() {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PromptVersion | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Editor state
  const [editName, setEditName] = useState("");
  const [editKey, setEditKey] = useState("");
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  // Test panel state
  const [testType, setTestType] = useState<AnswerType>("tell_me_about_yourself");
  const [testOutput, setTestOutput] = useState("");
  const [testing, setTesting] = useState(false);

  async function fetchVersions() {
    setLoading(true);
    const res = await fetch("/api/admin/prompts");
    const json = await res.json();
    setVersions(json.versions ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchVersions(); }, []);

  function openVersion(v: PromptVersion) {
    setSelected(v);
    setEditName(v.name);
    setEditKey(v.question_key ?? "");
    setEditText(v.prompt_text);
    setShowNew(false);
    setTestOutput("");
  }

  function openNew() {
    setSelected(null);
    setEditName("");
    setEditKey("");
    setEditText("");
    setShowNew(true);
    setTestOutput("");
  }

  async function saveNew() {
    if (!editName.trim() || !editText.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, question_key: editKey || null, prompt_text: editText }),
    });
    const json = await res.json();
    if (res.ok) {
      await fetchVersions();
      setShowNew(false);
      openVersion(json.version);
    }
    setSaving(false);
  }

  async function saveEdits() {
    if (!selected) return;
    setSaving(true);
    await fetch("/api/admin/prompts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, action: "update", name: editName, prompt_text: editText }),
    });
    await fetchVersions();
    setSaving(false);
  }

  async function promote(id: string) {
    if (!confirm("Promote this version to active? The current active version will be deactivated.")) return;
    await fetch("/api/admin/prompts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "promote" }),
    });
    await fetchVersions();
  }

  async function deleteVersion(id: string) {
    if (!confirm("Delete this prompt version?")) return;
    await fetch("/api/admin/prompts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (selected?.id === id) { setSelected(null); setShowNew(false); }
    await fetchVersions();
  }

  async function runTest() {
    if (!editText.trim()) return;
    setTesting(true);
    setTestOutput("");
    try {
      const res = await fetch("/api/admin/prompts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText: editText,
          answerType: testType,
          session: SAMPLE_SESSION,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Test failed");
      setTestOutput(json.content);
    } catch (err) {
      setTestOutput(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setTesting(false);
    }
  }

  const grouped = ANSWER_TYPES.map((key) => ({
    key,
    versions: versions.filter((v) => v.question_key === key),
  })).filter((g) => g.versions.length > 0);

  const globalVersions = versions.filter((v) => !v.question_key);

  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)]">
      {/* Left sidebar: version list */}
      <div className="w-72 shrink-0 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Prompt Versions</h2>
          <button onClick={openNew} className="text-indigo-600 hover:text-indigo-800">
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-center py-8 text-sm text-gray-400">Loading…</p>
          ) : versions.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">No versions yet</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {globalVersions.length > 0 && (
                <div>
                  <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Global</p>
                  {globalVersions.map((v) => (
                    <VersionRow key={v.id} v={v} selected={selected} onClick={openVersion} />
                  ))}
                </div>
              )}
              {grouped.map(({ key, versions: vs }) => (
                <div key={key}>
                  <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">{key.replace(/_/g, " ")}</p>
                  {vs.map((v) => (
                    <VersionRow key={v.id} v={v} selected={selected} onClick={openVersion} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main editor + test panel */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {!selected && !showNew ? (
          <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-dashed border-gray-300">
            <div className="text-center">
              <p className="text-gray-500 font-medium">Select a version to edit</p>
              <p className="text-sm text-gray-400 mt-1">or create a new one with the + button</p>
            </div>
          </div>
        ) : (
          <>
            {/* Editor */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Prompt version name…"
                    className="w-full text-lg font-semibold text-gray-900 border-0 border-b border-transparent focus:border-indigo-300 focus:outline-none pb-1 bg-transparent"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selected && !selected.is_active && (
                    <button onClick={() => promote(selected.id)} className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-800 font-medium">
                      <ArrowUpCircleIcon className="w-4 h-4" /> Promote
                    </button>
                  )}
                  {selected?.is_active && (
                    <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                      <CheckCircleIcon className="w-4 h-4" /> Active
                    </span>
                  )}
                  <button
                    onClick={showNew ? saveNew : saveEdits}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : showNew ? "Create" : "Save"}
                  </button>
                  {selected && (
                    <button onClick={() => deleteVersion(selected.id)} className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg">
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {showNew && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Answer Type (leave blank for global)</label>
                  <select
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Global (all types)</option>
                    {ANSWER_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              )}

              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Write the system prompt here…"
                className="flex-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Test panel */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">Test Output</h3>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value as AnswerType)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ANSWER_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
                <button
                  onClick={runTest}
                  disabled={testing || !editText.trim()}
                  className="ml-auto px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {testing ? "Running…" : "Run Test"}
                </button>
              </div>
              {testOutput ? (
                <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap font-mono">
                  {testOutput}
                </pre>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  {testing ? "Generating…" : "Run a test to see output against sample session data."}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function VersionRow({
  v,
  selected,
  onClick,
}: {
  v: PromptVersion;
  selected: PromptVersion | null;
  onClick: (v: PromptVersion) => void;
}) {
  return (
    <button
      onClick={() => onClick(v)}
      className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
        selected?.id === v.id ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {v.is_active && <CheckCircleIcon className="w-3.5 h-3.5 text-green-500 shrink-0" />}
        <span className={`truncate font-medium ${v.is_active ? "" : "font-normal"}`}>{v.name}</span>
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{new Date(v.created_at).toLocaleDateString()}</p>
    </button>
  );
}
