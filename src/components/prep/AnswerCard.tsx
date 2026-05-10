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
  Mic,
} from "lucide-react";
import type { AnswerSlot, AnswerType, PrepSession } from "@/types";
import { tracker } from "@/lib/feedback/implicit-tracker";
import { AnswerFeedback } from "@/components/prep/AnswerFeedback";
import { ContentRouter } from "@/components/prep/content-renderers";
import { parseAnswer, countBullets } from "@/lib/answer-parser";
import { PrepMaterial } from "@/components/prep/PrepMaterial";
import { SpeakingTime } from "@/components/prep/SpeakingTime";
import { PracticeMode } from "@/components/prep/PracticeMode";
import { VoiceSample } from "@/components/prep/VoiceSample";
import { isStreamingAnswerType } from "@/lib/ai/streaming";
import { consumeAnswerStream } from "@/lib/streaming/consume-sse";

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
  discovery_hypothesis: "🎯",
  discovery_questions_technical: "🔧",
  discovery_questions_personal: "💭",
  discovery_questions_business: "💰",
  discovery_trap_questions: "🪤",
  discovery_scoring_guide: "📊",
  discovery_pain_recap: "🔄",
  discovery_opener: "📞",
  discovery_recommendation: "🎯",
  discovery_close: "🤝",
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

const REFERENCE_TYPES = new Set<AnswerType>([
  "company_brief",
  "cheat_sheet",
  "competitor_battle_card",
  "questions_to_ask",
  "cold_email",
  "pain_point_analysis",
  "assignment_guide",
]);

const COLLAPSIBLE_REFERENCE_TYPES = new Set<AnswerType>([
  "company_brief",
  "cheat_sheet",
  "competitor_battle_card",
  "assignment_guide",
]);

const SPOKEN_TYPES = new Set<AnswerType>([
  "tell_me_about_yourself",
  "why_sales",
  "why_this_company",
  "comp_expectations",
  "coachability_coaching",
  "resume_walkthrough",
  "constructive_feedback",
]);

// Answer types that show the "How would you say this?" voice sample prompt
const VOICE_SAMPLE_TYPES = new Set<AnswerType>([
  "tell_me_about_yourself",
  "why_sales",
  "why_this_company",
  "behavioral_star",
  "comp_expectations",
  "role_play_script",
  "objection_response",
  "coachability_coaching",
  "career_switcher_bridge",
]);

// JSON answer types — render through ContentRouter
const JSON_TYPES = new Set<AnswerType>([
  "behavioral_star",
  "role_play_script",
  "objection_response",
  "questions_to_ask",
  "cheat_sheet",
  "company_brief",
  "career_switcher_bridge",
  "coachability_game_plan",
  "competitor_battle_card",
  "cold_email",
  "pain_point_analysis",
  "assignment_guide",
]);

const CONTENT_TYPE_STRIPE: Partial<Record<AnswerType, string>> = {
  tell_me_about_yourself: "border-l-[3px] border-[var(--type-spoken)]",
  why_sales: "border-l-[3px] border-[var(--type-spoken)]",
  why_this_company: "border-l-[3px] border-[var(--type-spoken)]",
  behavioral_star: "border-l-[3px] border-[var(--type-spoken)]",
  resume_walkthrough: "border-l-[3px] border-[var(--type-spoken)]",
  constructive_feedback: "border-l-[3px] border-[var(--type-spoken)]",
  career_switcher_bridge: "border-l-[3px] border-[var(--type-spoken)]",
  coachability_coaching: "border-l-[3px] border-[var(--type-coaching)]",
  coachability_game_plan: "border-l-[3px] border-[var(--type-coaching)]",
  comp_expectations: "border-l-[3px] border-[var(--type-coaching)]",
  role_play_script: "border-l-[3px] border-[var(--type-coaching)]",
  objection_response: "border-l-[3px] border-[var(--type-coaching)]",
  company_brief: "border-l-[3px] border-[var(--type-reference)]",
  cheat_sheet: "border-l-[3px] border-[var(--type-reference)]",
  competitor_battle_card: "border-l-[3px] border-[var(--type-reference)]",
  questions_to_ask: "border-l-[3px] border-[var(--type-reference)]",
  cold_email: "border-l-[3px] border-[var(--type-reference)]",
  pain_point_analysis: "border-l-[3px] border-[var(--type-reference)]",
  assignment_guide: "border-l-[3px] border-[var(--type-reference)]",
};

function extractSayThis(content: string | undefined): string | undefined {
  if (!content) return undefined;
  try {
    const parsed = JSON.parse(content);
    return typeof parsed?.sayThis === "string" ? parsed.sayThis : undefined;
  } catch { return undefined; }
}

function countQuestions(content: string | undefined): number {
  if (!content) return 0;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed?.questions)) return parsed.questions.length;
  } catch { /* not JSON */ }
  return 0;
}

function isValidJson(content: string | undefined): boolean {
  if (!content) return false;
  const t = content.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return false;
  try { JSON.parse(t); return true; } catch { return false; }
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
  discovery_hypothesis: {
    role_play: "Say this in the first 60 seconds. It shows you did homework and positions you as a peer, not a seller. Pause after you say it — let them react.",
  },
  discovery_questions_technical: {
    role_play: "Spend 2 to 3 minutes here max. Understand the current state then move to personal pain. Do not live here — SDRs live here, AEs pass through.",
  },
  discovery_questions_personal: {
    role_play: "This is where you earn your score. After every answer: say more about that. Follow the thread. Do not move on until you feel their frustration.",
  },
  discovery_questions_business: {
    role_play: "Get a number on the table. Do not leave without quantifying at least one pain in dollars, hours, or incidents. Calculate it together.",
  },
  discovery_trap_questions: {
    role_play: "Ask one per call maximum. Never back to back. Ask naturally — if they can hear the product in the question, it is a leading question not a trap.",
  },
  discovery_scoring_guide: {
    role_play: "Review this before the call starts. Know what a 5 out of 5 looks like before you say a word. Luke evaluates all 7 categories.",
  },
  discovery_pain_recap: {
    role_play: "This is the most critical moment. Recap EVERYTHING before recommending. Get confirmation. Then say exactly: based on everything you have shared, my recommendation would be.",
  },
  discovery_opener: {
    role_play: "Set the agenda before asking anything. Most candidates skip this — it is what separates AEs from SDRs.",
  },
  discovery_recommendation: {
    role_play: "Describe capabilities — never product names. Say \"a system that detects behavior continuously\" not the product name. Each statement ties back to their exact words. Luke specifically scores whether you can recommend without pitching.",
  },
  discovery_close: {
    role_play: "Luke scores expanding scope. Ask who else is involved before proposing a next step.",
  },
};

// ─── Inline markdown renderer ────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Safety-net cleanup — parser already strips headings, this catches stragglers
  const cleaned = text
    // Remove full ## heading lines (but not content on the same line after a heading)
    .replace(/^#{1,3}\s+.+$/gm, "")
    // Remove --- dividers
    .replace(/^\s*---\s*$/gm, "")
    .trim();

  if (!cleaned) return null;

  // Split into paragraphs
  const paragraphs = cleaned.split(/\n\n+/).filter((p) => p.trim());

  function renderInline(p: string): React.ReactNode[] {
    // Handle bullet lines within a paragraph
    const lines = p.split("\n");
    const isBulletList = lines.every(
      (l) => /^\s*[-•*]\s/.test(l) || /^\s*\d+[\.\)]\s/.test(l) || !l.trim()
    );

    if (isBulletList && lines.some((l) => /^\s*[-•*]\s/.test(l) || /^\s*\d+[\.\)]\s/.test(l))) {
      return [
        <ul key="list" className="list-disc pl-5 space-y-1 my-2">
          {lines
            .filter((l) => l.trim())
            .map((l, j) => {
              const stripped = l.trim().replace(/^[-•*]\s+/, "").replace(/^\d+[\.\)]\s+/, "");
              return <li key={j}>{boldify(stripped)}</li>;
            })}
        </ul>,
      ];
    }

    return [<>{boldify(p.replace(/\n/g, " "))}</>];
  }

  return paragraphs.map((p, i) => {
    const trimmed = p.trim();
    const inner = renderInline(trimmed);
    // If it's a list, render without <p> wrapper
    if (inner.length === 1 && (inner[0] as React.ReactElement)?.type === "ul") {
      return <div key={i}>{inner}</div>;
    }
    return (
      <p key={i} className="mb-3 last:mb-0">
        {inner}
      </p>
    );
  });
}

function boldify(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Speaking time helpers (for edit mode only) ──────────────────────────────

function getSpeakingTime(text: string): {
  words: number;
  rawSeconds: number;
  withPauses: number;
  display: string;
} | null {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words < 10) return null;
  const rawSeconds = Math.round((words / 150) * 60);
  const withPauses = Math.round(rawSeconds * 1.18);
  const minutes = Math.floor(withPauses / 60);
  const seconds = withPauses % 60;
  const display = minutes > 0
    ? `~${minutes}:${seconds.toString().padStart(2, "0")}`
    : `~${seconds}s`;
  return { words, rawSeconds, withPauses, display };
}

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
  const [actionBarVisible, setActionBarVisible] = useState(slot.status === "unlocked");
  const [activeAnswerTab, setActiveAnswerTab] = useState<number>(() =>
    session.stage === "recruiter" ? 0 : 1
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevStatusRef = useRef(slot.status);
  const regenSequenceRef = useRef(0);

  // ─── Detect locked → unlocked for reveal animations ──────────────────────
  const isCollapsible = COLLAPSIBLE_REFERENCE_TYPES.has(slot.type);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded !== false);

  useLayoutEffect(() => {
    if (prevStatusRef.current === "locked" && slot.status === "unlocked") {
      setJustUnlocked(true);
      setActionBarVisible(false);
      if (isCollapsible) setIsExpanded(true);
      const actionTimer = setTimeout(() => setActionBarVisible(true), 400);
      const resetTimer = setTimeout(() => setJustUnlocked(false), 900);
      prevStatusRef.current = slot.status;
      return () => {
        clearTimeout(actionTimer);
        clearTimeout(resetTimer);
      };
    }
    prevStatusRef.current = slot.status;
  }, [slot.status, isCollapsible]);

  // ─── Version state ────────────────────────────────────────────────────────
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
  const isReference = REFERENCE_TYPES.has(slot.type);
  const [showPractice, setShowPractice] = useState(false);
  const [existingVoiceSample, setExistingVoiceSample] = useState<string | undefined>();
  const canUnlock = creditBalance > 0 && !isUnlocking && !!onUnlock;

  // Fetch existing voice sample for this answer type
  const fetchedVoiceSampleRef = useRef(false);
  useEffect(() => {
    if (fetchedVoiceSampleRef.current) return;
    if (!VOICE_SAMPLE_TYPES.has(slot.type) || isLocked || !session.id) return;
    fetchedVoiceSampleRef.current = true;
    fetch(`/api/feedback/voice-sample?sessionId=${encodeURIComponent(session.id)}`)
      .then((r) => r.json())
      .then((data) => {
        const sample = data?.samples?.[slot.type];
        if (sample) setExistingVoiceSample(sample);
      })
      .catch(() => {});
  }, [slot.type, isLocked, session.id]);

  // ─── Card expansion tracking ──────────────────────────────────────────────
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  // ─── Loading state ────────────────────────────────────────────────────────
  if (slot.status === "loading") {
    return (
      <div className="rounded-xl border border-cream-300 bg-white shadow-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-cream-300">
          <span className="text-xl leading-none flex-shrink-0 select-none">{EMOJIS[slot.type]}</span>
          <div>
            <h3 className="font-medium text-[18px] text-warm-800">{slot.label}</h3>
            <p className="text-[13px] text-warm-500 mt-0.5 line-clamp-1">{slot.description}</p>
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="space-y-2.5 animate-pulse">
            <div className="h-3 bg-cream-200 rounded-full w-full" />
            <div className="h-3 bg-cream-200 rounded-full w-11/12" />
            <div className="h-3 bg-cream-200 rounded-full w-4/5" />
            <div className="h-3 bg-cream-200 rounded-full w-full" />
            <div className="h-3 bg-cream-200 rounded-full w-3/5" />
          </div>
          <p className="text-xs text-warm-500 mt-4 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Generating…
          </p>
        </div>
      </div>
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

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

  // ─── Handlers ─────────────────────────────────────────────────────────────

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
        try {
          const errData = await res.json();
          // Rate-limit response: surface the user-friendly message verbatim.
          // See buildRateLimitResponse in src/lib/security/rate-limit.ts.
          if (res.status === 429 && errData.message) {
            errMsg = errData.message;
          } else {
            errMsg = errData.message ?? errData.error ?? errMsg;
          }
        } catch { /* HTML error page */ }
        throw new Error(errMsg);
      }

      const newVersions = [...versions, slot.content ?? ""].filter(Boolean);
      let finalAnswerId = "";
      let streamedContent = "";

      if (isStreamingAnswerType(slot.type)) {
        // Live stream — push chunks into slot.content as they arrive.
        await consumeAnswerStream(res, {
          onText: (chunk) => {
            streamedContent += chunk;
            onSlotUpdate(slot.type, { content: streamedContent });
          },
          onDone: ({ answerId }) => {
            finalAnswerId = answerId;
          },
          onError: (msg) => {
            console.error("Regen stream error:", msg);
          },
        });
        // Commit final state — versions/regenCount/rating once stream finishes.
        onSlotUpdate(slot.type, {
          content: streamedContent,
          answerId: finalAnswerId,
          versions: newVersions,
          regenCount: regenCount + 1,
          rating: undefined,
        });
      } else {
        // Existing non-streaming JSON path.
        const data = await res.json();
        onSlotUpdate(slot.type, {
          content: data.content,
          answerId: data.answerId,
          versions: newVersions,
          regenCount: regenCount + 1,
          rating: undefined,
        });
      }

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
      // Surface rate-limit messages so the user knows when to retry. The
      // server emits a friendly "try again in N minutes" message via
      // buildRateLimitResponse — pass it straight through.
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("limit")) {
        alert(msg);
      }
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

  // ─── Determine rendering path ─────────────────────────────────────────────
  const isDiscovery = slot.type.startsWith("discovery_");
  const isJson = isDiscovery || (displayContent ? isValidJson(displayContent) : false);

  // Parse answer for structured rendering (spoken types with non-JSON content)
  const parsed = (!isJson && displayContent)
    ? parseAnswer(displayContent, slot.type)
    : null;

  // Build answer versions for tabs
  const answerVersions: Array<{ title: string; content: string }> = [];
  if (parsed?.shortAnswer) {
    answerVersions.push({ title: "30-second", content: parsed.shortAnswer });
  }
  if (parsed?.fullAnswer) {
    answerVersions.push({ title: "Full answer", content: parsed.fullAnswer });
  }
  // If no explicit short/full but we have sections with answer type
  if (answerVersions.length === 0 && parsed?.isStructured) {
    const answerSections = parsed.sections.filter((s) => s.type === "answer");
    for (const s of answerSections) {
      if (s.content?.trim()) {
        answerVersions.push({ title: s.title || "Answer", content: s.content });
      }
    }
  }

  // Filter out any entries with empty content (defensive)
  const validVersions = answerVersions.filter((v) => v.content?.trim());

  // Ensure activeAnswerTab is in range
  const clampedTab = Math.min(activeAnswerTab, Math.max(0, validVersions.length - 1));
  const activeVersion = validVersions[clampedTab] ?? validVersions[0];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className={`rounded-xl border border-[#E8E4DF] overflow-hidden bg-white transition-shadow hover:shadow-md ${CONTENT_TYPE_STRIPE[slot.type] ?? ""} ${
        justUnlocked ? "animate-unlock-flash" : ""
      }`}
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 3px 8px rgba(0,0,0,0.03)" }}
    >
      {/* ═══ HEADER ═══════════════════════════════════════════════════════ */}
      <div className="px-4 sm:px-6 pt-4 pb-3">
        {/* Row 1: icon + title */}
        <div className="flex items-start gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-[17px] bg-[#FEF0EB]">
            {EMOJIS[slot.type]}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[14px] text-[#1C1713] leading-snug">
              {slot.label}
            </h3>
            <p className="text-[11px] text-[#9B8E82] mt-0.5 line-clamp-1">
              {slot.description}
            </p>
            {!isLocked && (isReference || isPrimaryForRound) && (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {isReference && (
                  <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-[#0C447C] text-[11px] font-medium rounded">Reference</span>
                )}
                {isPrimaryForRound && (
                  <span className="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-900 text-[11px] font-medium rounded">★ Priority</span>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Row 2: action buttons */}

        {!isLocked && (
          <div className="flex items-center gap-2"
            style={{
              opacity: actionBarVisible ? 1 : 0,
              transition: "opacity 300ms ease-out",
            }}
          >
            {versionIndex === 0 && !isEditing && (
              <button
                onClick={handleStartEdit}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] text-[#7A6F65] bg-[#F5F2ED] hover:bg-[#EDE9E3] transition-colors min-h-[36px]"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
            {SPOKEN_TYPES.has(slot.type) && displayContent && !isEditing && (
              <button
                onClick={() => { setShowPractice(true); logEvent("practice_mode_open"); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] text-[#7A6F65] bg-[#F5F2ED] hover:bg-[#EDE9E3] transition-colors min-h-[36px]"
              >
                <Mic className="w-3.5 h-3.5" />
                Practice
              </button>
            )}
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] text-[#7A6F65] bg-[#F5F2ED] hover:bg-[#EDE9E3] transition-colors min-h-[36px]"
            >
              {copied ? (
                <><Check className="w-3.5 h-3.5 text-green-600" />Copied</>
              ) : (
                <><Copy className="w-3.5 h-3.5" />Copy</>
              )}
            </button>
          </div>
        )}

        {/* Version navigator */}
        {totalVersions > 1 && !isLocked && (
          <div className="flex items-center gap-0.5 bg-cream-100 rounded-full px-1 py-0.5 ml-2">
            <button
              onClick={() => setVersionIndex(Math.min(versionIndex + 1, totalVersions - 1))}
              disabled={versionIndex >= totalVersions - 1}
              className="p-1.5 -m-1 text-warm-500 hover:text-warm-800 disabled:opacity-30 transition-opacity"
              title="Older version"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-xs text-warm-500 px-0.5 tabular-nums">
              v{totalVersions - versionIndex}/{totalVersions}
            </span>
            <button
              onClick={() => setVersionIndex(Math.max(versionIndex - 1, 0))}
              disabled={versionIndex <= 0}
              className="p-1.5 -m-1 text-warm-500 hover:text-warm-800 disabled:opacity-30 transition-opacity"
              title="Newer version"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* ═══ COACHING TIP — full card width ════════════════════════════════ */}
      {coachingTip && !isLocked && (
        <div className="mx-6 mb-1 flex flex-row items-start gap-3 px-4 py-3 rounded-lg" style={{ backgroundColor: "#FFFBF0", borderLeft: "3px solid #F59E0B" }}>
          <span className="text-[15px] leading-none mt-0.5 flex-shrink-0">💡</span>
          <p className="text-[13px] text-[#92400E] dark:text-amber-100 leading-relaxed m-0 flex-1 min-w-0">{coachingTip}</p>
        </div>
      )}

      {/* ═══ MOBILE TOGGLE STRIP ══════════════════════════════════════════ */}
      {isCollapsible && !isLocked && (
        <button
          onClick={() => setIsExpanded((o) => !o)}
          className="md:hidden w-full flex items-center justify-between px-4 py-2.5 border-b border-cream-300 bg-cream-50 hover:bg-cream-100 transition-colors text-left"
        >
          <span className="text-xs text-warm-500 font-medium">
            {isExpanded ? "Collapse" : "Tap to expand"}
          </span>
          {isExpanded
            ? <ChevronUp className="w-3.5 h-3.5 text-warm-500" />
            : <ChevronDown className="w-3.5 h-3.5 text-warm-500" />
          }
        </button>
      )}

      {/* Say This preview — mobile only, company_brief collapsed */}
      {isCollapsible && !isExpanded && !isLocked && slot.type === "company_brief" && (() => {
        const sayThis = extractSayThis(displayContent);
        return sayThis ? (
          <div className="md:hidden px-4 py-3">
            <div className="bg-[#EAF3DE] border border-green-200 rounded-xl p-4">
              <p className="text-[10px] font-semibold text-[#27500A] uppercase tracking-wide mb-2 flex items-center gap-1">
                <span>🗣️</span> Say This
              </p>
              <p className="text-sm text-[#27500A] leading-relaxed">{sayThis}</p>
            </div>
          </div>
        ) : null;
      })()}

      {/* ═══ LOCKED STATE ═════════════════════════════════════════════════ */}
      {isLocked && (
        <div
          role="button"
          tabIndex={0}
          onClick={canUnlock ? handleUnlockClick : undefined}
          onKeyDown={(e) => e.key === "Enter" && canUnlock && handleUnlockClick()}
          className={`px-5 py-6 flex flex-col items-center text-center gap-3 ${
            canUnlock ? "cursor-pointer group" : "cursor-default"
          }`}
          aria-label={canUnlock ? `Unlock ${slot.label} for 1 credit` : undefined}
        >
            {isUnlocking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-coral" />
                <span className="text-[13px] font-medium text-[#7A6F65]">Generating…</span>
              </>
            ) : creditBalance <= 0 ? (
              <>
                <div className="w-10 h-10 rounded-full bg-[#F5F2ED] flex items-center justify-center"><Lock className="w-4 h-4 text-[#9B8E82]" /></div>
                <span className="text-[13px] text-[#9B8E82]">1 credit to unlock</span>
                <Link href="/dashboard/billing" className="text-[12px] font-semibold text-[#E8735A] hover:underline pointer-events-auto" onClick={(e) => e.stopPropagation()}>Get more credits →</Link>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-[#F5F2ED] flex items-center justify-center group-hover:bg-[#FEF0EB] transition-colors"><Lock className="w-4 h-4 text-[#9B8E82] group-hover:text-[#E8735A] transition-colors" /></div>
                <button type="button" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1C1713] text-white text-[13px] font-medium group-hover:bg-[#2C2C2E] transition-colors pointer-events-auto">🔓 Unlock · 1 credit</button>
                <p className="text-[11px] text-[#C5BDB5]">{creditBalance} credit{creditBalance !== 1 ? "s" : ""} remaining</p>
              </>
            )}
        </div>
      )}

      {/* ═══ UNLOCKED STATE ═══════════════════════════════════════════════ */}
      {!isLocked && (
        <div className={isCollapsible && !isExpanded ? "hidden md:block" : undefined}>
          {/* Credit warning banner */}
          {pendingAction !== null && (
            <div className="px-4 md:px-6 py-3 bg-[var(--coral-bg)] border-b border-[var(--coral-border)] flex items-center justify-between gap-3">
              <p className="text-sm text-warm-700">
                You&apos;ve used your 3 free refinements. This will use{" "}
                <strong>1 credit</strong> ({creditBalance} remaining).
              </p>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => setPendingAction(null)} className="text-xs text-warm-500 hover:text-warm-800">
                  Cancel
                </button>
                <button onClick={confirmCreditRegen} className="text-xs font-semibold text-coral underline">
                  Use 1 credit
                </button>
              </div>
            </div>
          )}

          {/* ── Failed generation state ───────────────────────────────────── */}
          {displayContent === "__GENERATION_FAILED__" ? (
            <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#FEF0EB] flex items-center justify-center text-[22px]">⚠️</div>
              <div>
                <p className="text-[14px] font-semibold text-[#1C1713] mb-1">Didn&apos;t generate properly</p>
                <p className="text-[13px] text-[#9B8E82] leading-relaxed max-w-[260px]">No credit was charged. Tap below to try again.</p>
              </div>
              {onUnlock && (
                <button type="button" onClick={onUnlock} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E8735A] text-white text-[13px] font-medium hover:bg-[#C85A42] transition-colors">↻ Try again — no credit needed</button>
              )}
              <p className="text-[11px] text-[#C5BDB5]">This retry won&apos;t use a credit</p>
            </div>
          ) : (
          <>
          {/* ── Content zone ─────────────────────────────────────────────── */}
          <div className={`px-6 py-5 relative ${justUnlocked ? "animate-blur-reveal" : ""}`}>
            {isRegenerating && (
              <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-10 rounded-b-xl">
                <div className="flex items-center gap-2 text-sm text-warm-500 bg-white border border-cream-300 px-4 py-2 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-coral" />
                  Regenerating…
                </div>
              </div>
            )}

            {/* Edit mode */}
            {isEditing ? (
              <div>
                <textarea
                  ref={textareaRef}
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  className="w-full text-sm text-warm-800 leading-relaxed min-h-[140px] resize-y border border-cream-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:ring-offset-2 focus:border-transparent bg-cream-50"
                  placeholder="Edit your answer…"
                />
                <div className="flex items-center gap-3 mt-2.5">
                  <button onClick={handleSaveEdit} className="text-sm font-medium text-coral hover:text-coral-dark transition-colors">
                    Save changes
                  </button>
                  <button onClick={handleCancelEdit} className="text-sm text-warm-500 hover:text-warm-800 transition-colors">
                    Cancel
                  </button>
                  {SPOKEN_TYPES.has(slot.type) && (() => {
                    const st = getSpeakingTime(editDraft);
                    if (!st) return <span className="text-xs text-warm-500 ml-auto">Edits are free & saved locally</span>;
                    return (
                      <span className="text-xs tabular-nums ml-auto text-warm-500">
                        {st.words} words · {st.display} spoken
                      </span>
                    );
                  })()}
                  {!SPOKEN_TYPES.has(slot.type) && (
                    <span className="text-xs text-warm-500 ml-auto">Edits are free & saved locally</span>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* ═══ JSON CONTENT PATH (behavioral_star, cheat_sheet, etc.) ═══ */}
                {isJson && (
                  <div className="max-w-none">
                    <ContentRouter content={displayContent} answerType={slot.type} stage={session.stage} />
                    {slot.type === "questions_to_ask" && displayContent && (() => {
                      const n = countQuestions(displayContent);
                      return n > 0 ? (
                        <p className="text-xs text-warm-500 mt-3">
                          {n} question{n !== 1 ? "s" : ""} prepared
                        </p>
                      ) : null;
                    })()}
                    {VOICE_SAMPLE_TYPES.has(slot.type) && displayContent && (
                      <VoiceSample
                        key={`voice-json-${slot.type}`}
                        sessionId={session.id}
                        answerType={slot.type}
                        aiContentSnapshot={displayContent}
                        stage={session.stage}
                        roleType={session.roleType}
                        existingVersion={existingVoiceSample}
                      />
                    )}
                  </div>
                )}

                {/* ═══ MARKDOWN CONTENT PATH (spoken answers + unstructured text) ═══ */}
                {!isJson && displayContent && parsed?.isStructured && (
                  <div>
                    {/* Quick Take callout */}
                    {parsed.quickTake && (
                      <div className="bg-[#E6F1FB] rounded-lg px-4 py-3 mb-4">
                        <p className="text-[13px] font-medium text-[#0C447C]">
                          {parsed.quickTake}
                        </p>
                      </div>
                    )}

                    {/* TABBED ANSWER VERSIONS */}
                    {validVersions.length > 1 ? (
                      <div>
                        {/* Tab pills */}
                        <div className="flex gap-1 mb-4">
                          {validVersions.map((v, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveAnswerTab(i)}
                              className={`flex-1 md:flex-none px-4 py-2.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                                clampedTab === i
                                  ? "bg-warm-800 text-white"
                                  : "bg-transparent border border-cream-300 text-warm-500 hover:bg-cream-50"
                              }`}
                            >
                              {i === 0 ? "30-second" : "Full answer"}
                            </button>
                          ))}
                        </div>

                        {/* Active content ONLY — not both */}
                        <div className="text-left text-[15px] leading-relaxed text-warm-800 w-full">
                          {renderMarkdown(validVersions[clampedTab].content) || renderMarkdown(displayContent ?? "")}
                        </div>
                      </div>
                    ) : (
                      <div className="text-left text-[15px] leading-relaxed text-warm-800 w-full">
                        {renderMarkdown(validVersions[0]?.content || displayContent)}
                      </div>
                    )}

                    {/* Speaking time */}
                    {SPOKEN_TYPES.has(slot.type) && activeVersion && (
                      <SpeakingTime text={activeVersion.content} answerType={slot.type} />
                    )}
                    {SPOKEN_TYPES.has(slot.type) && !activeVersion && (
                      <SpeakingTime text={displayContent} answerType={slot.type} />
                    )}

                    {/* Voice sample prompt */}
                    {VOICE_SAMPLE_TYPES.has(slot.type) && displayContent && (
                      <VoiceSample
                        key={`voice-${slot.type}`}
                        sessionId={session.id}
                        answerType={slot.type}
                        aiContentSnapshot={activeVersion?.content ?? displayContent}
                        stage={session.stage}
                        roleType={session.roleType}
                        existingVersion={existingVoiceSample}
                      />
                    )}

                    {/* ── PREP MATERIAL DIVIDER ── */}
                    {(parsed.proofPoints || parsed.followups || parsed.coaching) && (
                      <div className="flex items-center gap-3 mt-5 mb-3">
                        <div className="flex-1 h-px bg-cream-300" />
                        <span className="text-[11px] uppercase tracking-wider font-medium text-warm-500">
                          Prep material
                        </span>
                        <div className="flex-1 h-px bg-cream-300" />
                      </div>
                    )}

                    {/* ── PREP MATERIAL ACCORDIONS ── */}
                    <div>
                      {parsed.proofPoints && (
                        <PrepMaterial
                          icon="📊"
                          title="Key proof points"
                          count={`${countBullets(parsed.proofPoints)} metrics`}
                          type="proof"
                        >
                          <div className="text-[13px] text-left">
                            {renderMarkdown(parsed.proofPoints)}
                          </div>
                        </PrepMaterial>
                      )}

                      {parsed.followups && (
                        <PrepMaterial
                          icon="💬"
                          title="If they dig deeper"
                          count=""
                          type="followup"
                        >
                          <div className="text-[13px] text-left">
                            {renderMarkdown(parsed.followups)}
                          </div>
                        </PrepMaterial>
                      )}

                      {parsed.coaching && (
                        <PrepMaterial
                          icon="🎯"
                          title="Make it yours"
                          count=""
                          type="coaching"
                        >
                          <div className="text-[13px] text-left">
                            {renderMarkdown(parsed.coaching)}
                          </div>
                        </PrepMaterial>
                      )}
                    </div>
                  </div>
                )}

              </>
            )}
          </div>

          {/* ── Per-answer explicit feedback ──────────────────────────────── */}
          {!isEditing && !explicitFeedbackGiven && displayContent && (
            <AnswerFeedback
              sessionId={session.id}
              answerId={slot.answerId}
              answerType={slot.type}
              onFeedbackGiven={() => setExplicitFeedbackGiven(true)}
            />
          )}

          {/* ── Feedback follow-up ───────────────────────────────────────── */}
          {showFeedbackFollowup && !isEditing && (
            <div className="px-4 md:px-6 pb-3 -mt-1">
              {!voiceSampleStep ? (
                <>
                  <p className="text-xs text-warm-500 mb-2">What was wrong with this answer?</p>
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
                          className="text-xs px-2.5 py-1 rounded-full border border-cream-300 text-warm-500 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          {issue}
                        </button>
                      );
                    })}
                    <button onClick={() => setShowFeedbackFollowup(false)} className="p-2 -m-1 rounded-full text-warm-500 hover:text-warm-800 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-warm-500">How would you actually say this? <span className="opacity-60">(optional)</span></p>
                  <textarea
                    value={voiceSampleText}
                    onChange={(e) => setVoiceSampleText(e.target.value)}
                    placeholder="Write your version, out loud phrasing…"
                    rows={3}
                    className="w-full text-sm border border-cream-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:ring-offset-2 focus:border-transparent bg-cream-50 placeholder:text-warm-500 resize-none"
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
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--coral-bg)] text-coral border border-[var(--coral-border)] hover:bg-coral/10 transition-colors"
                    >
                      Save my version
                    </button>
                    <button
                      onClick={() => {
                        setShowFeedbackFollowup(false);
                        setVoiceSampleStep(false);
                        setVoiceSampleText("");
                      }}
                      className="text-xs px-3 py-1.5 rounded-full border border-cream-300 text-warm-500 hover:text-warm-800 transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ FOOTER ═══════════════════════════════════════════════════ */}
          {!isEditing && (
            <div
              className="px-4 md:px-6 pb-4 border-t border-cream-300 pt-3"
              style={
                justUnlocked
                  ? { opacity: 0, animation: "action-reveal 300ms ease-out 400ms forwards" }
                  : undefined
              }
            >
              {/* Feedback buttons */}
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => handleRate("up")}
                  className={`text-[12px] px-3 py-1.5 rounded-md transition-colors ${
                    slot.rating === "up"
                      ? "bg-green-50 border border-green-200 text-green-700"
                      : "bg-cream-50 border border-cream-300 text-warm-700 hover:bg-cream-100"
                  }`}
                >
                  👍 Helpful
                </button>
                <button
                  onClick={() => handleRate("down")}
                  className={`text-[12px] px-3 py-1.5 rounded-md transition-colors ${
                    slot.rating === "down"
                      ? "bg-red-50 border border-red-200 text-red-600"
                      : "bg-cream-50 border border-cream-300 text-warm-700 hover:bg-cream-100"
                  }`}
                >
                  🤖 Too AI
                </button>
                <button
                  onClick={() => {
                    handleRate("down");
                    handleQuickAction("shorter");
                  }}
                  className="text-[12px] px-3 py-1.5 rounded-md bg-cream-50 border border-cream-300 text-warm-700 hover:bg-cream-100 transition-colors"
                >
                  📏 Too long
                </button>
              </div>

              {/* Refinement chips */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => handleQuickAction(action.key)}
                    disabled={isRegenerating}
                    className={`text-[12px] px-2.5 py-1 rounded-full border transition-colors disabled:opacity-40 ${
                      activeQuickAction === action.key
                        ? "border-coral bg-[var(--coral-bg)] text-coral"
                        : "border-cream-300 text-warm-700 hover:bg-cream-50"
                    }`}
                  >
                    {action.label}
                    {regenCount >= FREE_REGENS && action.key !== "custom" ? " · 1 cr" : ""}
                  </button>
                ))}
              </div>

              {/* Free regens counter */}
              <p className="text-[11px] text-warm-500 mt-2 flex items-center gap-1">
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
                    className="flex-1 text-sm border border-cream-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:ring-offset-2 focus:border-transparent bg-cream-50 placeholder:text-warm-500 text-warm-800"
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
                    className="px-3 py-2 rounded-xl border border-cream-300 text-warm-500 hover:bg-cream-50 transition-colors flex-shrink-0"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>)}
        </div>
      )}

      {/* Practice mode overlay */}
      {showPractice && displayContent && (
        <PracticeMode
          content={displayContent}
          questionLabel={slot.label}
          targetSeconds={(() => {
            const st = getSpeakingTime(displayContent);
            return st ? st.withPauses : 90;
          })()}
          onClose={() => {
            setShowPractice(false);
            logEvent("practice_mode_close");
          }}
        />
      )}
    </div>
  );
}
