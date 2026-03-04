"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { PrepSession, AnswerSlot, AnswerType, InterviewerInput, InterviewerDossier } from "@/types";
import { getSessionList } from "@/lib/session/session-list";
import { AnswerCard } from "@/components/prep/AnswerCard";
import { QuickRoundModal } from "@/components/prep/QuickRoundModal";
import { InterviewerIntelCard } from "@/components/prep/InterviewerIntelCard";
import { ClosingCoachCard } from "@/components/prep/ClosingCoachCard";
import { FollowUpSection } from "@/components/prep/FollowUpSection";
import { useCredits } from "@/hooks/useCredits";
import {
  Loader2,
  Phone,
  Users,
  Mic,
  Star,
  FileText,
  Zap,
  ChevronRight,
  Check,
  Copy,
  Calendar,
  UserSearch,
  Plus,
  X,
} from "lucide-react";

// ─── Round config ──────────────────────────────────────────────────────────────

const ROUNDS = [
  { key: "recruiter", label: "Recruiter Screen", shortLabel: "Recruiter", emoji: "📞", icon: Phone },
  { key: "hiring_manager", label: "Hiring Manager", shortLabel: "Hiring Manager", emoji: "👥", icon: Users },
  { key: "role_play", label: "Cold Call / Roleplay", shortLabel: "Cold Call", emoji: "🎙️", icon: Mic },
  { key: "panel", label: "Panel / Final", shortLabel: "Panel", emoji: "⭐", icon: Star },
  { key: "take_home", label: "Take-Home Assignment", shortLabel: "Take-Home", emoji: "📝", icon: FileText },
] as const;

const ROUND_PRIORITY: Record<string, AnswerType> = {
  recruiter: "tell_me_about_yourself",  // in recruiter slots ✓
  hiring_manager: "resume_walkthrough", // HMs open with "walk me through your resume" ✓
  role_play: "role_play_script",        // primary RP answer ✓
  panel: "cheat_sheet",                 // in panel slots ✓
  take_home: "cold_email",              // primary take-home deliverable ✓
};

function getStageLabel(stage: string, roleType?: string): string {
  const isAE = roleType === "account_executive";
  const map: Record<string, string> = {
    recruiter: "Recruiter Screen",
    hiring_manager: isAE ? "VP of Sales / Hiring Manager" : "Hiring Manager",
    role_play: isAE ? "Discovery Demo" : "Cold Call / Roleplay",
    panel: "Panel / Final",
    take_home: "Take-Home Assignment",
  };
  return map[stage] ?? stage;
}

// ─── GenerationStatusBanner ───────────────────────────────────────────────────

function GenerationStatusBanner({ slots }: { slots: AnswerSlot[] }) {
  return (
    <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
      <p className="text-xs font-medium text-primary-700 mb-3">Generating your prep kit…</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4">
        {slots.map((slot) => (
          <div key={slot.type} className="flex items-center gap-1.5">
            {slot.status !== "loading" ? (
              <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
            ) : (
              <Loader2 className="w-3 h-3 animate-spin text-ink-muted flex-shrink-0" />
            )}
            <span
              className={`text-xs truncate ${
                slot.status !== "loading" ? "text-green-600" : "text-ink-muted"
              }`}
            >
              {slot.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PrepProgressBar ──────────────────────────────────────────────────────────

function PrepProgressBar({
  reviewedCount,
  totalCount,
}: {
  reviewedCount: number;
  totalCount: number;
}) {
  const allReviewed = reviewedCount >= totalCount && totalCount > 0;
  const percent = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0;

  if (allReviewed) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
        <Check className="w-3.5 h-3.5 flex-shrink-0" />
        <span>All {totalCount} answers reviewed · Add personal notes before your interview</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-ink-muted tabular-nums whitespace-nowrap">
        {reviewedCount}/{totalCount} reviewed
      </span>
    </div>
  );
}

// ─── RoundTabs ────────────────────────────────────────────────────────────────

function RoundTabs({
  session,
  completedStages,
  onPrepRound,
}: {
  session: PrepSession;
  completedStages: Record<string, string>;
  onPrepRound: (roundKey: string) => void;
}) {
  const router = useRouter();

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      {ROUNDS.map((round) => {
        const Icon = round.icon;
        const isCurrent = session.stage === round.key;
        const completedId = completedStages[round.key];
        const isCompleted = !!completedId && !isCurrent;

        if (isCurrent) {
          return (
            <div
              key={round.key}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium flex-shrink-0 cursor-default select-none"
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{round.label}</span>
            </div>
          );
        }

        if (isCompleted) {
          return (
            <button
              key={round.key}
              onClick={() => router.push(`/prep/${completedId}`)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 text-sm font-medium flex-shrink-0 hover:bg-green-100 transition-colors"
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{round.label}</span>
            </button>
          );
        }

        // Unprepped
        return (
          <button
            key={round.key}
            onClick={() => onPrepRound(round.key)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-dashed border-gray-300 text-ink-muted text-sm flex-shrink-0 hover:border-primary-400 hover:text-primary-500 transition-colors"
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
            <span className="opacity-70">{round.label}</span>
            <span className="text-xs opacity-50 ml-0.5">· 1 cr</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Add-Interviewer Section (post-creation) ──────────────────────────────────

function AddInterviewerSection({
  sessionId,
  session,
  onDossiersAdded,
}: {
  sessionId: string;
  session: PrepSession;
  onDossiersAdded: (dossiers: InterviewerDossier[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [interviewers, setInterviewers] = useState<InterviewerInput[]>([{ name: "", linkedinUrl: "", roleTitle: "" }]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleChange = (idx: number, field: keyof InterviewerInput, value: string) => {
    setInterviewers((prev) => prev.map((iv, i) => i === idx ? { ...iv, [field]: value } : iv));
  };

  const handleResearch = async () => {
    const filled = interviewers.filter((iv) => iv.name.trim());
    if (!filled.length) return;
    setLoading(true);
    const dossiers: InterviewerDossier[] = [];
    for (const iv of filled) {
      try {
        const res = await fetch("/api/interviewer/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: iv.name,
            linkedinUrl: iv.linkedinUrl || undefined,
            roleTitle: iv.roleTitle || undefined,
            companyName: session.companyName,
            sessionId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.dossier) dossiers.push(data.dossier as InterviewerDossier);
        }
      } catch {
        // best-effort
      }
    }
    setLoading(false);
    if (dossiers.length > 0) {
      onDossiersAdded(dossiers);
      setDone(true);
    }
  };

  if (done) return null;

  return (
    <div className="border border-dashed border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <UserSearch className="w-4 h-4 text-ink-muted" />
          <span className="text-sm font-medium text-ink">Who&apos;s interviewing you?</span>
          <span className="text-xs text-ink-muted hidden sm:inline">Get personalized intel</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-primary-500 font-medium">Optional</span>
          {expanded ? (
            <X className="w-4 h-4 text-ink-muted" />
          ) : (
            <Plus className="w-4 h-4 text-ink-muted" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-dashed border-gray-100">
          <p className="text-xs text-ink-muted pt-3">
            We&apos;ll research their background and tailor your prep to what they care about.
          </p>
          {interviewers.map((iv, idx) => (
            <div key={idx} className="space-y-2 bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-muted">Interviewer {idx + 1}</span>
                {interviewers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setInterviewers((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-ink-muted hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Full name *"
                value={iv.name}
                onChange={(e) => handleChange(idx, "name", e.target.value)}
                className="w-full text-sm border border-[#DBEAFE] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white placeholder:text-gray-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Role / Title"
                  value={iv.roleTitle ?? ""}
                  onChange={(e) => handleChange(idx, "roleTitle", e.target.value)}
                  className="w-full text-sm border border-[#DBEAFE] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white placeholder:text-gray-400"
                />
                <input
                  type="url"
                  placeholder="LinkedIn URL"
                  value={iv.linkedinUrl ?? ""}
                  onChange={(e) => handleChange(idx, "linkedinUrl", e.target.value)}
                  className="w-full text-sm border border-[#DBEAFE] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white placeholder:text-gray-400"
                />
              </div>
            </div>
          ))}
          {interviewers.length < 3 && (
            <button
              type="button"
              onClick={() => setInterviewers((prev) => [...prev, { name: "", linkedinUrl: "", roleTitle: "" }])}
              className="flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add another interviewer
            </button>
          )}
          <button
            type="button"
            disabled={loading || !interviewers.some((iv) => iv.name.trim())}
            onClick={handleResearch}
            className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Researching…
              </>
            ) : (
              "Research my interviewer →"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PrepSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<PrepSession | null>(null);
  const [slots, setSlots] = useState<AnswerSlot[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [modalInitialRound, setModalInitialRound] = useState<string | undefined>(undefined);
  const [completedStages, setCompletedStages] = useState<Record<string, string>>({});
  const [copiedAll, setCopiedAll] = useState(false);
  const [extraDossiers, setExtraDossiers] = useState<InterviewerDossier[]>([]);
  const [reviewedAnswers, setReviewedAnswers] = useState<Set<AnswerType>>(new Set());
  const generatingRef = useRef<Set<AnswerType>>(new Set());
  const reviewTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const { balance: creditBalance, loading: creditsLoading, refresh: refreshCredits } = useCredits();

  // ─── Load session ────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem(`session-${sessionId}`);
    if (!raw) {
      setNotFound(true);
      return;
    }
    try {
      const s = JSON.parse(raw) as PrepSession;
      setSession(s);
      setSlots(s.answerSlots);
    } catch {
      setNotFound(true);
    }
  }, [sessionId]);

  // ─── Sync slots → sessionStorage ─────────────────────────────────────────────
  useEffect(() => {
    if (!session || slots.length === 0) return;
    const updated = { ...session, answerSlots: slots };
    sessionStorage.setItem(`session-${sessionId}`, JSON.stringify(updated));
  }, [slots, session, sessionId]);

  // ─── Compute completed stages for this company ────────────────────────────────
  useEffect(() => {
    if (!session) return;
    const list = getSessionList();
    const sameCompany = list.filter((s) => s.companyName === session.companyName);
    const stages: Record<string, string> = {};
    for (const s of sameCompany) {
      stages[s.stage] = s.id;
    }
    setCompletedStages(stages);
  }, [session]);

  // ─── Auto-generate "loading" slots → set to "locked" when done ───────────────
  // Retries once after 3s to handle serverless cold-start timeouts.
  const generateSlot = useCallback(
    async (type: AnswerType, currentSession: PrepSession) => {
      if (generatingRef.current.has(type)) return;
      generatingRef.current.add(type);

      const MAX_ATTEMPTS = 2;
      try {
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          if (attempt > 0) {
            // Wait 3s before retrying (serverless cold-start recovery)
            await new Promise((r) => setTimeout(r, 3000));
          }

          try {
            const res = await fetch("/api/generate-answer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId, answerType: type, session: currentSession }),
            });

            // Always check res.ok BEFORE res.json() — a failed response may be
            // HTML (Next.js 500 page, Vercel timeout) which throws SyntaxError
            if (!res.ok) continue; // retry

            let data: { content?: string; answerId?: string };
            try {
              data = await res.json();
            } catch {
              continue; // non-JSON response — retry
            }

            if (!data.content) continue; // empty response — retry

            // Success — priority answer auto-unlocks; all others locked until paid
            const isPriority = ROUND_PRIORITY[currentSession.stage] === type;
            setSlots((prev) =>
              prev.map((s) =>
                s.type === type
                  ? {
                      ...s,
                      status: isPriority ? ("unlocked" as const) : ("locked" as const),
                      content: data.content,
                      answerId: data.answerId,
                    }
                  : s
              )
            );
            return; // done — exit loop
          } catch {
            // Network error or abort — retry on next iteration
          }
        }

        // All attempts exhausted — show locked so user at least sees the card
        // (better than an infinite spinner; they can refresh or contact support)
        setSlots((prev) =>
          prev.map((s) => (s.type === type ? { ...s, status: "locked" as const } : s))
        );
      } finally {
        generatingRef.current.delete(type);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    if (!session) return;
    const loading = session.answerSlots.filter((s) => s.status === "loading");
    // Stagger 400ms apart to avoid simultaneous cold-starts on serverless
    loading.forEach((s, i) => {
      setTimeout(() => generateSlot(s.type, session), i * 400);
    });
  }, [session, generateSlot]);

  // ─── Mark an answer as reviewed ──────────────────────────────────────────────
  const handleMarkReviewed = useCallback((type: AnswerType) => {
    setReviewedAnswers((prev) => new Set([...prev, type]));
  }, []);

  // ─── IntersectionObserver: auto-mark answers reviewed after 10s in view ──────
  useEffect(() => {
    if (!session) return;
    const unlockedTypes = new Set(slots.filter((s) => s.status === "unlocked").map((s) => s.type));
    if (unlockedTypes.size === 0) return;

    const timers = reviewTimersRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const type = entry.target.getAttribute("data-question-type") as AnswerType;
          if (!type || !unlockedTypes.has(type)) continue;
          if (entry.isIntersecting) {
            timers[type] = setTimeout(() => handleMarkReviewed(type), 10_000);
          } else {
            clearTimeout(timers[type]);
          }
        }
      },
      { threshold: 0.8 }
    );

    const cards = document.querySelectorAll("[data-question-type]");
    cards.forEach((card) => observer.observe(card));

    return () => {
      observer.disconnect();
      Object.values(timers).forEach(clearTimeout);
    };
  }, [slots, session, handleMarkReviewed]);

  // ─── Unlock a single answer (costs 1 credit) ─────────────────────────────────
  const handleUnlock = useCallback(
    async (type: AnswerType) => {
      const res = await fetch("/api/user/spend-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: `unlock-${sessionId}-${type}-${Date.now()}` }),
      });
      if (!res.ok) return;
      setSlots((prev) =>
        prev.map((s) => (s.type === type ? { ...s, status: "unlocked" as const } : s))
      );
      refreshCredits?.();
    },
    [sessionId, refreshCredits]
  );

  // ─── Unlock all locked answers ───────────────────────────────────────────────
  const handleUnlockAll = useCallback(async () => {
    const lockedTypes = slots.filter((s) => s.status === "locked").map((s) => s.type);
    for (const type of lockedTypes) {
      await handleUnlock(type);
    }
  }, [slots, handleUnlock]);

  // ─── Slot update handler ──────────────────────────────────────────────────────
  const handleSlotUpdate = useCallback(
    (type: AnswerType, updates: Partial<AnswerSlot>) => {
      setSlots((prev) => prev.map((s) => (s.type === type ? { ...s, ...updates } : s)));
    },
    []
  );

  // ─── Handle post-creation interviewer dossiers ───────────────────────────────
  const handleDossiersAdded = useCallback(
    (dossiers: InterviewerDossier[]) => {
      setExtraDossiers(dossiers);
      // Persist dossiers into the session in sessionStorage so they survive reloads
      if (!session) return;
      const updated = {
        ...session,
        interviewerDossiers: [...(session.interviewerDossiers ?? []), ...dossiers],
        answerSlots: slots,
      };
      sessionStorage.setItem(`session-${sessionId}`, JSON.stringify(updated));
    },
    [session, slots, sessionId]
  );

  // ─── Open round modal ─────────────────────────────────────────────────────────
  const openRoundModal = useCallback((roundKey?: string) => {
    setModalInitialRound(roundKey);
    setShowRoundModal(true);
  }, []);

  // ─── Copy all unlocked answers ────────────────────────────────────────────────
  const handleCopyAll = useCallback(async () => {
    if (!session) return;
    const stLabel = getStageLabel(session.stage, session.roleType);
    const unlockedSlots = slots.filter((s) => s.status === "unlocked" && s.content);
    const text =
      `${session.companyName} — ${session.targetRole}\n${stLabel}\n\n` +
      unlockedSlots.map((s) => `---\n${s.label}\n${s.content}\n---`).join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2200);
  }, [session, slots]);

  // ─── Not found / loading states ───────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
        <p className="text-ink-muted">Session not found.</p>
        <Link href="/dashboard" className="text-sm font-medium text-primary-500 hover:text-primary-600">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-7 h-7 animate-spin text-primary-500" />
      </div>
    );
  }

  const stageLabel = getStageLabel(session.stage, session.roleType);
  const allGenerated = slots.every((s) => s.status !== "loading");
  const unlockedCount = slots.filter((s) => s.status === "unlocked").length;
  const lockedCount = slots.filter((s) => s.status === "locked").length;
  const totalCount = slots.length;
  const unlockedTypes = new Set(slots.filter((s) => s.status === "unlocked").map((s) => s.type));
  const reviewedUnlockedCount = [...reviewedAnswers].filter((t) => unlockedTypes.has(t)).length;
  const unpreppedRounds = ROUNDS.filter(
    (r) => r.key !== session.stage && !completedStages[r.key]
  );

  return (
    <div className="space-y-5 pb-20 md:pb-8">

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/dashboard" className="hover:text-ink transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-ink font-medium truncate">{session.companyName}</span>
      </nav>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-ink leading-tight">
            {session.companyName} — {session.targetRole}
          </h1>
          {session.interviewDate && (() => {
            const d = new Date(session.interviewDate + "T12:00:00");
            const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (diff < 0) return null;
            const label = diff === 0 ? "Today!" : diff === 1 ? "Tomorrow" : `In ${diff} days`;
            const urgent = diff <= 3;
            return (
              <span
                className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  urgent
                    ? "bg-orange-50 text-orange-600 border border-orange-200"
                    : "bg-blue-50 text-blue-600 border border-blue-100"
                }`}
              >
                <Calendar className="w-3 h-3" />
                {label}
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
          <span className="text-sm text-ink-muted font-medium">{stageLabel}</span>
          {allGenerated && (
            <>
              <span className="text-ink-muted">·</span>
              {unlockedCount === totalCount ? (
                <span className="text-sm text-green-600 font-medium">
                  ✓ {totalCount} answers ready
                </span>
              ) : (
                <span className="text-sm text-ink-muted font-medium">
                  {unlockedCount}/{totalCount} unlocked
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Round tabs ──────────────────────────────────────────────────── */}
      <RoundTabs
        session={session}
        completedStages={completedStages}
        onPrepRound={(roundKey) => openRoundModal(roundKey)}
      />

      {/* ── Progress bar + Copy all ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <PrepProgressBar reviewedCount={reviewedUnlockedCount} totalCount={unlockedCount} />
        {unlockedCount > 0 && (
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors flex-shrink-0"
            title="Copy all unlocked answers to clipboard"
          >
            {copiedAll ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copiedAll ? "Copied!" : "Copy all"}
          </button>
        )}
      </div>

      {/* ── Batch unlock banner — 2+ locked, enough credits ─────────────── */}
      {allGenerated && lockedCount >= 2 && !creditsLoading && creditBalance >= lockedCount && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-sm text-ink">
            <span className="font-medium">{lockedCount} answers</span>{" "}
            <span className="text-ink-muted">waiting to be unlocked</span>
          </p>
          <button
            onClick={handleUnlockAll}
            className="flex-shrink-0 text-sm font-semibold text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            Unlock all · {lockedCount} credits
          </button>
        </div>
      )}

      {/* ── Generation status banner ─────────────────────────────────────── */}
      {!allGenerated && <GenerationStatusBanner slots={slots} />}

      {/* ── Career switcher notice ───────────────────────────────────────── */}
      {session.resume.backgroundType === "career_switcher" && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-amber-800">Career switcher mode active</p>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            Your prep kit includes career switcher bridges — framings that confidently connect your
            background to sales skills.
          </p>
        </div>
      )}

      {/* ── Lead stories ────────────────────────────────────────────────── */}
      {session.relevanceMap.leadStories.length > 0 && (
        <div className="bg-cream-dark rounded-2xl border border-gray-100 px-5 py-4">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">
            Your lead stories for this role
          </p>
          <ul className="space-y-2">
            {session.relevanceMap.leadStories.slice(0, 3).map((story, i) => (
              <li key={i} className="text-sm text-ink-light flex items-start gap-2.5">
                <span className="text-primary-500 flex-shrink-0 mt-0.5 font-bold text-xs">
                  {i + 1}.
                </span>
                <span className="leading-relaxed">{story}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Interviewer intel cards ──────────────────────────────────────── */}
      {(() => {
        const allDossiers = [
          ...(session.interviewerDossiers ?? []),
          ...extraDossiers,
        ];
        return allDossiers.length > 0 ? (
          <InterviewerIntelCard dossiers={allDossiers} />
        ) : null;
      })()}

      {/* ── Add-interviewer post-creation (no dossiers yet) ─────────────── */}
      {(session.interviewerDossiers ?? []).length === 0 && extraDossiers.length === 0 && (
        <AddInterviewerSection
          sessionId={sessionId}
          session={session}
          onDossiersAdded={handleDossiersAdded}
        />
      )}

      {/* ── Answer cards ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {slots.map((slot) => (
          <div key={slot.type} data-question-type={slot.type}>
            <AnswerCard
              slot={slot}
              session={session}
              creditBalance={creditsLoading ? 0 : creditBalance}
              onSlotUpdate={handleSlotUpdate}
              onUnlock={() => handleUnlock(slot.type)}
              isPrimaryForRound={ROUND_PRIORITY[session.stage] === slot.type}
              onReview={() => handleMarkReviewed(slot.type)}
            />
          </div>
        ))}
      </div>

      {/* ── Closing coach card ──────────────────────────────────────────── */}
      {allGenerated && (
        <ClosingCoachCard
          stage={session.stage}
          roleType={session.roleType}
          companyName={session.companyName}
        />
      )}

      {/* ── Follow-up email generator ────────────────────────────────────── */}
      <FollowUpSection session={session} sessionId={sessionId} />

      {/* ── Prep next round CTA ─────────────────────────────────────────── */}
      {unpreppedRounds.length > 0 && (
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-6 mt-2">
          <p className="text-sm font-bold text-ink">Ready for the next round?</p>
          <p className="text-xs text-ink-muted mt-1 mb-4">
            Same resume, same research — just pick the round.
          </p>
          <div className="flex flex-wrap gap-2">
            {unpreppedRounds.map((round) => (
              <button
                key={round.key}
                onClick={() => openRoundModal(round.key)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-primary-200 bg-white text-sm font-medium text-ink hover:border-primary-400 hover:bg-primary-50 transition-colors"
              >
                <span>{round.emoji}</span>
                <span>{round.shortLabel}</span>
                <span className="text-xs text-ink-muted">· 1 credit</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-muted mt-3">
            {creditsLoading ? "" : `${creditBalance} credits remaining`}
          </p>
        </div>
      )}

      {/* Footer hint */}
      <p className="text-xs text-center text-ink-muted pb-2">
        Answers personalized from your resume · Edits are free · First 3 refinements per answer are free
      </p>

      {/* ── Quick round modal ───────────────────────────────────────────── */}
      {showRoundModal && (
        <QuickRoundModal
          session={session}
          completedStages={completedStages}
          creditBalance={creditsLoading ? 0 : creditBalance}
          initialRound={modalInitialRound}
          onClose={() => setShowRoundModal(false)}
        />
      )}
    </div>
  );
}
