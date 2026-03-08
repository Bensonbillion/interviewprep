"use client";

import { useEffect, useState } from "react";
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface GoldenExample {
  id: string;
  question_key: string;
  role_type?: string | null;
  round_type?: string | null;
  question_text: string;
  answer_text: string;
  framework?: string;
  quality_score: number;
  notes?: string;
  source?: string;
  is_active: boolean;
  created_at: string;
}

const ANSWER_TYPES = [
  "tell_me_about_yourself", "why_sales", "why_this_company", "behavioral_star",
  "comp_expectations", "role_play_script", "objection_response", "company_brief",
  "cheat_sheet", "questions_to_ask", "coachability_coaching", "career_switcher_bridge",
];
const ROLE_TYPES = ["sdr", "ae", "csm", "se", "manager", "any"];
const ROUND_TYPES = ["recruiter", "hiring_manager", "role_play", "panel", "any"];

const QUALITY_COLORS = [
  "", // 0
  "bg-red-200 text-red-800",    // 1
  "bg-red-100 text-red-700",    // 2
  "bg-orange-100 text-orange-700", // 3
  "bg-orange-100 text-orange-600", // 4
  "bg-yellow-100 text-yellow-700", // 5
  "bg-yellow-100 text-yellow-600", // 6
  "bg-lime-100 text-lime-700",  // 7
  "bg-green-100 text-green-700", // 8
  "bg-green-200 text-green-800", // 9
  "bg-emerald-200 text-emerald-800", // 10
];

const emptyForm = {
  question_key: ANSWER_TYPES[0],
  role_type: "",
  round_type: "",
  question_text: "",
  answer_text: "",
  framework: "",
  quality_score: 8,
  notes: "",
  source: "",
};

export default function GoldenExamplesPage() {
  const [examples, setExamples] = useState<GoldenExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GoldenExample | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  async function fetchExamples(qk = "") {
    setLoading(true);
    const url = "/api/admin/examples" + (qk ? `?question_key=${qk}` : "");
    const res = await fetch(url);
    const json = await res.json();
    setExamples(json.examples ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchExamples(filterType); }, [filterType]);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  }

  function openEdit(ex: GoldenExample) {
    setEditing(ex);
    setForm({
      question_key: ex.question_key,
      role_type: ex.role_type ?? "",
      round_type: ex.round_type ?? "",
      question_text: ex.question_text,
      answer_text: ex.answer_text,
      framework: ex.framework ?? "",
      quality_score: ex.quality_score,
      notes: ex.notes ?? "",
      source: ex.source ?? "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...form,
      role_type: form.role_type || null,
      round_type: form.round_type || null,
      framework: form.framework || undefined,
      notes: form.notes || undefined,
      source: form.source || undefined,
    };

    try {
      if (editing) {
        const res = await fetch("/api/admin/examples", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...payload }),
        });
        if (!res.ok) throw new Error("Update failed");
      } else {
        const res = await fetch("/api/admin/examples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Create failed");
      }
      setShowModal(false);
      await fetchExamples(filterType);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(ex: GoldenExample) {
    await fetch("/api/admin/examples", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ex.id, is_active: !ex.is_active }),
    });
    await fetchExamples(filterType);
  }

  async function deleteExample(id: string) {
    if (!confirm("Delete this golden example?")) return;
    await fetch("/api/admin/examples", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchExamples(filterType);
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Golden Examples</h1>
          <p className="text-sm text-gray-500 mt-1">Few-shot examples injected into generation for high-quality answers.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          <PlusIcon className="w-4 h-4" /> Add Example
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All answer types</option>
          {ANSWER_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <span className="ml-3 text-sm text-gray-400">{examples.length} example{examples.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : examples.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 font-medium">No golden examples yet</p>
          <p className="text-sm text-gray-400 mt-1">Add curated examples to improve generation quality.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {examples.map((ex) => (
            <div key={ex.id} className={`bg-white rounded-xl border ${ex.is_active ? "border-gray-200" : "border-gray-200 opacity-60"} p-4`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {ex.question_key.replace(/_/g, "_")}
                    </span>
                    {ex.role_type && (
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{ex.role_type}</span>
                    )}
                    {ex.round_type && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{ex.round_type}</span>
                    )}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${QUALITY_COLORS[ex.quality_score] ?? "bg-gray-100 text-gray-600"}`}>
                      Q:{ex.quality_score}
                    </span>
                    {!ex.is_active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">inactive</span>}
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1 truncate">{ex.question_text}</p>
                  <p className="text-sm text-gray-500 line-clamp-2">{ex.answer_text}</p>
                  {ex.notes && <p className="text-xs text-gray-400 mt-1 italic">{ex.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(ex)}
                    title={ex.is_active ? "Deactivate" : "Activate"}
                    className={`rounded-full p-1 ${ex.is_active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}
                  >
                    {ex.is_active ? <CheckIcon className="w-4 h-4" /> : <XMarkIcon className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(ex)} className="text-gray-400 hover:text-indigo-600 p-1">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteExample(ex.id)} className="text-gray-400 hover:text-red-600 p-1">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editing ? "Edit Example" : "Add Golden Example"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Answer Type*</label>
                  <select value={form.question_key} onChange={(e) => setForm({ ...form, question_key: e.target.value })} className={inputClass}>
                    {ANSWER_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role Type</label>
                  <select value={form.role_type} onChange={(e) => setForm({ ...form, role_type: e.target.value })} className={inputClass}>
                    <option value="">Any</option>
                    {ROLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Round Type</label>
                  <select value={form.round_type} onChange={(e) => setForm({ ...form, round_type: e.target.value })} className={inputClass}>
                    <option value="">Any</option>
                    {ROUND_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Quality Score: <span className="font-bold text-indigo-600">{form.quality_score}/10</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={form.quality_score}
                  onChange={(e) => setForm({ ...form, quality_score: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Question / Prompt*</label>
                <textarea
                  value={form.question_text}
                  onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                  rows={2}
                  placeholder="e.g. Tell me about yourself"
                  className={`${inputClass} resize-none`}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Answer*</label>
                <textarea
                  value={form.answer_text}
                  onChange={(e) => setForm({ ...form, answer_text: e.target.value })}
                  rows={8}
                  placeholder="The ideal answer text…"
                  className={`${inputClass} resize-none`}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Framework (optional)</label>
                  <input value={form.framework} onChange={(e) => setForm({ ...form, framework: e.target.value })} placeholder="e.g. STAR" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Source (optional)</label>
                  <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. Chris Voss coaching" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (internal)</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Why this is a great example…" className={inputClass} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {submitting ? "Saving…" : editing ? "Save Changes" : "Add Example"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
