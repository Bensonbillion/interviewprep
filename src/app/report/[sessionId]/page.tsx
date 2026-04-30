"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { PrepSession, AnswerType } from "@/types";
import type { QuestionCategory } from "@/types/feedback";
import {
  ChevronRight,
  Plus,
  X,
  Loader2,
  Check,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = [
  { value: "recruiter", label: "Recruiter Screen" },
  { value: "hiring_manager", label: "Hiring Manager" },
  { value: "role_play", label: "Cold Call / Roleplay" },
  { value: "panel", label: "Panel / Final" },
  { value: "take_home", label: "Take-Home Assignment" },
  { value: "other", label: "Other" },
];

const FORMATS = [
  { value: "phone", label: "Phone" },
  { value: "video", label: "Video" },
  { value: "in_person", label: "In Person" },
];

const DURATIONS = [15, 20, 30, 45, 60];

const QUESTION_CATEGORIES: { value: QuestionCategory; label: string }[] = [
  { value: "behavioral", label: "Behavioral" },
  { value: "situational", label: "Situational" },
  { value: "roleplay", label: "Roleplay" },
  { value: "technical", label: "Technical" },
  { value: "culture_fit", label: "Culture fit" },
  { value: "case_study", label: "Case study" },
  { value: "closing", label: "Closing" },
  { value: "curveball", label: "Curveball" },
];

const ANSWER_TYPE_LABELS: Record<string, string> = {
  tell_me_about_yourself: "Tell me about yourself",
  why_sales: "Why sales?",
  why_this_company: "Why this company?",
  behavioral_star: "Behavioral / STAR story",
  comp_expectations: "Compensation expectations",
  role_play_script: "Roleplay / cold call",
  objection_response: "Objection handling",
  coachability_coaching: "Coachability",
  resume_walkthrough: "Walk me through your resume",
  career_switcher_bridge: "Career switch framing",
  constructive_feedback: "Self-improvement / weakness",
};

const HELPFULNESS_OPTIONS = [
  { value: true, label: "Yes, a lot" },
  { value: null, label: "Somewhat" },
  { value: false, label: "Not really" },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionEntry {
  id: number;
  questionText: string;
  questionCategory: QuestionCategory | "";
  wasExpected: boolean | null;
  feltPrepared: boolean | null;
  ourAnswerWasHelpful: boolean | null;
  whatIActuallySaid: string;
  whatIWishISaid: string;
  matchedAnswerType: string;
  expanded: boolean;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<PrepSession | null>(null);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [nextQId, setNextQId] = useState(100);

  // Step 1 — Quick hits
  const [stage, setStage] = useState("");
  const [format, setFormat] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [experience, setExperience] = useState("");

  // Step 2 — Questions
  const [questions, setQuestions] = useState<QuestionEntry[]>([]);

  // Step 3 — Process intel
  const [totalStages, setTotalStages] = useState<number | null>(null);
  const [currentStageNum, setCurrentStageNum] = useState<number | null>(null);
  const [daysSinceApp, setDaysSinceApp] = useState("");
  const [interviewerTitle, setInterviewerTitle] = useState("");

  // Step 4 — Outcome
  const [outcome, setOutcome] = useState("pending");
  const [notes, setNotes] = useState("");

  // Load session from sessionStorage, fall back to API
  useEffect(() => {
    const raw = sessionStorage.getItem(`session-${sessionId}`);
    if (raw) {
      try {
        const s = JSON.parse(raw) as PrepSession;
        // sessionStorage read deferred to effect for SSR-safety.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSession(s);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStage(s.stage);
        return;
      } catch {
        // fall through to API
      }
    }
    // Fallback: load from Supabase
    fetch(`/api/session/${sessionId}`)
      .then((res) => {
        if (!res.ok) return;
        return res.json();
      })
      .then((data) => {
        if (!data?.session) return;
        const s = data.session as PrepSession;
        setSession(s);
        setStage(s.stage);
        sessionStorage.setItem(`session-${sessionId}`, JSON.stringify(s));
      })
      .catch(() => {/* user can still fill manually */});
  }, [sessionId]);

  // Pre-populate suggested questions from prep kit answer types
  useEffect(() => {
    if (!session) return;
    const answerTypes = session.answerSlots
      .filter((s) => s.status === "unlocked" && s.content)
      .map((s) => s.type)
      .filter((t) => ANSWER_TYPE_LABELS[t]);

    if (answerTypes.length === 0) return;

    const suggestions: QuestionEntry[] = answerTypes.slice(0, 6).map((type, i) => ({
      id: i + 1,
      questionText: ANSWER_TYPE_LABELS[type] ?? "",
      questionCategory: "" as QuestionCategory | "",
      wasExpected: null,
      feltPrepared: null,
      ourAnswerWasHelpful: null,
      whatIActuallySaid: "",
      whatIWishISaid: "",
      matchedAnswerType: type,
      expanded: false,
    }));
    // Pre-population is intentional sync from session prop after fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuestions(suggestions);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNextQId(suggestions.length + 1);
  }, [session]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: nextQId,
        questionText: "",
        questionCategory: "",
        wasExpected: null,
        feltPrepared: null,
        ourAnswerWasHelpful: null,
        whatIActuallySaid: "",
        whatIWishISaid: "",
        matchedAnswerType: "",
        expanded: true,
      },
    ]);
    setNextQId((n) => n + 1);
  };

  const updateQ = (id: number, updates: Partial<QuestionEntry>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const removeQ = (id: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const step1Valid = !!stage && !!format && !!duration && !!difficulty && !!experience;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prepSessionId: sessionId,
          companyName: session?.companyName ?? "Unknown",
          roleTitle: session?.targetRole ?? "Unknown",
          stage,
          interviewFormat: format || undefined,
          durationMinutes: duration ?? undefined,
          difficultyRating: difficulty ?? undefined,
          experienceRating: experience || undefined,
          overallNotes: notes.trim() || undefined,
          interviewerTitle: interviewerTitle.trim() || undefined,
          totalStagesInProcess: totalStages ?? undefined,
          currentStageNumber: currentStageNum ?? undefined,
          daysSinceApplication: daysSinceApp ? parseInt(daysSinceApp, 10) : undefined,
          outcome: outcome || "pending",
          questions: questions
            .filter((q) => q.questionText.trim())
            .map((q) => ({
              questionText: q.questionText,
              questionCategory: q.questionCategory || undefined,
              wasExpected: q.wasExpected,
              feltPrepared: q.feltPrepared,
              ourAnswerWasHelpful: q.ourAnswerWasHelpful,
              whatIActuallySaid: q.whatIActuallySaid.trim() || undefined,
              whatIWishISaid: q.whatIWishISaid.trim() || undefined,
              matchedAnswerType: q.matchedAnswerType || undefined,
            })),
        }),
      });
    } catch {
      // fire-and-forget
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  // ─── Submitted state ───────────────────────────────────────────────────────

  if (submitted) {
    const company = session?.companyName ?? "this company";
    return (
      <div className="space-y-5 pb-20 md:pb-8 max-w-lg">
        <nav className="flex items-center gap-1.5 text-sm text-ink-muted">
          <Link href="/dashboard" className="hover:text-ink transition-colors">Dashboard</Link>
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-ink font-medium">Report Submitted</span>
        </nav>

        <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-ink">Thanks — this helps future candidates at {company}.</h2>
          <p className="text-sm text-ink-muted max-w-xs">
            Your report has been submitted. Update the outcome when you hear back.
          </p>

          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5 mt-4 w-full max-w-sm text-left">
            <p className="text-sm font-semibold text-ink mb-1">
              Want to see what others experienced at {company}?
            </p>
            <p className="text-xs text-ink-muted mb-3">
              Company playbooks unlock after you submit your first interview report.
            </p>
            <Link
              href={`/playbook/${encodeURIComponent((session?.companyName ?? "").toLowerCase().trim())}`}
              className="text-xs font-medium text-primary-500 hover:text-primary-600"
            >
              See company playbook →
            </Link>
          </div>

          <Link href="/dashboard" className="text-sm font-medium text-primary-500 hover:text-primary-600 mt-2">
            Back to dashboard →
          </Link>
        </div>
      </div>
    );
  }

  // ─── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 pb-20 md:pb-8 max-w-lg">
      <nav className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/dashboard" className="hover:text-ink transition-colors">Dashboard</Link>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-ink font-medium">Interview Report</span>
      </nav>

      <div>
        <h1 className="text-xl font-bold text-ink">How did it go?</h1>
        {session && (
          <p className="text-sm text-ink-muted mt-1">
            {session.companyName} — {session.targetRole}
          </p>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-1">
            <button
              onClick={() => s < step && setStep(s)}
              disabled={s > step}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s === step
                  ? "bg-primary-500 text-white"
                  : s < step
                  ? "bg-green-100 text-green-600 hover:bg-green-200 cursor-pointer"
                  : "bg-gray-100 text-ink-muted"
              }`}
            >
              {s < step ? <Check className="w-3.5 h-3.5" /> : s}
            </button>
            {s < 4 && <div className={`w-6 h-0.5 rounded-full ${s < step ? "bg-green-300" : "bg-gray-200"}`} />}
          </div>
        ))}
        <span className="text-xs text-ink-muted ml-2">
          {step === 1 ? "Quick hits" : step === 2 ? "Questions asked" : step === 3 ? "Process intel" : "Outcome"}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-[#DBEAFE] p-5 shadow-sm">

        {/* ════════════ STEP 1: Quick Hits ════════════ */}
        {step === 1 && (
          <div className="space-y-5">
            <p className="text-xs text-ink-muted">Takes about 30 seconds</p>

            {/* Stage */}
            <div>
              <label className="text-xs font-medium text-ink-muted mb-1.5 block">Interview stage *</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {STAGES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStage(s.value)}
                    className={`py-2 rounded-xl border text-sm font-medium transition-colors ${
                      stage === s.value ? "border-primary-500 bg-primary-50 text-primary-600" : "border-gray-200 text-ink-muted hover:border-gray-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="text-xs font-medium text-ink-muted mb-1.5 block">Format *</label>
              <div className="flex gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      format === f.value ? "border-primary-500 bg-primary-50 text-primary-600" : "border-gray-200 text-ink-muted hover:border-gray-300"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-medium text-ink-muted mb-1.5 block">Duration *</label>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      duration === d ? "border-primary-500 bg-primary-50 text-primary-600" : "border-gray-200 text-ink-muted hover:border-gray-300"
                    }`}
                  >
                    {d === 60 ? "60+" : d}m
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-xs font-medium text-ink-muted mb-1.5 block">
                Difficulty *{difficulty ? ` — ${difficulty}/5` : ""}
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setDifficulty(n)}
                    className="p-1 transition-colors"
                    title={`${n}/5`}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        difficulty && n <= difficulty ? "fill-amber-400 text-amber-400" : "text-gray-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div>
              <label className="text-xs font-medium text-ink-muted mb-1.5 block">Experience *</label>
              <div className="flex gap-2">
                {[
                  { value: "positive", label: "Positive", emoji: "\u{1F60A}" },
                  { value: "neutral", label: "Neutral", emoji: "\u{1F610}" },
                  { value: "negative", label: "Negative", emoji: "\u{1F61E}" },
                ].map((e) => (
                  <button
                    key={e.value}
                    onClick={() => setExperience(e.value)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      experience === e.value ? "border-primary-500 bg-primary-50 text-primary-600" : "border-gray-200 text-ink-muted hover:border-gray-300"
                    }`}
                  >
                    <span>{e.emoji}</span> {e.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next — Questions asked →
            </button>
          </div>
        )}

        {/* ════════════ STEP 2: Questions Asked ════════════ */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-ink">What questions did they ask?</h2>
              <p className="text-xs text-ink-muted mt-0.5">
                {questions.length > 0
                  ? "We pre-filled from your prep kit. Mark which ones came up."
                  : "Add questions you remember — this is the most valuable data."}
              </p>
            </div>

            {questions.map((q) => (
              <div key={q.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <input
                    type="text"
                    value={q.questionText}
                    onChange={(e) => updateQ(q.id, { questionText: e.target.value })}
                    placeholder="What was the question?"
                    className="flex-1 text-sm border border-[#DBEAFE] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white placeholder:text-gray-400"
                  />
                  <button
                    onClick={() => updateQ(q.id, { expanded: !q.expanded })}
                    className="p-2 text-ink-muted hover:text-ink transition-colors flex-shrink-0"
                  >
                    {q.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => removeQ(q.id)}
                    className="p-2 text-ink-muted hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick row: category + prepared */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={q.questionCategory}
                    onChange={(e) => updateQ(q.id, { questionCategory: e.target.value as QuestionCategory | "" })}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-ink-muted"
                  >
                    <option value="">Category</option>
                    {QUESTION_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 text-xs text-ink-muted">
                    <span>Prepared?</span>
                    {[
                      { val: true, label: "Yes" },
                      { val: false, label: "No" },
                    ].map(({ val, label }) => (
                      <button
                        key={label}
                        onClick={() => updateQ(q.id, { feltPrepared: q.feltPrepared === val ? null : val })}
                        className={`px-2 py-0.5 rounded text-xs transition-colors ${
                          q.feltPrepared === val ? "bg-primary-100 text-primary-600" : "bg-gray-100 text-ink-muted hover:bg-gray-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-ink-muted">
                    <span>SalesPrep help?</span>
                    {HELPFULNESS_OPTIONS.map((opt) => (
                      <button
                        key={String(opt.value)}
                        onClick={() => updateQ(q.id, { ourAnswerWasHelpful: q.ourAnswerWasHelpful === opt.value ? null : (opt.value as boolean | null) })}
                        className={`px-2 py-0.5 rounded text-xs transition-colors ${
                          q.ourAnswerWasHelpful === opt.value ? "bg-primary-100 text-primary-600" : "bg-gray-100 text-ink-muted hover:bg-gray-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expanded details */}
                {q.expanded && (
                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="text-xs text-ink-muted mb-0.5 block">What did you actually say? <span className="opacity-60">(optional)</span></label>
                      <textarea
                        value={q.whatIActuallySaid}
                        onChange={(e) => updateQ(q.id, { whatIActuallySaid: e.target.value })}
                        placeholder="Your actual answer..."
                        rows={2}
                        className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white placeholder:text-ink-muted resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-ink-muted mb-0.5 block">What do you wish you&apos;d said? <span className="opacity-60">(optional)</span></label>
                      <textarea
                        value={q.whatIWishISaid}
                        onChange={(e) => updateQ(q.id, { whatIWishISaid: e.target.value })}
                        placeholder="The better answer you thought of later..."
                        rows={2}
                        className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white placeholder:text-ink-muted resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {questions.length < 10 && (
              <button
                onClick={addQuestion}
                className="flex items-center gap-1.5 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add question
              </button>
            )}

            <div className="flex gap-2 pt-2">
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
                Next — Process intel →
              </button>
            </div>
          </div>
        )}

        {/* ════════════ STEP 3: Process Intel ════════════ */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-ink">Help others who interview here</h2>
              <p className="text-xs text-ink-muted mt-0.5">All optional — share what you know.</p>
            </div>

            <div>
              <label className="text-xs font-medium text-ink-muted mb-1.5 block">How many total stages in their process?</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTotalStages(totalStages === n ? null : n)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      totalStages === n ? "border-primary-500 bg-primary-50 text-primary-600" : "border-gray-200 text-ink-muted hover:border-gray-300"
                    }`}
                  >
                    {n === 6 ? "6+" : n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-ink-muted mb-1.5 block">Which stage number was this?</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCurrentStageNum(currentStageNum === n ? null : n)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      currentStageNum === n ? "border-primary-500 bg-primary-50 text-primary-600" : "border-gray-200 text-ink-muted hover:border-gray-300"
                    }`}
                  >
                    {n === 5 ? "5th+" : `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-ink-muted mb-1 block">Days since you applied</label>
              <input
                type="number"
                value={daysSinceApp}
                onChange={(e) => setDaysSinceApp(e.target.value)}
                placeholder="e.g. 14"
                min={0}
                className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#FAFCFF] placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-ink-muted mb-1 block">Interviewer title</label>
              <input
                type="text"
                value={interviewerTitle}
                onChange={(e) => setInterviewerTitle(e.target.value)}
                placeholder="e.g. VP of Sales, SDR Manager"
                className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#FAFCFF] placeholder:text-gray-400"
              />
            </div>

            <div className="flex gap-2 pt-2">
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
                Next — Outcome →
              </button>
            </div>
          </div>
        )}

        {/* ════════════ STEP 4: Outcome ════════════ */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-ink">Current status</h2>
              <p className="text-xs text-ink-muted mt-0.5">
                We&apos;ll check back on this — update when you hear back.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { value: "advanced", label: "Advancing" },
                { value: "pending", label: "Waiting to hear" },
                { value: "offer", label: "Got an offer!" },
                { value: "rejected", label: "Rejected" },
                { value: "withdrew", label: "Withdrew" },
                { value: "ghosted", label: "Ghosted" },
              ].map((o) => (
                <button
                  key={o.value}
                  onClick={() => setOutcome(o.value)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    outcome === o.value ? "border-primary-500 bg-primary-50 text-primary-600" : "border-gray-200 text-ink-muted hover:border-gray-300"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs text-amber-700">
                Update this when you hear back — it helps us figure out what actually works vs what just feels good.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-ink-muted mb-1 block">Anything else to note? <span className="opacity-60">(optional)</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Surprises, tips for others, vibe of the interviewer..."
                rows={3}
                className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-[#FAFCFF] placeholder:text-ink-muted resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
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
                  <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</>
                ) : (
                  "Submit report"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
