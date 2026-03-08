"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Plus, X, Loader2, Check } from "lucide-react";

const STAGES = [
  { value: "recruiter", label: "Recruiter Screen" },
  { value: "hiring_manager", label: "Hiring Manager" },
  { value: "role_play", label: "Cold Call / Roleplay" },
  { value: "panel", label: "Panel / Final" },
  { value: "take_home", label: "Take-Home Assignment" },
];

const OUTCOMES = [
  { value: "offer", label: "Offer 🎉" },
  { value: "rejected", label: "Rejected" },
  { value: "pending", label: "Pending" },
  { value: "withdrew", label: "Withdrew" },
  { value: "ghosted", label: "Ghosted" },
];

const INTERVIEWER_ROLES = ["Recruiter", "SDR Manager", "VP Sales", "AE", "Other"];

const QUESTION_TYPES = [
  { value: "behavioral", label: "Behavioral" },
  { value: "cold_call", label: "Cold call" },
  { value: "situational", label: "Situational" },
  { value: "comp", label: "Comp" },
  { value: "case_study", label: "Case study" },
  { value: "culture", label: "Culture" },
  { value: "other", label: "Other" },
];

interface QuestionRow {
  id: number;
  question: string;
  type: string;
  notes: string;
}

function ReportForm() {
  const params = useSearchParams();
  const sessionId = params.get("sessionId") ?? undefined;
  const companyParam = params.get("company") ?? "";
  const stageParam = params.get("stage") ?? "";

  // Pre-fill role title from sessionStorage if session available
  const [roleTitle, setRoleTitle] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = sessionStorage.getItem(`session-${sessionId}`);
      if (!raw) return "";
      const s = JSON.parse(raw);
      return s.targetRole ?? "";
    } catch {
      return "";
    }
  });

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedCompany, setSubmittedCompany] = useState("");

  // Step 1
  const [companyName, setCompanyName] = useState(companyParam);
  const [stage, setStage] = useState(stageParam);
  const [interviewDate, setInterviewDate] = useState("");

  // Step 2
  const [duration, setDuration] = useState(45);
  const [numInterviewers, setNumInterviewers] = useState<number>(1);
  const [interviewerRoles, setInterviewerRoles] = useState<string[]>([]);
  const [includedRoleplay, setIncludedRoleplay] = useState(false);
  const [roleplayScenario, setRoleplayScenario] = useState("");

  // Step 3
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [nextQId, setNextQId] = useState(1);

  // Step 4
  const [outcome, setOutcome] = useState("");
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [experience, setExperience] = useState("");
  const [notes, setNotes] = useState("");

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { id: nextQId, question: "", type: "behavioral", notes: "" }]);
    setNextQId((n) => n + 1);
  };

  const updateQuestion = (id: number, field: keyof QuestionRow, value: string) => {
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, [field]: value } : q));
  };

  const removeQuestion = (id: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const toggleInterviewerRole = (role: string) => {
    setInterviewerRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmittedCompany(companyName);
    try {
      await fetch("/api/feedback/interview-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prepSessionId: sessionId,
          companyName,
          roleTitle,
          stage,
          interviewDate: interviewDate || undefined,
          outcome: outcome || undefined,
          durationMinutes: duration,
          numInterviewers,
          interviewerRoles,
          questionsAsked: questions
            .filter((q) => q.question.trim())
            .map((q) => ({ question: q.question.trim(), type: q.type, notes: q.notes.trim() || undefined })),
          includedRoleplay,
          roleplayScenario: roleplayScenario.trim() || undefined,
          difficulty: difficulty ?? undefined,
          experience: experience || undefined,
          notes: notes.trim() || undefined,
        }),
      });
    } catch {
      // fire-and-forget
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-lg font-bold text-ink">Thanks — this helps future candidates at {submittedCompany}.</h2>
        <p className="text-sm text-ink-muted">Your report has been submitted.</p>
        <Link href="/dashboard" className="text-sm font-medium text-primary-500 hover:text-primary-600 mt-2">
          Back to dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s === step
                  ? "bg-primary-500 text-white"
                  : s < step
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-ink-muted"
              }`}
            >
              {s < step ? <Check className="w-3 h-3" /> : s}
            </div>
            {s < 4 && <div className={`w-8 h-0.5 rounded-full ${s < step ? "bg-green-300" : "bg-gray-200"}`} />}
          </div>
        ))}
        <span className="text-xs text-ink-muted ml-2">
          {step === 1 ? "About the interview" : step === 2 ? "What happened" : step === 3 ? "Questions asked" : "Outcome"}
        </span>
      </div>

      {/* Step 1 — About the interview */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-ink">About the interview</h2>
          <div>
            <label className="text-xs font-medium text-ink-muted mb-1 block">Company name *</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Salesforce"
              className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#FAFCFF] placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted mb-1 block">Role title *</label>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. SDR, Account Executive"
              className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#FAFCFF] placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted mb-1 block">Stage *</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#FAFCFF]"
            >
              <option value="">Select stage…</option>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted mb-1 block">Interview date (optional)</label>
            <input
              type="date"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#FAFCFF]"
            />
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!companyName.trim() || !roleTitle.trim() || !stage}
            className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {/* Step 2 — What happened */}
      {step === 2 && (
        <div className="space-y-5">
          <h2 className="text-base font-bold text-ink">What happened</h2>
          <div>
            <label className="text-xs font-medium text-ink-muted mb-2 block">
              Duration: <span className="text-ink font-semibold">{duration} minutes</span>
            </label>
            <input
              type="range"
              min={15}
              max={120}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-primary-500"
            />
            <div className="flex justify-between text-xs text-ink-muted mt-1">
              <span>15 min</span>
              <span>120 min</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted mb-2 block">Number of interviewers</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumInterviewers(n)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    numInterviewers === n
                      ? "border-primary-500 bg-primary-50 text-primary-600"
                      : "border-gray-200 text-ink-muted hover:border-gray-300"
                  }`}
                >
                  {n === 4 ? "4+" : n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted mb-2 block">Interviewer roles (select all that apply)</label>
            <div className="flex flex-wrap gap-2">
              {INTERVIEWER_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => toggleInterviewerRole(role)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                    interviewerRoles.includes(role)
                      ? "border-primary-500 bg-primary-50 text-primary-600"
                      : "border-gray-200 text-ink-muted hover:border-gray-300"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted mb-2 block">Included a roleplay?</label>
            <div className="flex gap-2">
              {[{ val: true, label: "Yes" }, { val: false, label: "No" }].map(({ val, label }) => (
                <button
                  key={label}
                  onClick={() => setIncludedRoleplay(val)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    includedRoleplay === val
                      ? "border-primary-500 bg-primary-50 text-primary-600"
                      : "border-gray-200 text-ink-muted hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {includedRoleplay && (
            <div>
              <label className="text-xs font-medium text-ink-muted mb-1 block">Roleplay scenario (optional)</label>
              <textarea
                value={roleplayScenario}
                onChange={(e) => setRoleplayScenario(e.target.value)}
                placeholder="e.g. Cold calling a VP of Sales at a 200-person SaaS company…"
                rows={2}
                className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#FAFCFF] placeholder:text-ink-muted resize-none"
              />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-2.5 border border-gray-200 text-ink-muted hover:text-ink hover:bg-gray-50 text-sm rounded-xl transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Questions asked */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-ink">Questions asked</h2>
            <p className="text-xs text-ink-muted mt-0.5">None required — add as many as you remember.</p>
          </div>
          {questions.map((q) => (
            <div key={q.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={q.type}
                  onChange={(e) => updateQuestion(q.id, "type", e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-ink-muted"
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeQuestion(q.id)}
                  className="ml-auto p-1 rounded text-ink-muted hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={q.question}
                onChange={(e) => updateQuestion(q.id, "question", e.target.value)}
                placeholder="What was the question?"
                rows={2}
                className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white placeholder:text-ink-muted resize-none"
              />
              <input
                type="text"
                value={q.notes}
                onChange={(e) => updateQuestion(q.id, "notes", e.target.value)}
                placeholder="Notes (optional)"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-400 bg-white placeholder:text-ink-muted"
              />
            </div>
          ))}
          <button
            onClick={addQuestion}
            className="flex items-center gap-1.5 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add question
          </button>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-2.5 border border-gray-200 text-ink-muted hover:text-ink hover:bg-gray-50 text-sm rounded-xl transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Outcome */}
      {step === 4 && (
        <div className="space-y-5">
          <h2 className="text-base font-bold text-ink">Outcome</h2>
          <div>
            <label className="text-xs font-medium text-ink-muted mb-2 block">What was the result?</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setOutcome(o.value)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    outcome === o.value
                      ? "border-primary-500 bg-primary-50 text-primary-600"
                      : "border-gray-200 text-ink-muted hover:border-gray-300"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted mb-2 block">
              Difficulty: <span className="text-ink font-semibold">{difficulty ? `${difficulty}/5` : "Not rated"}</span>
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setDifficulty(n)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    difficulty === n
                      ? "border-primary-500 bg-primary-50 text-primary-600"
                      : "border-gray-200 text-ink-muted hover:border-gray-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted mb-2 block">How was the experience?</label>
            <div className="flex gap-2">
              {[
                { value: "positive", label: "Positive 🙌" },
                { value: "neutral", label: "Neutral 😐" },
                { value: "negative", label: "Negative 😓" },
              ].map((e) => (
                <button
                  key={e.value}
                  onClick={() => setExperience(e.value)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    experience === e.value
                      ? "border-primary-500 bg-primary-50 text-primary-600"
                      : "border-gray-200 text-ink-muted hover:border-gray-300"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted mb-1 block">Anything else to note? (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Surprises, things to prep better next time, vibe of the interviewer…"
              rows={3}
              className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#FAFCFF] placeholder:text-ink-muted resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-2.5 border border-gray-200 text-ink-muted hover:text-ink hover:bg-gray-50 text-sm rounded-xl transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
              ) : (
                "Submit report"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  return (
    <div className="space-y-5 pb-20 md:pb-8 max-w-lg">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/dashboard" className="hover:text-ink transition-colors">Dashboard</Link>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-ink font-medium">Interview Report</span>
      </nav>

      <div>
        <h1 className="text-xl font-bold text-ink">Report back</h1>
        <p className="text-sm text-ink-muted mt-1">
          What actually happened in your interview helps future candidates prepare better.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#DBEAFE] p-5 shadow-sm">
        <Suspense fallback={
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        }>
          <ReportForm />
        </Suspense>
      </div>
    </div>
  );
}
