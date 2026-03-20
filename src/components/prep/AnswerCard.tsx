"use client";

import { useState, useRef, useLayoutEffect, useEffect } from "react";
import Link from "next/link";
import {
  Loader2,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Edit3,
  X,
  Send,
  Sparkles,
  Zap,
  Lock,
} from "lucide-react";
import type { AnswerSlot, AnswerType, PrepSession } from "@/types";
import { tracker } from "@/lib/feedback/implicit-tracker";
import { AnswerFeedback } from "@/components/prep/AnswerFeedback";
import { ContentRouter, renderInlineFormatting } from "@/components/prep/content-renderers";
import { parseAnswer } from "@/lib/answer-parser";
import { MarkdownContent } from "@/components/prep/MarkdownContent";
import { VersionTabs } from "@/components/prep/VersionTabs";
import { CollapsibleSection } from "@/components/prep/CollapsibleSection";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOJIS: Record<AnswerType, string> = {
  tell_me_about_yourself: "🎯",
  why_sales: "💡",
  why_this_company: "🏢",
  behavioral_star: "⭐",
  comp_expectations: "💰",
  role_play_script: "📞",
  objection_response: "🛡️",
  company_brief: "📋",
  cheat_sheet: "⚡",
  questions_to_ask: "🙋",
  coachability_coaching: "🎓",
  coachability_game_plan: "🗺️",
  career_switcher_bridge: "🌉",
  resume_walkthrough: "🗂️",
  constructive_feedback: "🔄",
  cold_email: "📧",
  pain_point_analysis: "🔍",
  assignment_guide: "📝",
  competitor_battle_card: "⚔️",
};

const QUICK_ACTIONS = [
  { key: "shorter", label: "Shorter" },
  { key: "more_confident", label: "More confident" },
  { key: "add_metrics", label: "Add metrics" },
  { key: "star_format", label: "STAR format" },
  { key: "custom", label: "Custom…" },
] as const;

const FEEDBACK_ISSUES = [
  "Too generic",
  "Wrong tone",
  "Not specific enough",
  "Missing context",
] as const;

const FREE_REGENS = 3;

// Reference cards — study material, NOT spoken answers. Visually distinct from spoken cards.
const REFERENCE_TYPES = new Set<AnswerType>([
  "company_brief",
  "cheat_sheet",
  "competitor_battle_card",
  "questions_to_ask",
  "cold_email",
  "pain_point_analysis",
  "assignment_guide",
]);

// Reference cards that collapse on mobile by default (subset of REFERENCE_TYPES)
const COLLAPSIBLE_REFERENCE_TYPES = new Set<AnswerType>([
  "company_brief",
  "cheat_sheet",
  "competitor_battle_card",
  "assignment_guide",
]);

// Answer types that are SPOKEN prose — show speaking time + progressive disclosure.
// Types that return JSON (behavioral_star, objection_response, career_switcher_bridge,
// coachability_game_plan, role_play_script) render through ContentRouter's JSON handlers.
const SPOKEN_TYPES = new Set<AnswerType>([
  "tell_me_about_yourself",
  "why_sales",
  "why_this_company",
  "comp_expectations",
  "coachability_coaching",
  "resume_walkthrough",
  "constructive_feedback",
]);

function extractSayThis(content: string | undefined): string | undefined {
  if (!content) return undefined;
  try {
    const parsed = JSON.parse(content);
    return typeof parsed?.sayThis === "string" ? parsed.sayThis : undefined;
  } catch { return undefined; }
}

// Section parsing moved to src/lib/answer-parser.ts

// ─── Speaking time bar ────────────────────────────────────────────────────
function SpeakingTimeBar({ words }: { words: number }) {
  const seconds = Math.round((words / 150) * 60 * 1.18); // 150 wpm + 18% pauses
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const label = minutes > 0 ? `~${minutes}m ${secs}s` : `~${secs}s`;
  const pct = Math.min(100, (seconds / 120) * 100);
  const color =
    seconds <= 60 ? "bg-green-400" : seconds <= 90 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
      <span className="flex-shrink-0">🎙</span>
      <div className="w-16 h-1 bg-stone-200 dark:bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span>{label}</span>
    </div>
  );
}

function getSpeakingTime(text: string): {
  words: number;
  rawSeconds: number;
  withPauses: number;
  display: string;
} | null {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words < 10) return null;
  // 150 wpm baseline (middle of optimal 140–160 wpm range)
  const rawSeconds = Math.round((words / 150) * 60);
  // +18% for natural pauses (middle of 15–20% range)
  const withPauses = Math.round(rawSeconds * 1.18);
  const minutes = Math.floor(withPauses / 60);
  const seconds = withPauses % 60;
  const display = minutes > 0
    ? `~${minutes}:${seconds.toString().padStart(2, "0")}`
    : `~${seconds}s`;
  return { words, rawSeconds, withPauses, display };
}

interface WordTarget { min: number; max: number; }

// Per-stage targets for answer types where length varies by round
const STAGE_WORD_TARGETS: Partial<Record<AnswerType, Partial<Record<string, WordTarget>>>> = {
  tell_me_about_yourself: {
    recruiter:      { min: 130, max: 195 },
    hiring_manager: { min: 210, max: 280 },
    role_play:      { min: 130, max: 195 },
    panel:          { min: 130, max: 195 },
  },
  why_this_company: {
    recruiter:      { min: 150, max: 190 },
    hiring_manager: { min: 200, max: 250 },
    panel:          { min: 175, max: 225 },
    role_play:      { min: 150, max: 200 },
  },
};

// Universal targets (same across all stages)
const UNIVERSAL_WORD_TARGETS: Partial<Record<AnswerType, WordTarget>> = {
  why_sales:             { min: 130, max: 195 },
  behavioral_star:       { min: 250, max: 370 },
  comp_expectations:     { min: 60,  max: 80  },
  resume_walkthrough:    { min: 300, max: 400 },
  constructive_feedback: { min: 200, max: 300 },
  coachability_coaching: { min: 150, max: 250 },
  career_switcher_bridge:{ min: 130, max: 200 },
};

function getWordTarget(answerType: AnswerType, stage: string): WordTarget | null {
  return STAGE_WORD_TARGETS[answerType]?.[stage] ?? UNIVERSAL_WORD_TARGETS[answerType] ?? null;
}

function getWordCountStatus(words: number, target: WordTarget): {
  color: "green" | "amber" | "red";
  flag: string | null;
} {
  if (words <= target.max) return { color: "green", flag: null };
  if (words <= Math.round(target.max * 1.2)) return { color: "amber", flag: "Consider trimming" };
  return { color: "red", flag: "Too long — interviewers will tune out" };
}

const WORD_STATUS_CLASSES: Record<"green" | "amber" | "red", string> = {
  green: "text-green-600",
  amber: "text-amber-600",
  red:   "text-red-500",
};

function countQuestions(content: string | undefined): number {
  if (!content) return 0;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed?.questions)) return parsed.questions.length;
  } catch {
    // not JSON
  }
  return 0;
}

const QUESTION_COACHING: Partial<Record<AnswerType, Partial<Record<string, string>>>> = {
  tell_me_about_yourself: {
    recruiter: "60–90 seconds max. Hook them in the first sentence — don't start with where you went to school.",
    hiring_manager: "This is your career story, not your resume. The HM wants your DECISIONS — why each move, why now, why this role.",
    role_play: "60 seconds, then flip it to them. Frame your background around discovery and handling rejection.",
    panel: "Keep it under 90 seconds — they've read your resume. Three proof points, a clear trajectory, then stop.",
  },
  why_sales: {
    recruiter: "Start with a MOMENT, not a statement. One specific experience that made sales click for you.",
    hiring_manager: "Show intentionality. You chose sales — connect that decision to what you want to build in this role.",
    role_play: "Connect your motivation to the conversation itself — discovery, qualification, the close.",
  },
  why_this_company: {
    recruiter: "They're testing if you did your homework. Mention the PROBLEM they solve, not just the product.",
    hiring_manager: "Name the product, name a competitor, show you understand who buys it and why. 'I love the culture' disqualifies you here.",
    panel: "Connect their market trajectory to your long-term ambitions — the panel is asking: does this person get where we're going?",
    role_play: "Connect your excitement about the product to how you'd actually sell it.",
  },
  behavioral_star: {
    recruiter: "Pick your STRONGEST story. Include a specific number. End with what you learned, not what you accomplished.",
    hiring_manager: "Use numbers and real stakes. 'I went from X to Y by doing Z' is memorable. 'I worked hard' is not.",
    panel: "Lead with your strongest metric and clearest outcome. Make each story you tell in this round distinct.",
    role_play: "Pick a recovery story — bouncing back from a bad call. It maps directly to what they're watching for.",
  },
  comp_expectations: {
    recruiter: "Give a range, not a number. Then redirect: 'I'm more curious about the commission structure.'",
    hiring_manager: "Redirect quickly to total package and opportunity — OTE structure, ramp period, what success looks like.",
  },
  questions_to_ask: {
    recruiter: "Not asking questions is an instant fail signal. End with: 'Is there anything about my background that concerns you?'",
    hiring_manager: "Ask what success looks like in 90 days, and what separates the top reps. These signal you think like a rep.",
    panel: "Close the process: 'Is there anything that gives you pause about moving me forward?' Most candidates won't. The ones who get offers do.",
    role_play: "After the debrief, ask what top performers did differently on their first attempt — signals coachability.",
    take_home: "Ask 'what would make this an A+ submission?' Same qualifying instinct you'd use with a real prospect.",
  },
  role_play_script: {
    role_play: "They're testing coachability, NOT perfection. When they coach you after round 1, implement it visibly in round 2.",
    hiring_manager: "If they give feedback mid-interview: take it fast, say 'I'll do that' — not 'yeah but.' Then adjust.",
  },
  objection_response: {
    role_play: "Don't fight objections — acknowledge, isolate, redirect. 'That's fair, let me ask...' beats any counter-argument.",
    hiring_manager: "Name the framework, give one example, connect it to a result. Don't just describe how you handle it.",
  },
  company_brief: {
    recruiter: "You don't need to memorize everything. Know the 3-sentence pitch and 2–3 key product names.",
    hiring_manager: "Study this. HMs expect you to name their product, know who buys it, and have an opinion on their competitive position.",
    panel: "Know the trajectory, not just the current state. Panels ask where the company is going — have a point of view.",
    role_play: "Know the product cold. The script only works if you can talk about it naturally.",
    take_home: "Use this as the foundation for your cold email and pain point analysis.",
  },
  cheat_sheet: {
    recruiter: "Skim the key points 10 minutes before the call — that's all you need for this stage.",
    hiring_manager: "Read the key points and your strongest story before you log on, not during.",
    role_play: "Read the coachability section twice. How you take feedback in the debrief is evaluated as much as the roleplay itself.",
    panel: "Memorize your 2–3 questions and the close language. Asking nothing at the final round is a real red flag.",
    take_home: "Use the checklist before you submit. The difference is almost always one layer of research most people skip.",
  },
  resume_walkthrough: {
    hiring_manager: "This is your career story, not a bullet list. Own every transition — 'I moved because I was growing toward X' beats 'I left because I was bored.' 2–3 minutes spoken.",
    panel: "Keep it under 2 minutes. They've read your resume. Hit your 3 biggest moves, connect them to this role, and stop.",
  },
  constructive_feedback: {
    hiring_manager: "Pick REAL feedback — not a humble-brag. Show you heard it, changed a specific behavior, and have evidence it worked.",
    panel: "Lead with the feedback itself, not the outcome. Senior interviewers probe for self-awareness, not polish.",
  },
  coachability_coaching: {
    role_play: "75% of candidates lose on coachability, not the roleplay. Take feedback fast, implement it visibly — that's what they're watching.",
    hiring_manager: "If they give you feedback mid-interview: pause, acknowledge it specifically, then adjust. That IS the test.",
  },
  coachability_game_plan: {
    role_play: "Read this before anything else. The game plan is your mental framework — the actual script comes after you know how to take feedback.",
  },
  career_switcher_bridge: {
    recruiter: "Don't explain your background — reframe it. 'I've been doing the hard part of sales without the title.'",
    hiring_manager: "Use your bridge phrasing naturally. If it sounds rehearsed, it reads as insecure. Own the transition.",
  },
  cold_email: {
    take_home: "Lead with a specific trigger — hiring signal, funding round — not 'I came across your profile.' Under 150 words.",
  },
  pain_point_analysis: {
    take_home: "Anchor on ONE specific pain point, not three vague ones. Operational and specific beats broad and safe.",
  },
  assignment_guide: {
    take_home: "Read the checklist before you submit, not after. The most common failure is great writing with zero research depth.",
  },
  competitor_battle_card: {
    role_play: "When they name a competitor mid-call: acknowledge one strength, then use the discovery question. Bashing them makes you look defensive.",
    hiring_manager: "Know 2 specific reasons customers switch TO this company, not just generic differentiators.",
    panel: "Have one clear, confident positioning statement for each major competitor — not a feature list.",
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AnswerCardProps {
  slot: AnswerSlot;
  session: PrepSession;
  creditBalance: number;
  onSlotUpdate: (type: AnswerType, updates: Partial<AnswerSlot>) => void;
  onUnlock?: () => Promise<void>;
  isPrimaryForRound?: boolean;
  onReview?: () => void;
  defaultExpanded?: boolean;
}

// ─── Content type color-coding (left border stripe) ─────────────────────────

const CONTENT_TYPE_STRIPE: Partial<Record<AnswerType, string>> = {
  // Spoken (blue)
  tell_me_about_yourself: "border-l-[3px] border-[var(--type-spoken)]",
  why_sales: "border-l-[3px] border-[var(--type-spoken)]",
  why_this_company: "border-l-[3px] border-[var(--type-spoken)]",
  behavioral_star: "border-l-[3px] border-[var(--type-spoken)]",
  resume_walkthrough: "border-l-[3px] border-[var(--type-spoken)]",
  constructive_feedback: "border-l-[3px] border-[var(--type-spoken)]",
  career_switcher_bridge: "border-l-[3px] border-[var(--type-spoken)]",
  // Coaching (coral)
  coachability_coaching: "border-l-[3px] border-[var(--type-coaching)]",
  coachability_game_plan: "border-l-[3px] border-[var(--type-coaching)]",
  // Tactical (coral)
  comp_expectations: "border-l-[3px] border-[var(--type-coaching)]",
  role_play_script: "border-l-[3px] border-[var(--type-coaching)]",
  objection_response: "border-l-[3px] border-[var(--type-coaching)]",
  // Reference (muted)
  company_brief: "border-l-[3px] border-[var(--type-reference)]",
  cheat_sheet: "border-l-[3px] border-[var(--type-reference)]",
  competitor_battle_card: "border-l-[3px] border-[var(--type-reference)]",
  questions_to_ask: "border-l-[3px] border-[var(--type-reference)]",
  cold_email: "border-l-[3px] border-[var(--type-reference)]",
  pain_point_analysis: "border-l-[3px] border-[var(--type-reference)]",
  assignment_guide: "border-l-[3px] border-[var(--type-reference)]",
};

// (Content renderers moved to content-renderers.tsx)
// ─── AnswerCard ────────────────────────────────────────────────────────────────

export function AnswerCard({
  slot,
  session,
  creditBalance,
  onSlotUpdate,
  onUnlock,
  isPrimaryForRound,
  onReview,
  defaultExpanded,
}: AnswerCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [customInstruction, setCustomInstruction] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showFeedbackFollowup, setShowFeedbackFollowup] = useState(false);
  const [voiceSampleStep, setVoiceSampleStep] = useState(false);
  const [voiceSampleText, setVoiceSampleText] = useState("");
  const [copied, setCopied] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ quickAction: string | null; custom: string } | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [explicitFeedbackGiven, setExplicitFeedbackGiven] = useState(false);
  // Tracks whether action bar has faded in post-reveal
  const [actionBarVisible, setActionBarVisible] = useState(slot.status === "unlocked");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevStatusRef = useRef(slot.status);
  const regenSequenceRef = useRef(0);

  // ─── Detect locked → unlocked for reveal animations ─────────────────────────
  // useLayoutEffect is synchronous before paint — ensures animation starts from
  // the right initial state (no flash of unblurred content on first frame)
  useLayoutEffect(() => {
    if (prevStatusRef.current === "locked" && slot.status === "unlocked") {
      setJustUnlocked(true);
      setActionBarVisible(false);
      if (isCollapsible) setIsExpanded(true); // always show full content after paying to unlock
      // Action bar slides in after content clears (~400ms into reveal)
      const actionTimer = setTimeout(() => setActionBarVisible(true), 400);
      // Reset justUnlocked after CSS animations finish (800ms unlock-flash)
      const resetTimer = setTimeout(() => setJustUnlocked(false), 900);
      prevStatusRef.current = slot.status;
      return () => {
        clearTimeout(actionTimer);
        clearTimeout(resetTimer);
      };
    }
    prevStatusRef.current = slot.status;
  }, [slot.status]);

  // ─── Version state ──────────────────────────────────────────────────────────
  const versions = slot.versions ?? [];
  const [versionIndex, setVersionIndex] = useState(0);
  const totalVersions = versions.length + 1;
  const regenCount = slot.regenCount ?? 0;
  const freeRegenLeft = Math.max(0, FREE_REGENS - regenCount);

  const displayContent =
    versionIndex === 0
      ? slot.content
      : versions[versions.length - versionIndex];

  const coachingTip = QUESTION_COACHING[slot.type]?.[session.stage];
  const isLocked = slot.status === "locked";
  const isCheatSheet = slot.type === "cheat_sheet";
  const isReference = REFERENCE_TYPES.has(slot.type);
  const isCollapsible = COLLAPSIBLE_REFERENCE_TYPES.has(slot.type);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded !== false);
  const canUnlock = creditBalance > 0 && !isUnlocking && !!onUnlock;

  // ─── Card expansion tracking ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isCollapsible || slot.status !== "unlocked") return;
    if (isExpanded) {
      tracker.trackExpand(slot.type);
    } else {
      tracker.trackCollapse(slot.type);
    }
    fetch("/api/feedback/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        answerType: slot.type,
        eventType: isExpanded ? "card_expanded" : "card_collapsed",
      }),
    }).catch(() => {});
  // Only fire when isExpanded changes, not on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (slot.status === "loading") {
    return (
      <div className={`rounded-[var(--card-radius)] border border-stone-200/50 dark:border-white/5 bg-[var(--bg-card)] shadow-card overflow-hidden ${CONTENT_TYPE_STRIPE[slot.type] ?? ""}`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100 dark:border-white/5">
          <span className="text-xl leading-none flex-shrink-0 select-none">{EMOJIS[slot.type]}</span>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">{slot.label}</h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5 line-clamp-1">{slot.description}</p>
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="space-y-2.5 animate-pulse">
            <div className="h-3 bg-stone-100 dark:bg-white/5 rounded-full w-full" />
            <div className="h-3 bg-stone-100 dark:bg-white/5 rounded-full w-11/12" />
            <div className="h-3 bg-stone-100 dark:bg-white/5 rounded-full w-4/5" />
            <div className="h-3 bg-stone-100 dark:bg-white/5 rounded-full w-full" />
            <div className="h-3 bg-stone-100 dark:bg-white/5 rounded-full w-3/5" />
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-4 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Generating…
          </p>
        </div>
      </div>
    );
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function wordEditDistance(original: string, edited: string) {
    const origWords = new Set(original.trim().split(/\s+/));
    const editWords = edited.trim().split(/\s+/);
    const changed = editWords.filter((w) => !origWords.has(w)).length;
    const pct = Math.round((changed / Math.max(origWords.size, 1)) * 100);
    return { distance: changed, pct };
  }

  function logEvent(eventType: string, extras?: Record<string, number>) {
    fetch("/api/feedback/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        answerType: slot.type,
        eventType,
        ...extras,
      }),
    }).catch(() => {});
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleUnlockClick = async () => {
    if (!canUnlock) return;
    setIsUnlocking(true);
    try {
      await onUnlock();
    } finally {
      setIsUnlocking(false);
    }
  };

  function logFeedback(feedbackType: "thumbs_up" | "thumbs_down" | "copy", issueCategory?: string) {
    fetch("/api/answer-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        answerType: slot.type,
        feedbackType,
        issueCategory: issueCategory ?? null,
      }),
    }).catch(() => {});
  }

  const handleCopy = async () => {
    if (!displayContent) return;
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
    regenSequenceRef.current = 0;
    tracker.trackCopy(slot.type);
    onReview?.();
    if (slot.rating !== "up") {
      onSlotUpdate(slot.type, { rating: "up" });
      logFeedback("copy");
    }
  };

  const handleRate = (rating: "up" | "down") => {
    const next = slot.rating === rating ? undefined : rating;
    regenSequenceRef.current = 0;
    onSlotUpdate(slot.type, { rating: next });
    if (rating === "down" && next === "down") {
      onReview?.();
      setShowFeedbackFollowup(true);
      setVoiceSampleStep(false);
      logFeedback("thumbs_down");
    } else if (rating === "up" && next === "up") {
      onReview?.();
      logFeedback("thumbs_up");
      setShowFeedbackFollowup(false);
      setVoiceSampleStep(false);
    } else {
      setShowFeedbackFollowup(false);
      setVoiceSampleStep(false);
    }
  };

  const handleStartEdit = () => {
    onReview?.();
    regenSequenceRef.current = 0;
    setEditDraft(displayContent ?? "");
    setIsEditing(true);
    tracker.trackEditStart(slot.type, displayContent ?? "");
    logEvent("edit_started");
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(0, 0);
    }, 30);
  };

  const handleSaveEdit = () => {
    const trimmed = editDraft.trim();
    if (!trimmed || trimmed === slot.content) {
      setIsEditing(false);
      return;
    }
    tracker.trackEditEnd(slot.type, trimmed);
    const { distance, pct } = wordEditDistance(slot.content ?? "", trimmed);
    logEvent("edit_saved", { editDistance: distance, wordsChangedPct: pct });
    const newVersions = [...versions, slot.content ?? ""].filter(Boolean);
    onSlotUpdate(slot.type, { content: trimmed, versions: newVersions });
    setVersionIndex(0);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditDraft("");
  };

  const triggerRegen = async (quickAction: string | null, customInstr: string) => {
    if (isRegenerating) return;
    regenSequenceRef.current += 1;
    tracker.trackRegeneration(slot.type, !!(quickAction || customInstr));
    if (regenSequenceRef.current > 1) {
      logEvent("regen_consecutive", { regenSequence: regenSequenceRef.current });
    }
    setIsRegenerating(true);
    setActiveQuickAction(null);
    setCustomInstruction("");
    try {
      const res = await fetch("/api/regenerate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          answerType: slot.type,
          session,
          quickAction: quickAction ?? undefined,
          customInstruction: customInstr || undefined,
        }),
      });
      if (!res.ok) {
        let errMsg = "Regeneration failed";
        try { const errData = await res.json(); errMsg = errData.error ?? errMsg; } catch { /* HTML error page */ }
        throw new Error(errMsg);
      }
      const data = await res.json();
      const newVersions = [...versions, slot.content ?? ""].filter(Boolean);
      onSlotUpdate(slot.type, {
        content: data.content,
        answerId: data.answerId,
        versions: newVersions,
        regenCount: regenCount + 1,
        rating: undefined,
      });
      setVersionIndex(0);
      if (regenCount >= FREE_REGENS) {
        fetch("/api/user/spend-credit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: `regen-${session.id}-${slot.type}-${Date.now()}` }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Regen error:", err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleQuickAction = (key: string) => {
    if (key === "custom") { setActiveQuickAction("custom"); return; }
    if (regenCount >= FREE_REGENS && creditBalance <= 0) return;
    if (regenCount >= FREE_REGENS) { setPendingAction({ quickAction: key, custom: "" }); return; }
    triggerRegen(key, "");
  };

  const handleRegenerate = () => {
    if (regenCount >= FREE_REGENS && creditBalance <= 0) return;
    if (regenCount >= FREE_REGENS) { setPendingAction({ quickAction: null, custom: "" }); return; }
    triggerRegen(null, "");
  };

  const handleCustomSubmit = () => {
    const instr = customInstruction.trim();
    if (!instr) return;
    if (regenCount >= FREE_REGENS && creditBalance <= 0) return;
    if (regenCount >= FREE_REGENS) { setPendingAction({ quickAction: null, custom: instr }); return; }
    triggerRegen(null, instr);
  };

  const confirmCreditRegen = () => {
    if (!pendingAction) return;
    const { quickAction, custom } = pendingAction;
    setPendingAction(null);
    triggerRegen(quickAction, custom);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={`rounded-[var(--card-radius)] border overflow-hidden shadow-card hover:shadow-card-hover transition-shadow ${CONTENT_TYPE_STRIPE[slot.type] ?? ""} ${
        justUnlocked
          ? "animate-unlock-flash bg-[var(--bg-card)] border-stone-200/50 dark:border-white/5"
          : isCollapsible && !isExpanded && !isLocked
          ? "bg-[var(--bg-card-elevated)] dark:bg-[var(--bg-card)] border-stone-200/50 dark:border-white/5 md:bg-[var(--bg-card)] md:border-stone-200/50"
          : isReference && !isLocked
          ? "bg-[var(--bg-card)] border-stone-200/50 dark:border-white/5"
          : "bg-[var(--bg-card)] border-stone-200/50 dark:border-white/5"
      }`}
    >
      {/* ── Header (always visible) ─────────────────────────────────────── */}
      <div className={`flex items-start justify-between px-5 py-4 border-b border-stone-100 dark:border-white/5`}>
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="text-xl leading-none mt-0.5 flex-shrink-0 select-none">
            {EMOJIS[slot.type]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-[var(--text-primary)] text-base leading-snug">{slot.label}</h3>

              {/* Reference badge — study material, not a spoken answer */}
              {isReference && !isLocked && (
                <span className="inline-flex items-center px-1.5 py-0.5 bg-stone-100 dark:bg-white/10 text-[var(--text-tertiary)] text-[10px] font-medium rounded uppercase tracking-wide">
                  Reference
                </span>
              )}

              {/* Primary badge — only when unlocked */}
              {isPrimaryForRound && !isLocked && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-[var(--coral-bg)] text-[var(--coral-text)] text-xs font-medium rounded-full border border-[var(--coral-border)]">
                  ★ Most important for this round
                </span>
              )}

              {/* Version navigator — only when unlocked */}
              {totalVersions > 1 && !isLocked && (
                <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-white/10 rounded-full px-1 py-0.5">
                  <button
                    onClick={() => setVersionIndex(Math.min(versionIndex + 1, totalVersions - 1))}
                    disabled={versionIndex >= totalVersions - 1}
                    className="p-1.5 -m-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-opacity"
                    title="Older version"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-[var(--text-tertiary)] px-0.5 tabular-nums">
                    v{totalVersions - versionIndex}/{totalVersions}
                  </span>
                  <button
                    onClick={() => setVersionIndex(Math.max(versionIndex - 1, 0))}
                    disabled={versionIndex <= 0}
                    className="p-1.5 -m-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-opacity"
                    title="Newer version"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5 line-clamp-1 leading-snug">
              {slot.description}
            </p>
            {/* Coaching tip — callout box, only when unlocked */}
            {coachingTip && !isLocked && (
              <div className="bg-[var(--coral-bg)] border-l-[3px] border-coral dark:border-[var(--coral)] p-3 rounded-r-lg mt-2">
                <p className="text-sm text-[var(--text-secondary)] flex gap-2">
                  <span className="flex-shrink-0">💡</span>
                  <span><strong className="font-semibold text-[var(--text-primary)]">Pro tip:</strong> {coachingTip}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons — only when unlocked, fade in on reveal */}
        {!isLocked && (
          <div
            className="flex items-center gap-0.5 flex-shrink-0 ml-3"
            style={{
              opacity: actionBarVisible ? 1 : 0,
              transform: actionBarVisible ? "translateY(0)" : "translateY(6px)",
              transition: "opacity 300ms ease-out, transform 300ms ease-out",
            }}
          >
            {versionIndex === 0 && !isEditing && (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-stone-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                title="Edit this answer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating || isEditing}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-stone-50 dark:hover:bg-white/5 rounded-lg transition-colors disabled:opacity-40"
              title={freeRegenLeft > 0 ? `Refine · ${freeRegenLeft} free left` : "Refine · uses 1 credit"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
              {totalVersions > 1 ? (
                <span className="tabular-nums">v{totalVersions}</span>
              ) : freeRegenLeft > 0 ? (
                <span className="text-coral tabular-nums">{freeRegenLeft}</span>
              ) : null}
            </button>
            <button
              onClick={() => handleRate("up")}
              className={`p-2.5 -m-1 rounded-lg transition-colors ${slot.rating === "up" ? "text-green-600 bg-green-50 dark:bg-green-900/30" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-stone-50 dark:hover:bg-white/5"}`}
              title="Good answer"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleRate("down")}
              className={`p-2.5 -m-1 rounded-lg transition-colors ${slot.rating === "down" ? "text-red-500 bg-red-50 dark:bg-red-900/30" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-stone-50 dark:hover:bg-white/5"}`}
              title="Needs improvement"
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-stone-50 dark:hover:bg-white/5 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <><Check className="w-3.5 h-3.5 text-green-500" /><span className="text-green-500">Copied!</span></>
              ) : (
                <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile toggle strip — collapsible reference cards, unlocked ── */}
      {isCollapsible && !isLocked && (
        <button
          onClick={() => setIsExpanded((o) => !o)}
          className="md:hidden w-full flex items-center justify-between px-5 py-2.5 border-b border-stone-100 dark:border-white/5 bg-[var(--bg-card-elevated)] dark:bg-white/[0.02] hover:bg-stone-100/70 dark:hover:bg-white/5 transition-colors text-left"
        >
          <span className="text-xs text-[var(--text-tertiary)] font-medium">
            {isExpanded ? "Collapse" : "Tap to expand"}
          </span>
          {isExpanded
            ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          }
        </button>
      )}

      {/* ── Say This preview — mobile only, company_brief collapsed ───── */}
      {isCollapsible && !isExpanded && !isLocked && slot.type === "company_brief" && (() => {
        const sayThis = extractSayThis(displayContent);
        return sayThis ? (
          <div className="md:hidden px-5 py-3">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl p-4">
              <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <span>🗣️</span> Say This
              </p>
              <p className="text-sm text-green-900 dark:text-green-200 leading-relaxed">{sayThis}</p>
            </div>
          </div>
        ) : null;
      })()}

      {/* ══════════════════════════════════════════════════════════════════
          LOCKED STATE
          Entire content zone is ONE clickable unlock button.
          Blurred real answer text is visible behind a semi-transparent
          overlay. Lock icon + cost centered on top. One click = done.
          ══════════════════════════════════════════════════════════════ */}
      {isLocked && (
        <div
          role="button"
          tabIndex={0}
          onClick={canUnlock ? handleUnlockClick : undefined}
          onKeyDown={(e) => e.key === "Enter" && canUnlock && handleUnlockClick()}
          className={`relative mx-4 my-4 rounded-xl overflow-hidden ${
            canUnlock
              ? "cursor-pointer group hover:ring-2 hover:ring-coral/30 transition-all duration-150"
              : "cursor-default"
          }`}
          style={{ minHeight: 160 }}
          aria-label={canUnlock ? `Unlock ${slot.label} for 1 credit` : undefined}
        >
          {/* Layer 1: the real answer, blurred — gives visual depth */}
          <div
            className="px-5 py-4 text-sm leading-relaxed select-none pointer-events-none"
            style={{
              filter: "blur(5px)",
              WebkitFilter: "blur(5px)",
            }}
            aria-hidden="true"
          >
            <ContentRouter content={displayContent} answerType={slot.type} stage={session.stage} />
          </div>

          {/* Layer 2: semi-transparent overlay — lightens on hover */}
          <div className="absolute inset-0 bg-[var(--bg-card)]/60 group-hover:bg-[var(--bg-card)]/50 transition-colors duration-150 rounded-xl pointer-events-none" />

          {/* Layer 3: centered unlock CTA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {isUnlocking ? (
              <div className="flex items-center gap-2 px-6 py-3 bg-[var(--bg-card)]/95 backdrop-blur-sm rounded-xl shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-coral" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Unlocking…</span>
              </div>
            ) : creditBalance <= 0 ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 px-6 py-3 bg-[var(--bg-card)]/95 backdrop-blur-sm rounded-xl shadow-sm">
                  <Lock className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span className="text-sm font-medium text-[var(--text-tertiary)]">1 credit to unlock</span>
                </div>
                {/* This is the only non-unlock-click interactive element in locked state */}
                <Link
                  href="/dashboard/billing"
                  className="text-xs font-semibold text-coral hover:text-coral-dark dark:text-[var(--coral-text)] hover:underline pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  Get more credits →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 px-6 py-3 bg-[var(--bg-card)]/95 backdrop-blur-sm rounded-xl shadow-sm group-hover:shadow-md group-hover:scale-[1.03] transition-all duration-150">
                  <Lock className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-coral transition-colors duration-150" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Unlock · 1 credit</span>
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)]/70">
                  {creditBalance} credit{creditBalance !== 1 ? "s" : ""} remaining
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          UNLOCKED STATE — full content + action bar + pills
          Content gets blur-reveal animation on first render after unlock.
          ══════════════════════════════════════════════════════════════ */}
      {!isLocked && (
        <div className={isCollapsible && !isExpanded ? "hidden md:block" : undefined}>
          {/* ── Credit warning banner (regen) ─────────────────────────── */}
          {pendingAction !== null && (
            <div className="px-5 py-3 bg-[var(--coral-bg)] border-b border-[var(--coral-border)] flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--text-secondary)]">
                You&apos;ve used your 3 free refinements. This will use{" "}
                <strong>1 credit</strong> ({creditBalance} remaining).
              </p>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => setPendingAction(null)} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                  Cancel
                </button>
                <button onClick={confirmCreditRegen} className="text-xs font-semibold text-[var(--coral-text)] underline">
                  Use 1 credit
                </button>
              </div>
            </div>
          )}

          {/* ── Content — blur-reveal animation plays once on unlock ─── */}
          <div className={`px-5 py-5 relative ${justUnlocked ? "animate-blur-reveal" : ""}`}>
            {isRegenerating && (
              <div className="absolute inset-0 bg-[var(--bg-card)]/75 flex items-center justify-center z-10 rounded-b-xl">
                <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] bg-[var(--bg-card)] border border-stone-200/50 dark:border-white/10 px-4 py-2 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-coral" />
                  Regenerating…
                </div>
              </div>
            )}
            {isEditing ? (
              <div>
                <textarea
                  ref={textareaRef}
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  className="w-full text-sm text-[var(--text-secondary)] leading-relaxed min-h-[140px] resize-y border border-stone-200/50 dark:border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent bg-[var(--bg-card-elevated)] dark:bg-white/[0.02]"
                  placeholder="Edit your answer…"
                />
                <div className="flex items-center gap-3 mt-2.5">
                  <button onClick={handleSaveEdit} className="text-sm font-medium text-coral hover:text-coral-dark dark:text-[var(--coral-text)] dark:hover:text-coral transition-colors">
                    Save changes
                  </button>
                  <button onClick={handleCancelEdit} className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                    Cancel
                  </button>
                  {SPOKEN_TYPES.has(slot.type) && (() => {
                    const st = getSpeakingTime(editDraft);
                    if (!st) return <span className="text-xs text-[var(--text-tertiary)] ml-auto">Edits are free &amp; saved locally</span>;
                    const target = getWordTarget(slot.type, session.stage);
                    const status = target ? getWordCountStatus(st.words, target) : null;
                    const colorClass = status ? WORD_STATUS_CLASSES[status.color] : "text-[var(--text-tertiary)]";
                    return (
                      <span className={`text-xs tabular-nums ml-auto ${colorClass}`}>
                        {st.words} words · {st.display} spoken · aim for 140–160 wpm
                        {status?.flag && ` · ${status.flag}`}
                      </span>
                    );
                  })()}
                  {!SPOKEN_TYPES.has(slot.type) && (
                    <span className="text-xs text-[var(--text-tertiary)] ml-auto">Edits are free &amp; saved locally</span>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Progressive disclosure for spoken answer types with Answer Card format */}
                {SPOKEN_TYPES.has(slot.type) && displayContent && (() => {
                  const parsed = parseAnswer(displayContent, slot.type);
                  if (!parsed.isStructured) {
                    // Fallback: no Answer Card structure, render normally
                    return (
                      <>
                        <ContentRouter content={displayContent} answerType={slot.type} stage={session.stage} />
                        {(() => {
                          const st = getSpeakingTime(displayContent);
                          if (!st) return null;
                          const target = getWordTarget(slot.type, session.stage);
                          const status = target ? getWordCountStatus(st.words, target) : null;
                          const colorClass = status ? WORD_STATUS_CLASSES[status.color] : "text-[var(--text-tertiary)]";
                          return (
                            <p className={`text-xs mt-3 tabular-nums ${colorClass}`}>
                              {st.words} words · {st.display} spoken · aim for 140–160 wpm
                              {status?.flag && <span> · {status.flag}</span>}
                            </p>
                          );
                        })()}
                      </>
                    );
                  }

                  const wordCount = displayContent.trim().split(/\s+/).filter(Boolean).length;

                  // Build tabs for 30-second and full answer versions
                  const answerTabs = [];
                  if (parsed.thirtySecond) {
                    answerTabs.push({
                      id: "thirty_second",
                      label: "30-second",
                      content: <MarkdownContent content={parsed.thirtySecond} isSpoken />,
                    });
                  }
                  if (parsed.fullAnswer) {
                    answerTabs.push({
                      id: "full_answer",
                      label: "Full answer",
                      content: <MarkdownContent content={parsed.fullAnswer} isSpoken />,
                    });
                  }

                  return (
                    <div>
                      {/* Category badge + speaking time */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--blue-bg)] text-[var(--blue-text)] dark:bg-brand-blue/10 dark:text-brand-blue-light">
                          {slot.type === "behavioral_star" ? "Behavioral" : slot.type === "comp_expectations" ? "Tactical" : "Narrative"}
                        </span>
                        <SpeakingTimeBar words={wordCount} />
                      </div>

                      {/* Quick Take — always visible callout card */}
                      {parsed.quickTake && (
                        <div className="bg-[var(--blue-bg)] dark:bg-brand-blue/5 border border-[var(--blue-border,theme(colors.blue.200))] dark:border-brand-blue/20 rounded-xl p-4 mb-4">
                          <p className="text-[10px] font-bold text-[var(--blue-text)] dark:text-brand-blue-light uppercase tracking-wider mb-1.5">
                            Quick Take
                          </p>
                          <p className="text-[17px] sm:text-[18px] text-[var(--text-primary)] leading-[1.6]">
                            {renderInlineFormatting(parsed.quickTake)}
                          </p>
                        </div>
                      )}

                      {/* Tabbed answer versions (30-second / Full answer) */}
                      {answerTabs.length > 0 && (
                        <VersionTabs
                          tabs={answerTabs}
                          defaultTab={isPrimaryForRound ? "full_answer" : "thirty_second"}
                          onTabChange={(tabId) => logEvent(`tab_switch_${tabId}`)}
                        />
                      )}

                      {/* Supporting material — collapsible accordion */}
                      {parsed.proofPoints.length > 0 && (
                        <CollapsibleSection
                          title="Key proof points"
                          icon="→"
                          defaultOpen={isPrimaryForRound}
                          onToggle={(open) => { if (open) logEvent("expand_proof_points"); }}
                        >
                          <div className="space-y-1">
                            {parsed.proofPoints.map((point, pi) => (
                              <div key={pi} className="flex gap-2 text-[15px] sm:text-base text-[var(--text-secondary)] leading-relaxed">
                                <span className="text-amber-500 flex-shrink-0">→</span>
                                <span>{renderInlineFormatting(point)}</span>
                              </div>
                            ))}
                          </div>
                        </CollapsibleSection>
                      )}

                      {parsed.digDeeper && (
                        <CollapsibleSection
                          title="If they dig deeper"
                          onToggle={(open) => { if (open) logEvent("expand_dig_deeper"); }}
                        >
                          <MarkdownContent content={parsed.digDeeper} isSpoken />
                        </CollapsibleSection>
                      )}

                      {/* Coaching callout — visually distinct */}
                      {parsed.makeItYours && (
                        <div className="bg-[var(--coral-bg)] border-l-[3px] border-coral dark:border-[var(--coral)] p-3 rounded-r-lg mt-3">
                          <p className="text-sm text-[var(--text-secondary)] flex gap-2">
                            <span className="flex-shrink-0">💡</span>
                            <span><strong className="font-semibold text-[var(--text-primary)]">Make it yours:</strong> {parsed.makeItYours}</span>
                          </p>
                        </div>
                      )}

                      {/* Word count + speaking time with color-coded status */}
                      {(() => {
                        const st = getSpeakingTime(displayContent);
                        if (!st) return null;
                        const target = getWordTarget(slot.type, session.stage);
                        const status = target ? getWordCountStatus(st.words, target) : null;
                        const colorClass = status ? WORD_STATUS_CLASSES[status.color] : "text-[var(--text-tertiary)]";
                        return (
                          <p className={`text-xs mt-3 tabular-nums ${colorClass}`}>
                            {st.words} words · {st.display} spoken
                            {status?.flag && <span> · {status.flag}</span>}
                          </p>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* Non-spoken / reference types — scannable layout with prose typography */}
                {!SPOKEN_TYPES.has(slot.type) && (
                  <div className="max-w-none">
                    <ContentRouter content={displayContent} answerType={slot.type} stage={session.stage} />
                    {slot.type === "questions_to_ask" && displayContent && (() => {
                      const n = countQuestions(displayContent);
                      return n > 0 ? (
                        <p className="text-xs text-[var(--text-tertiary)] mt-3">
                          {n} question{n !== 1 ? "s" : ""} prepared
                        </p>
                      ) : null;
                    })()}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Per-answer explicit feedback ────────────────────────────── */}
          {!isEditing && !explicitFeedbackGiven && displayContent && (
            <AnswerFeedback
              sessionId={session.id}
              answerId={slot.answerId}
              answerType={slot.type}
              onFeedbackGiven={() => setExplicitFeedbackGiven(true)}
            />
          )}

          {/* ── Feedback follow-up ─────────────────────────────────────── */}
          {showFeedbackFollowup && !isEditing && (
            <div className="px-5 pb-3 -mt-1">
              {!voiceSampleStep ? (
                <>
                  <p className="text-xs text-[var(--text-tertiary)] mb-2">What was wrong with this answer?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {FEEDBACK_ISSUES.map((issue) => {
                      const categoryKey = issue.toLowerCase().replace(/ /g, "_");
                      return (
                        <button
                          key={issue}
                          onClick={() => {
                            logFeedback("thumbs_down", categoryKey);
                            setVoiceSampleStep(true);
                          }}
                          className="text-xs px-2.5 py-1 rounded-full border border-stone-200/50 dark:border-white/10 text-[var(--text-tertiary)] hover:border-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          {issue}
                        </button>
                      );
                    })}
                    <button onClick={() => setShowFeedbackFollowup(false)} className="p-2 -m-1 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--text-tertiary)]">How would you actually say this? <span className="opacity-60">(optional)</span></p>
                  <textarea
                    value={voiceSampleText}
                    onChange={(e) => setVoiceSampleText(e.target.value)}
                    placeholder="Write your version, out loud phrasing…"
                    rows={3}
                    className="w-full text-sm border border-stone-200/50 dark:border-white/10 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent bg-[var(--bg-card-elevated)] dark:bg-white/[0.02] placeholder:text-[var(--text-tertiary)] resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const trimmed = voiceSampleText.trim();
                        if (trimmed.length >= 10 && displayContent) {
                          fetch("/api/feedback/voice-sample", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              sessionId: session.id,
                              answerType: slot.type,
                              aiContentSnapshot: displayContent,
                              userVersion: trimmed,
                              stage: session.stage,
                              roleType: session.roleType,
                            }),
                          }).catch(() => {});
                        }
                        setShowFeedbackFollowup(false);
                        setVoiceSampleStep(false);
                        setVoiceSampleText("");
                      }}
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--coral-bg)] text-[var(--coral-text)] border border-[var(--coral-border)] hover:bg-coral/10 transition-colors"
                    >
                      Save my version
                    </button>
                    <button
                      onClick={() => {
                        setShowFeedbackFollowup(false);
                        setVoiceSampleStep(false);
                        setVoiceSampleText("");
                      }}
                      className="text-xs px-3 py-1.5 rounded-full border border-stone-200/50 dark:border-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Quick action pills — slide in 400ms after unlock ────────── */}
          {!isEditing && (
            <div
              className="px-5 pb-4 border-t border-stone-100 dark:border-white/5 pt-3"
              style={
                justUnlocked
                  ? { opacity: 0, animation: "action-reveal 300ms ease-out 400ms forwards" }
                  : undefined
              }
            >
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => handleQuickAction(action.key)}
                    disabled={isRegenerating}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40 ${
                      activeQuickAction === action.key
                        ? "border-[var(--coral-border)] bg-[var(--coral-bg)] text-[var(--coral-text)]"
                        : "border-stone-200/50 dark:border-white/10 text-[var(--text-tertiary)] hover:border-[var(--coral-border)] hover:text-coral hover:bg-[var(--coral-bg)]"
                    }`}
                  >
                    {action.label}
                    {regenCount >= FREE_REGENS && action.key !== "custom" ? " · 1 cr" : ""}
                  </button>
                ))}
              </div>

              {/* Free regens counter */}
              <p className="text-xs text-[var(--text-tertiary)] mt-2 flex items-center gap-1">
                {freeRegenLeft > 0 ? (
                  <><Sparkles className="w-3 h-3 text-coral/60" />{freeRegenLeft} free refinements left</>
                ) : (
                  <><Zap className="w-3 h-3 text-amber-500" />Refinements use 1 credit each</>
                )}
              </p>

              {/* Custom instruction input */}
              {activeQuickAction === "custom" && (
                <div className="mt-2.5 flex gap-2">
                  <input
                    type="text"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                    placeholder="e.g. Focus on enterprise SaaS deals, keep under 90 seconds…"
                    className="flex-1 text-sm border border-stone-200/50 dark:border-white/10 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent bg-[var(--bg-card-elevated)] dark:bg-white/[0.02] placeholder:text-[var(--text-tertiary)] text-[var(--text-primary)]"
                    autoFocus
                  />
                  <button
                    onClick={handleCustomSubmit}
                    disabled={!customInstruction.trim() || isRegenerating}
                    className="px-3 py-2 rounded-xl bg-coral text-white disabled:opacity-40 hover:bg-coral-dark transition-colors flex-shrink-0"
                    title="Apply"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setActiveQuickAction(null); setCustomInstruction(""); }}
                    className="px-3 py-2 rounded-xl border border-stone-200/50 dark:border-white/10 text-[var(--text-tertiary)] hover:bg-stone-50 dark:hover:bg-white/5 transition-colors flex-shrink-0"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
