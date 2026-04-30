"use client";

import { useEffect, useState } from "react";
import { PlusIcon, TrashIcon, PencilIcon } from "@heroicons/react/24/outline";

interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  tone_keywords: string[];
  is_active: boolean;
}

interface StyleRule {
  id: string;
  voice_id: string;
  rule_type: "banned_phrase" | "replacement" | "tone_instruction" | "format_rule";
  rule_text: string;
  replacement?: string | null;
  severity?: "error" | "warning" | "suggestion" | null;
}

const RULE_TYPE_LABELS: Record<string, string> = {
  banned_phrase: "Banned Phrase",
  replacement: "Replacement",
  tone_instruction: "Tone Instruction",
  format_rule: "Format Rule",
};

const RULE_TYPE_COLORS: Record<string, string> = {
  banned_phrase: "bg-red-50 text-red-700 border-red-200",
  replacement: "bg-blue-50 text-blue-700 border-blue-200",
  tone_instruction: "bg-purple-50 text-purple-700 border-purple-200",
  format_rule: "bg-green-50 text-green-700 border-green-200",
};

const SEVERITY_BADGE: Record<string, string> = {
  error: "bg-red-100 text-red-700",
  warning: "bg-yellow-100 text-yellow-700",
  suggestion: "bg-gray-100 text-gray-600",
};

export default function VoiceStylePage() {
  const [voice, setVoice] = useState<VoiceProfile | null>(null);
  const [rules, setRules] = useState<StyleRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Voice edit state
  const [editingVoice, setEditingVoice] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState({ description: "", tone_keywords: "" });
  const [savingVoice, setSavingVoice] = useState(false);

  // Add rule state
  const [showAddRule, setShowAddRule] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    rule_type: "banned_phrase",
    rule_text: "",
    replacement: "",
    severity: "warning",
  });
  const [savingRule, setSavingRule] = useState(false);

  async function fetchData() {
    setLoading(true);
    const res = await fetch("/api/admin/voice");
    const json = await res.json();
    setVoice(json.voice ?? null);
    setRules(json.rules ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // fetchData calls setLoading(true) synchronously before its await; that
    // initial spinner-on-mount is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  function startEditVoice() {
    if (!voice) return;
    setVoiceDraft({
      description: voice.description ?? "",
      tone_keywords: (voice.tone_keywords ?? []).join(", "),
    });
    setEditingVoice(true);
  }

  async function saveVoice() {
    if (!voice) return;
    setSavingVoice(true);
    const keywords = voiceDraft.tone_keywords.split(",").map((k) => k.trim()).filter(Boolean);
    await fetch("/api/admin/voice", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: voice.id, description: voiceDraft.description, tone_keywords: keywords }),
    });
    setSavingVoice(false);
    setEditingVoice(false);
    await fetchData();
  }

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    if (!voice) return;
    setSavingRule(true);
    await fetch("/api/admin/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voice_id: voice.id,
        rule_type: ruleForm.rule_type,
        rule_text: ruleForm.rule_text,
        replacement: ruleForm.replacement || null,
        severity: ruleForm.severity || null,
      }),
    });
    setSavingRule(false);
    setShowAddRule(false);
    setRuleForm({ rule_type: "banned_phrase", rule_text: "", replacement: "", severity: "warning" });
    await fetchData();
  }

  async function deleteRule(id: string) {
    if (!confirm("Remove this style rule?")) return;
    await fetch("/api/admin/voice", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchData();
  }

  const rulesByType = Object.keys(RULE_TYPE_LABELS).map((rt) => ({
    type: rt,
    rules: rules.filter((r) => r.rule_type === rt),
  })).filter((g) => g.rules.length > 0);

  if (loading) return <div className="text-center py-16 text-gray-400">Loading…</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Voice & Style</h1>
        <p className="text-sm text-gray-500 mt-1">Control the tone, language, and writing style injected into every generation.</p>
      </div>

      {/* Voice Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{voice?.name ?? "Voice Profile"}</h2>
          {!editingVoice && (
            <button onClick={startEditVoice} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              <PencilIcon className="w-4 h-4" /> Edit
            </button>
          )}
        </div>

        {editingVoice ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={voiceDraft.description}
                onChange={(e) => setVoiceDraft({ ...voiceDraft, description: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tone Keywords (comma-separated)</label>
              <input
                value={voiceDraft.tone_keywords}
                onChange={(e) => setVoiceDraft({ ...voiceDraft, tone_keywords: e.target.value })}
                placeholder="e.g. confident, direct, warm, conversational"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={saveVoice} disabled={savingVoice} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {savingVoice ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditingVoice(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Description</p>
              <p className="text-sm text-gray-800 leading-relaxed">{voice?.description || <span className="italic text-gray-400">No description set</span>}</p>
            </div>
            {(voice?.tone_keywords ?? []).length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Tone Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {(voice?.tone_keywords ?? []).map((k) => (
                    <span key={k} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-full">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Style Rules */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Style Rules</h2>
            <p className="text-sm text-gray-500">{rules.length} rule{rules.length !== 1 ? "s" : ""} active</p>
          </div>
          <button
            onClick={() => setShowAddRule(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <PlusIcon className="w-4 h-4" /> Add Rule
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No style rules yet. Add rules to control language and formatting.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {rulesByType.map(({ type, rules: typeRules }) => (
              <div key={type}>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  {RULE_TYPE_LABELS[type]} <span className="font-normal normal-case text-gray-400">({typeRules.length})</span>
                </h3>
                <div className="space-y-2">
                  {typeRules.map((rule) => (
                    <div key={rule.id} className={`flex items-start gap-3 p-3 rounded-lg border ${RULE_TYPE_COLORS[rule.rule_type] ?? "bg-gray-50 border-gray-200"}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{rule.rule_text}</p>
                        {rule.replacement && (
                          <p className="text-xs mt-0.5 opacity-80">→ Use instead: <span className="font-medium">{rule.replacement}</span></p>
                        )}
                        {rule.severity && (
                          <span className={`inline-block text-xs px-1.5 py-0.5 rounded mt-1 ${SEVERITY_BADGE[rule.severity] ?? ""}`}>
                            {rule.severity}
                          </span>
                        )}
                      </div>
                      <button onClick={() => deleteRule(rule.id)} className="opacity-50 hover:opacity-100 shrink-0">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Rule Modal */}
      {showAddRule && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Style Rule</h2>
            <form onSubmit={addRule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Type</label>
                <select
                  value={ruleForm.rule_type}
                  onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.entries(RULE_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {ruleForm.rule_type === "banned_phrase" ? "Banned Phrase" :
                   ruleForm.rule_type === "replacement" ? "Phrase to Replace" :
                   "Rule"}
                </label>
                <input
                  required
                  value={ruleForm.rule_text}
                  onChange={(e) => setRuleForm({ ...ruleForm, rule_text: e.target.value })}
                  placeholder={ruleForm.rule_type === "banned_phrase" ? "e.g. I'm passionate about…" :
                               ruleForm.rule_type === "replacement" ? "e.g. synergy" :
                               ruleForm.rule_type === "tone_instruction" ? "e.g. Use first-person perspective" :
                               "e.g. Never use bullet points for the opening"}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {ruleForm.rule_type === "replacement" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Replace With</label>
                  <input
                    value={ruleForm.replacement}
                    onChange={(e) => setRuleForm({ ...ruleForm, replacement: e.target.value })}
                    placeholder="e.g. collaboration"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
              {(ruleForm.rule_type === "banned_phrase" || ruleForm.rule_type === "replacement") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select
                    value={ruleForm.severity}
                    onChange={(e) => setRuleForm({ ...ruleForm, severity: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="error">Error</option>
                    <option value="warning">Warning</option>
                    <option value="suggestion">Suggestion</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddRule(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={savingRule} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {savingRule ? "Adding…" : "Add Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
