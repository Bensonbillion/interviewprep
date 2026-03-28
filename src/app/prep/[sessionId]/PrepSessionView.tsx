"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PrepSession, AnswerSlot, AnswerType, InterviewerInput, InterviewerDossier } from "@/types";
import { getSessionList } from "@/lib/session/session-list";
import { AnswerCard } from "@/components/prep/AnswerCard";
import { QuickRoundModal } from "@/components/prep/QuickRoundModal";
import { InterviewerIntelCard } from "@/components/prep/InterviewerIntelCard";
import { ClosingCoachCard } from "@/components/prep/ClosingCoachCard";
import { LiveMode } from "@/components/prep/LiveMode";
import { TeleprompterMode } from "@/components/prep/TeleprompterMode";
import { CoachPanel } from "@/components/prep/CoachPanel";
import { FollowUpSection } from "@/components/prep/FollowUpSection";
import { ConfidenceCheck } from "@/components/prep/ConfidenceCheck";
import { CustomQuestionSection } from "@/components/prep/CustomQuestionSection";
import { getSessionList as getSessionListForCount } from "@/lib/session/session-list";
import { useCredits } from "@/hooks/useCredits";
import { tracker } from "@/lib/feedback/implicit-tracker";
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

// ─── Reference types (for section grouping) ───────────────────────────────────

const PAGE_REFERENCE_TYPES = new Set<AnswerType>([
  "company_brief",
  "cheat_sheet",
  "competitor_battle_card",
  "questions_to_ask",
  "cold_email",
  "pain_point_analysis",
  "assignment_guide",
]);

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
    <div className="bg-[var(--bg-card)] border border-stone-200/50 dark:border-white/5 rounded-[var(--card-radius)] shadow-card p-4">
      <p className="text-xs font-medium text-[var(--text-primary)] mb-3">Generating your prep kit…</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4">
        {slots.map((slot) => (
          <div key={slot.type} className="flex items-center gap-1.5">
            {slot.status !== "loading" ? (
              <Check className="w-3 h-3 text-[var(--success)] flex-shrink-0" />
            ) : (
              <Loader2 className="w-3 h-3 animate-spin text-[var(--text-tertiary)] flex-shrink-0" />
            )}
            <span
              className={`text-xs truncate ${
                slot.status !== "loading" ? "text-[var(--success)]" : "text-[var(--text-tertiary)]"
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
      <div className="flex items-center gap-1.5 text-xs text-[var(--success)] font-medium">
        <Check className="w-3.5 h-3.5 flex-shrink-0" />
        <span>All {totalCount} answers reviewed · Add personal notes before your interview</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-1.5 bg-stone-100 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-coral rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-[var(--text-tertiary)] tabular-nums whitespace-nowrap">
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
    <div className="mb-5 flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
      {ROUNDS.map((round) => {
        const Icon = round.icon;
        const isCurrent = session.stage === round.key;
        const completedId = completedStages[round.key];
        const isCompleted = !!completedId && !isCurrent;

        if (isCurrent) {
          return (
            <button
              key={round.key}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-all duration-150 min-h-[44px] bg-[var(--bg-card)] shadow-card border-[var(--coral-border)] text-coral-dark dark:text-[var(--coral-text)] cursor-default select-none"
            >
              <span className="text-[15px]">{round.emoji}</span>
              <span>{round.label}</span>
            </button>
          );
        }

        if (isCompleted) {
          return (
            <button
              key={round.key}
              onClick={() => router.push(`/prep/${completedId}`)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium border transition-all duration-150 min-h-[44px] bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/15 hover:bg-[var(--success-bg)]"
            >
              <span className="text-[15px]">{round.emoji}</span>
              <span>{round.label}</span>
            </button>
          );
        }

        // Unprepped
        return (
          <button
            key={round.key}
            onClick={() => onPrepRound(round.key)}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium border transition-all duration-150 min-h-[44px] bg-transparent border-stone-200/40 dark:border-white/8 text-[var(--text-secondary)] hover:bg-[var(--bg-card)]/50 dark:hover:bg-white/5"
          >
            <span className="text-[15px] opacity-60">{round.emoji}</span>
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
    <div className="border border-dashed border-stone-200/50 dark:border-white/10 rounded-[var(--card-radius)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] hover:bg-stone-50 dark:hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <UserSearch className="w-4 h-4 text-[var(--text-tertiary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Who&apos;s interviewing you?</span>
          <span className="text-xs text-[var(--text-tertiary)] hidden sm:inline">Get personalized intel</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-coral font-medium">Optional</span>
          {expanded ? (
            <X className="w-4 h-4 text-[var(--text-tertiary)]" />
          ) : (
            <Plus className="w-4 h-4 text-[var(--text-tertiary)]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-dashed border-stone-200/30 dark:border-white/5">
          <p className="text-xs text-[var(--text-tertiary)] pt-3">
            We&apos;ll research their background and tailor your prep to what they care about.
          </p>
          {interviewers.map((iv, idx) => (
            <div key={idx} className="space-y-2 bg-[var(--bg-card-elevated)] dark:bg-white/[0.02] rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-tertiary)]">Interviewer {idx + 1}</span>
                {interviewers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setInterviewers((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
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
                className="w-full text-sm border border-stone-200/50 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-coral bg-[var(--bg-card)] placeholder:text-[var(--text-tertiary)] text-[var(--text-primary)]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Role / Title"
                  value={iv.roleTitle ?? ""}
                  onChange={(e) => handleChange(idx, "roleTitle", e.target.value)}
                  className="w-full text-sm border border-stone-200/50 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-coral bg-[var(--bg-card)] placeholder:text-[var(--text-tertiary)] text-[var(--text-primary)]"
                />
                <input
                  type="url"
                  placeholder="LinkedIn URL"
                  value={iv.linkedinUrl ?? ""}
                  onChange={(e) => handleChange(idx, "linkedinUrl", e.target.value)}
                  className="w-full text-sm border border-stone-200/50 dark:border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-coral bg-[var(--bg-card)] placeholder:text-[var(--text-tertiary)] text-[var(--text-primary)]"
                />
              </div>
            </div>
          ))}
          {interviewers.length < 3 && (
            <button
              type="button"
              onClick={() => setInterviewers((prev) => [...prev, { name: "", linkedinUrl: "", roleTitle: "" }])}
              className="flex items-center gap-1.5 text-xs text-coral hover:text-coral-dark dark:text-[var(--coral-text)] font-medium transition-colors min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add another interviewer
            </button>
          )}
          <button
            type="button"
            disabled={loading || !interviewers.some((iv) => iv.name.trim())}
            onClick={handleResearch}
            className="w-full py-2.5 min-h-[44px] bg-coral hover:bg-coral-dark text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

// ─── Main client component ───────────────────────────────────────────────────

interface PrepSessionViewProps {
  initialSession: PrepSession | null;
  sessionId: string;
}

export function PrepSessionView({ initialSession, sessionId }: PrepSessionViewProps) {
  const [session, setSession] = useState<PrepSession | null>(initialSession);
  const [slots, setSlots] = useState<AnswerSlot[]>(initialSession?.answerSlots ?? []);
  const [notFound, setNotFound] = useState(false);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [modalInitialRound, setModalInitialRound] = useState<string | undefined>(undefined);
  const [completedStages, setCompletedStages] = useState<Record<string, string>>({});
  const [copiedAll, setCopiedAll] = useState(false);
  const [extraDossiers, setExtraDossiers] = useState<InterviewerDossier[]>([]);
  const [reviewedAnswers, setReviewedAnswers] = useState<Set<AnswerType>>(new Set());
  const [viewMode, setViewMode] = useState<"study" | "live" | "teleprompter">("study");
  const [activeBlock, setActiveBlock] = useState<AnswerType | null>(null);
  const [showConfidenceCheck, setShowConfidenceCheck] = useState(false);
  const generatingRef = useRef<Set<AnswerType>>(new Set());
  const reviewTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const entryTimestampsRef = useRef<Record<string, number>>({});
  const { balance: creditBalance, loading: creditsLoading, refresh: refreshCredits } = useCredits();

  // ─── Fallback: load from sessionStorage if server had no data ───────────────
  useEffect(() => {
    if (initialSession) {
      // Server provided data — hydrate sessionStorage as cache
      sessionStorage.setItem(`session-${sessionId}`, JSON.stringify(initialSession));
      return;
    }
    // No server data — try sessionStorage (pre-migration sessions)
    const raw = sessionStorage.getItem(`session-${sessionId}`);
    if (raw) {
      try {
        const s = JSON.parse(raw) as PrepSession;
        setSession(s);
        setSlots(s.answerSlots);
        return;
      } catch {
        // invalid data
      }
    }
    setNotFound(true);
  }, [sessionId, initialSession]);

  // ─── Init implicit tracker ──────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    tracker.init(sessionId);
    return () => tracker.dispose();
  }, [session, sessionId]);

  // ─── Sync slots → sessionStorage + debounced Supabase save ──────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!session || slots.length === 0) return;
    const updated = { ...session, answerSlots: slots };
    sessionStorage.setItem(`session-${sessionId}`, JSON.stringify(updated));

    // Debounce DB save by 2s to avoid spamming during rapid slot updates
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch("/api/session/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sessionData: updated,
          companyName: session.companyName,
          interviewDate: session.interviewDate,
        }),
      }).catch(() => {/* fire-and-forget */});
    }, 2000);

    return () => clearTimeout(saveTimerRef.current);
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
    const loadingSlots = session.answerSlots.filter((s) => s.status === "loading");
    // Stagger 400ms apart to avoid simultaneous cold-starts on serverless
    loadingSlots.forEach((s, i) => {
      setTimeout(() => generateSlot(s.type, session), i * 400);
    });
  }, [session, generateSlot]);

  // ─── Mark an answer as reviewed ──────────────────────────────────────────────
  const handleMarkReviewed = useCallback((type: AnswerType) => {
    setReviewedAnswers((prev) => new Set([...prev, type]));
  }, []);

  // ─── IntersectionObserver: auto-mark answers reviewed after 10s in view ──────
  useEffect(() => {
    const unlockedTypes = new Set(slots.filter((s) => s.status === "unlocked").map((s) => s.type));
    if (unlockedTypes.size === 0) return;

    const timers = reviewTimersRef.current;
    const entryTimestamps = entryTimestampsRef.current;
    const sid = sessionId;
    const slotMap = new Map(slots.map((s) => [s.type, s]));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const type = entry.target.getAttribute("data-question-type") as AnswerType;
          if (!type || !unlockedTypes.has(type)) continue;
          if (entry.isIntersecting) {
            tracker.trackCardView(type, slotMap.get(type)?.answerId);
            timers[type] = setTimeout(() => handleMarkReviewed(type), 10_000);
            entryTimestamps[type] = Date.now();
          } else {
            tracker.trackCardHide(type);
            clearTimeout(timers[type]);
            const entered = entryTimestamps[type];
            if (entered) {
              const durationMs = Date.now() - entered;
              if (durationMs > 5000) {
                fetch("/api/feedback/event", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    sessionId: sid,
                    answerType: type,
                    eventType: "time_on_card",
                    durationMs,
                  }),
                }).catch(() => {});
              }
              delete entryTimestamps[type];
            }
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
  }, [slots, handleMarkReviewed, sessionId]);

  // ─── Unlock a single answer (costs 1 credit) ─────────────────────────────────
  const handleUnlock = useCallback(
    async (type: AnswerType) => {
      const res = await fetch("/api/user/spend-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: `unlock-${sessionId}-${type}` }),
      });
      if (!res.ok) {
        console.error("[unlock] spend-credit failed:", res.status);
        return;
      }

      // Check if the slot already has content — if empty, generate it now
      const slot = slots.find((s) => s.type === type);
      if (!slot?.content?.trim()) {
        // No content — trigger generation before unlocking
        setSlots((prev) =>
          prev.map((s) => (s.type === type ? { ...s, status: "loading" as const } : s))
        );
        refreshCredits?.();
        const currentSession = session;
        if (currentSession) {
          try {
            const genRes = await fetch("/api/generate-answer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId, answerType: type, session: currentSession }),
            });
            if (genRes.ok) {
              const data = await genRes.json().catch(() => null);
              if (data?.content?.trim()) {
                setSlots((prev) =>
                  prev.map((s) =>
                    s.type === type
                      ? { ...s, status: "unlocked" as const, content: data.content, answerId: data.answerId }
                      : s
                  )
                );
                return;
              }
            }
          } catch { /* fall through to unlock with empty */ }
        }
        // Generation failed — still unlock but with whatever content exists
        setSlots((prev) =>
          prev.map((s) => (s.type === type ? { ...s, status: "unlocked" as const } : s))
        );
      } else {
        setSlots((prev) =>
          prev.map((s) => (s.type === type ? { ...s, status: "unlocked" as const } : s))
        );
      }
      refreshCredits?.();
    },
    [sessionId, session, slots, refreshCredits]
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
      if (!session) return;
      // Persist dossiers into the session in sessionStorage so they survive reloads
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

  // ─── Confidence check: trigger after scroll-to-bottom, 5min timer, or button ─
  const allReady = slots.length > 0 && slots.every((s) => s.status !== "loading");
  const pageEnteredAtRef = useRef(Date.now());
  const confidenceTriggeredRef = useRef(false);

  const triggerConfidenceCheck = useCallback(() => {
    if (confidenceTriggeredRef.current) return;
    const elapsed = Date.now() - pageEnteredAtRef.current;
    if (elapsed < 60_000) return; // less than 60s on page — skip
    const key = `confidence-check-${sessionId}`;
    if (localStorage.getItem(key)) return;
    confidenceTriggeredRef.current = true;
    localStorage.setItem(key, "1");
    setShowConfidenceCheck(true);
  }, [sessionId]);

  // Trigger: 5 minute timer
  useEffect(() => {
    if (!allReady) return;
    const timer = setTimeout(triggerConfidenceCheck, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [allReady, triggerConfidenceCheck]);

  // Trigger: scroll to bottom
  useEffect(() => {
    if (!allReady) return;
    function handleScroll() {
      const scrollBottom = window.innerHeight + window.scrollY;
      if (scrollBottom >= document.body.offsetHeight - 200) {
        triggerConfidenceCheck();
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [allReady, triggerConfidenceCheck]);

  // ─── Not found / loading states ───────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
        <p className="text-[var(--text-tertiary)]">Session not found.</p>
        <Link href="/dashboard" className="text-sm font-medium text-coral hover:text-coral-dark dark:text-[var(--coral-text)]">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-7 h-7 animate-spin text-coral" />
      </div>
    );
  }

  // ─── Derived values ─────────────────────────────────────────────────────────
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
  const speakingSlots = slots.filter((s) => !PAGE_REFERENCE_TYPES.has(s.type));
  const referenceSlots = slots.filter((s) => PAGE_REFERENCE_TYPES.has(s.type));

  const isDiscovery = session.stage === "role_play" && session.mockCallType === "discovery";
  const activeSlot = activeBlock ? slots.find((s) => s.type === activeBlock) : null;

  return (
    <div className="lg:flex lg:gap-0">

      {/* ── Center column ────────────────────────────────────────────────── */}
      <main className="flex-1 lg:overflow-y-auto space-y-5 pb-24 md:pb-8 lg:px-8 lg:py-6">

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-sm text-[var(--text-tertiary)]">
        <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-[var(--text-primary)] font-medium truncate">{session.companyName}</span>
      </nav>

      {/* ── Company header ─────────────────────────────────────────────── */}
      <div className="mb-4">
        <div className="bg-[var(--bg-card)] rounded-[var(--card-radius)] shadow-card border border-stone-200/50 dark:border-white/5 p-5">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight truncate">
                {session.companyName}
              </h1>
              <p className="text-[14px] text-[var(--text-secondary)] mt-0.5">
                {session.targetRole} · {stageLabel}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {session.interviewDate && (() => {
                const d = new Date(session.interviewDate + "T12:00:00");
                const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                if (diff < 0) return null;
                const label = diff === 0 ? "Today!" : diff === 1 ? "Tomorrow" : `In ${diff} days`;
                const urgent = diff <= 3;
                return (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold border ${
                      urgent
                        ? "bg-[var(--coral-bg)] text-[var(--coral-text)] border-coral/15"
                        : "bg-[var(--blue-bg)] text-[var(--blue-text)] border-[var(--blue-text)]/15"
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    {label}
                  </span>
                );
              })()}
              {session.stage === "role_play" && session.mockCallType === "discovery" && allGenerated && (
                <div className="rounded-full border border-stone-200 dark:border-white/15 bg-stone-50 dark:bg-white/5 inline-flex p-0.5">
                  {([
                    { key: "study" as const, label: "📋 Study" },
                    { key: "live" as const, label: "📱 Live" },
                    { key: "teleprompter" as const, label: "📜 Call" },
                  ]).map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setViewMode(m.key)}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ${
                        viewMode === m.key
                          ? "bg-white dark:bg-white/15 shadow-sm text-stone-900 dark:text-white"
                          : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
              {allGenerated && (
                <span className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/15">
                  {unlockedCount === totalCount ? "Ready to prep" : `${unlockedCount}/${totalCount} unlocked`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Round tabs — mobile/tablet only, desktop uses sidebar ────── */}
      <div className="lg:hidden">
        <RoundTabs
          session={session}
          completedStages={completedStages}
          onPrepRound={(roundKey) => openRoundModal(roundKey)}
        />
      </div>

      {/* ── Progress bar + Copy all ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <PrepProgressBar reviewedCount={reviewedUnlockedCount} totalCount={unlockedCount} />
        {unlockedCount > 0 && (
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0 min-h-[36px]"
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
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-card)] border border-stone-200/50 dark:border-white/5 rounded-[var(--card-radius)] shadow-card">
          <p className="text-sm text-[var(--text-primary)]">
            <span className="font-medium">{lockedCount} answers</span>{" "}
            <span className="text-[var(--text-tertiary)]">waiting to be unlocked</span>
          </p>
          <button
            onClick={handleUnlockAll}
            className="flex-shrink-0 text-sm font-semibold text-coral hover:text-coral-dark dark:text-[var(--coral-text)] transition-colors flex items-center gap-1.5 min-h-[36px]"
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
        <div className="bg-[var(--coral-bg)] border border-[var(--coral-border)] rounded-[var(--card-radius)] px-4 py-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-coral flex-shrink-0" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Career switcher mode active</p>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Your prep kit includes career switcher bridges — framings that confidently connect your
            background to sales skills.
          </p>
        </div>
      )}

      {/* ── Lead stories ────────────────────────────────────────────────── */}
      {session.relevanceMap.leadStories.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-[var(--card-radius)] border border-stone-200/50 dark:border-white/5 shadow-card px-5 py-4">
          <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3">
            Your lead stories for this role
          </p>
          <ul className="space-y-2">
            {session.relevanceMap.leadStories.slice(0, 3).map((story, i) => (
              <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2.5">
                <span className="text-coral flex-shrink-0 mt-0.5 font-bold text-xs">
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

      {/* YOUR ANSWERS — spoken cards */}
      {speakingSlots.length > 0 && (
        <div className="space-y-3">
          <div className="py-2 mt-3 mb-1">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
              Your Answers
            </h2>
          </div>
          {speakingSlots.map((slot) => (
            <div key={slot.type} data-question-type={slot.type}>
              <div onClick={() => setActiveBlock(slot.type)}>
              <AnswerCard
                slot={slot}
                session={session}
                creditBalance={creditsLoading ? 0 : creditBalance}
                onSlotUpdate={handleSlotUpdate}
                onUnlock={() => handleUnlock(slot.type)}
                isPrimaryForRound={ROUND_PRIORITY[session.stage] === slot.type}
                onReview={() => handleMarkReviewed(slot.type)}
                defaultExpanded={true}
              />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REFERENCE MATERIAL — collapsed on mobile by default */}
      {referenceSlots.length > 0 && (
        <div className="space-y-3">
          <div className="py-2 mt-3 mb-1">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
              Reference Material
            </h2>
          </div>
          {referenceSlots.map((slot) => (
            <div key={slot.type} data-question-type={slot.type}>
              <div onClick={() => setActiveBlock(slot.type)}>
              <AnswerCard
                slot={slot}
                session={session}
                creditBalance={creditsLoading ? 0 : creditBalance}
                onSlotUpdate={handleSlotUpdate}
                onUnlock={() => handleUnlock(slot.type)}
                isPrimaryForRound={ROUND_PRIORITY[session.stage] === slot.type}
                onReview={() => handleMarkReviewed(slot.type)}
                defaultExpanded={false}
              />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Custom question prep ───────────────────────────────────────── */}
      <CustomQuestionSection
        session={session}
        sessionId={sessionId}
        creditBalance={creditsLoading ? 0 : creditBalance}
        onCreditSpent={() => refreshCredits?.()}
      />

      {/* ── Closing coach card ──────────────────────────────────────────── */}
      {allGenerated && (
        <ClosingCoachCard
          stage={session.stage}
          roleType={session.roleType}
          companyName={session.companyName}
        />
      )}

      {/* ── Done Prepping button ───────────────────────────────────────── */}
      {allGenerated && !showConfidenceCheck && (
        <div className="flex justify-center pt-2">
          <button
            onClick={triggerConfidenceCheck}
            className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl border border-[var(--coral-border)] bg-[var(--coral-bg)] text-sm font-semibold text-[var(--coral-text)] hover:bg-coral/10 transition-colors"
          >
            <Check className="w-4 h-4" />
            Done Prepping
          </button>
        </div>
      )}

      {/* ── Follow-up email generator ────────────────────────────────────── */}
      <div className="py-2 mt-3 mb-1">
        <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
          After the Interview
        </p>
      </div>
      <FollowUpSection session={session} sessionId={sessionId} />

      {/* ── Prep next round CTA ─────────────────────────────────────────── */}
      {unpreppedRounds.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-stone-200/50 dark:border-white/5 rounded-[var(--card-radius)] shadow-card p-6 mt-2">
          <p className="text-sm font-bold text-[var(--text-primary)]">Ready for the next round?</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1 mb-4">
            Same resume, same research — just pick the round.
          </p>
          <div className="flex flex-wrap gap-2">
            {unpreppedRounds.map((round) => (
              <button
                key={round.key}
                onClick={() => openRoundModal(round.key)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-stone-200/50 dark:border-white/10 bg-[var(--bg-card)] text-sm font-medium text-[var(--text-primary)] hover:border-[var(--coral-border)] hover:bg-[var(--coral-bg)] transition-colors"
              >
                <span>{round.emoji}</span>
                <span>{round.shortLabel}</span>
                <span className="text-xs text-[var(--text-tertiary)]">· 1 credit</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-3">
            {creditsLoading ? "" : `${creditBalance} credits remaining`}
          </p>
        </div>
      )}

      {/* ── Report back CTA ─────────────────────────────────────────────── */}
      <div className="bg-[var(--success-bg)] border border-[var(--success)]/15 rounded-[var(--card-radius)] p-5 text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Just finished your interview?</p>
        <p className="text-xs text-[var(--text-tertiary)] mb-3">
          Tell us how it went — your report helps future candidates at {session.companyName}.
        </p>
        <Link
          href={`/report/${sessionId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-[var(--success)] hover:brightness-110 text-white font-semibold text-sm rounded-xl transition-all"
        >
          Report Interview →
        </Link>
      </div>

      {/* Footer hint */}
      <p className="text-xs text-center text-[var(--text-tertiary)] pb-2">
        Answers personalized from your resume · Edits are free · First 3 refinements per answer are free
      </p>

      </main>{/* ── End center column ── */}

      {/* ── Desktop right panel (coach) ──────────────────────────────────── */}
      <aside className="hidden lg:block lg:w-[300px] lg:shrink-0 lg:border-l lg:border-stone-200/50 dark:lg:border-white/5 lg:overflow-y-auto lg:sticky lg:top-0 lg:h-screen">
        <div className="p-5">
          <CoachPanel
            answerType={(activeBlock ?? slots[0]?.type ?? "tell_me_about_yourself") as AnswerType}
            answerLabel={activeSlot?.label ?? slots[0]?.label ?? "Answer"}
            stage={session.stage}
            isDiscovery={isDiscovery}
            onLiveMode={() => setViewMode("live")}
            onTeleprompter={() => setViewMode("teleprompter")}
          />
        </div>
      </aside>

      {/* ── Modals and overlays (outside columns) ────────────────────────── */}
      {showRoundModal && (
        <QuickRoundModal
          session={session}
          completedStages={completedStages}
          creditBalance={creditsLoading ? 0 : creditBalance}
          initialRound={modalInitialRound}
          onClose={() => setShowRoundModal(false)}
        />
      )}

      {showConfidenceCheck && (
        <ConfidenceCheck
          sessionId={sessionId}
          slots={slots}
          isFirstSession={getSessionListForCount().length <= 1}
          onDismiss={() => setShowConfidenceCheck(false)}
        />
      )}

      {viewMode === "live" && (
        <LiveMode
          session={session}
          answerSlots={slots}
          onExit={() => setViewMode("study")}
        />
      )}

      {viewMode === "teleprompter" && (
        <TeleprompterMode
          session={session}
          answerSlots={slots}
          onExit={() => setViewMode("study")}
        />
      )}
    </div>
  );
}
