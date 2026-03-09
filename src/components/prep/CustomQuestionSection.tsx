"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Plus, Loader2, Zap, Copy, Check, Pencil, X } from "lucide-react";
import type { PrepSession, InterviewStage } from "@/types";

export interface CustomQuestion {
  id: string;
  questionText: string;
  answer: string;
  interviewStage: string;
  createdAt: number;
}

interface CustomQuestionSectionProps {
  session: PrepSession;
  sessionId: string;
  creditBalance: number;
  onCreditSpent: () => void;
}

const STAGE_OPTIONS: { value: InterviewStage; label: string }[] = [
  { value: "recruiter", label: "Recruiter screen" },
  { value: "hiring_manager", label: "Hiring manager" },
  { value: "role_play", label: "Role play / cold call" },
  { value: "panel", label: "Panel interview" },
  { value: "take_home", label: "Take-home discussion" },
];

function speakingTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const mins = Math.round((words / 150) * 60);
  if (mins < 60) return `~${mins}s`;
  const m = Math.floor(mins / 60);
  const s = mins % 60;
  return s > 0 ? `~${m}m ${s}s` : `~${m}m`;
}

// ─── Custom Answer Card ──────────────────────────────────────────────────────

function CustomAnswerCard({ q, onUpdate }: { q: CustomQuestion; onUpdate: (q: CustomQuestion) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(q.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = () => {
    setEditDraft(q.answer);
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSaveEdit = () => {
    const trimmed = editDraft.trim();
    if (trimmed && trimmed !== q.answer) {
      onUpdate({ ...q, answer: trimmed });
    }
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DE] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#F0EDE6] flex items-start gap-3">
        <span className="text-lg leading-none mt-0.5">💬</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#E8735A] bg-[#FEF2EF] px-2 py-0.5 rounded-full">
              Custom question
            </span>
          </div>
          <p className="text-sm font-semibold text-[#1A1A1A] leading-snug">{q.questionText}</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              className="w-full min-h-[160px] p-3 text-sm text-[#1A1A1A] border border-[#E8E4DE] rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-[#E8735A]/30 focus:border-[#E8735A]"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#9C9590]">
                {editDraft.trim().split(/\s+/).length} words · {speakingTime(editDraft)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-medium text-[#6B6560] hover:text-[#1A1A1A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#E8735A] hover:bg-[#D4614A] rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">{q.answer}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F0EDE6]">
              <span className="text-xs text-[#9C9590]">
                {q.answer.trim().split(/\s+/).length} words · {speakingTime(q.answer)}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#6B6560] hover:text-[#1A1A1A] hover:bg-[#F7F5F0] rounded-lg transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#6B6560] hover:text-[#1A1A1A] hover:bg-[#F7F5F0] rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Section ────────────────────────────────────────────────────────────

export function CustomQuestionSection({
  session,
  sessionId,
  creditBalance,
  onCreditSpent,
}: CustomQuestionSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [stage, setStage] = useState<string>(session.stage);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load from sessionStorage on mount
  useEffect(() => {
    const raw = sessionStorage.getItem(`custom-questions-${sessionId}`);
    if (raw) {
      try {
        setQuestions(JSON.parse(raw));
      } catch { /* ignore */ }
    }
  }, [sessionId]);

  // Sync to sessionStorage
  const syncToStorage = useCallback(
    (qs: CustomQuestion[]) => {
      sessionStorage.setItem(`custom-questions-${sessionId}`, JSON.stringify(qs));
    },
    [sessionId]
  );

  // Focus textarea on expand
  useEffect(() => {
    if (expanded) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [expanded]);

  const handleGenerate = async () => {
    if (!questionText.trim() || generating) return;
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/generate-custom-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionText: questionText.trim(),
          interviewStage: stage,
          session,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to generate answer");
        return;
      }

      const newQ: CustomQuestion = {
        id: data.id,
        questionText: data.questionText,
        answer: data.answer,
        interviewStage: stage,
        createdAt: Date.now(),
      };

      const updated = [...questions, newQ];
      setQuestions(updated);
      syncToStorage(updated);
      setQuestionText("");
      setExpanded(false);
      onCreditSpent();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateQuestion = (updated: CustomQuestion) => {
    const newList = questions.map((q) => (q.id === updated.id ? updated : q));
    setQuestions(newList);
    syncToStorage(newList);
  };

  const noCredits = creditBalance < 1;

  return (
    <div className="space-y-3">
      {/* Existing custom answer cards */}
      {questions.map((q) => (
        <CustomAnswerCard key={q.id} q={q} onUpdate={handleUpdateQuestion} />
      ))}

      {/* Prompt card */}
      {!expanded ? (
        /* STATE 1: Collapsed */
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full border-2 border-dashed border-[#E8E4DE] rounded-2xl p-6 text-left hover:border-[#D4614A]/40 hover:bg-[#FDFCFA] transition-all group"
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">💬</span>
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A] group-hover:text-[#E8735A] transition-colors">
                Got a question you&apos;re expecting?
              </p>
              <p className="text-xs text-[#9C9590] mt-0.5">
                Add it here and we&apos;ll prep your answer.
              </p>
              <p className="text-xs font-medium text-[#E8735A] mt-2 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                Add a question · 1 credit
              </p>
            </div>
          </div>
        </button>
      ) : (
        /* STATE 2: Expanded form */
        <div className="bg-white rounded-2xl border border-[#E8E4DE] shadow-sm p-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-[#1A1A1A] block mb-1.5">
              What question do you want to prep for?
            </label>
            <textarea
              ref={textareaRef}
              rows={3}
              maxLength={500}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder='e.g., "Walk me through a time you had to deal with a difficult prospect..."'
              className="w-full p-3 text-sm border border-[#E8E4DE] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#E8735A]/30 focus:border-[#E8735A] placeholder:text-[#9C9590]"
              disabled={generating}
            />
            <span className="text-[10px] text-[#9C9590] float-right mt-0.5">
              {questionText.length}/500
            </span>
          </div>

          <div>
            <label className="text-xs font-medium text-[#6B6560] block mb-1">
              How might this come up?
              <span className="text-[#9C9590] font-normal ml-1">(helps tailor the answer)</span>
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full p-2.5 text-sm border border-[#E8E4DE] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#E8735A]/30 focus:border-[#E8735A] text-[#1A1A1A]"
              disabled={generating}
            >
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                setError("");
              }}
              disabled={generating}
              className="text-sm font-medium text-[#6B6560] hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !questionText.trim() || noCredits}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#E8735A] hover:bg-[#D4614A] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={noCredits ? "No credits remaining" : undefined}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate answer
                  <span className="flex items-center gap-0.5 text-white/80">
                    · 1 <Zap className="w-3 h-3" />
                  </span>
                </>
              )}
            </button>
          </div>

          {noCredits && !generating && (
            <p className="text-xs text-amber-600 text-center">
              No credits remaining.{" "}
              <a href="/dashboard/billing" className="underline font-medium">
                Get more credits
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
