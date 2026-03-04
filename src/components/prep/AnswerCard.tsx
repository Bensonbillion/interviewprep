"use client";

import { useState, useRef, useLayoutEffect } from "react";
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
  Edit3,
  X,
  Send,
  Sparkles,
  Zap,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AnswerSlot, AnswerType, PrepSession } from "@/types";

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

// Answer types that are SPOKEN — show speaking time estimate
const SPOKEN_TYPES = new Set<AnswerType>([
  "tell_me_about_yourself",
  "why_sales",
  "why_this_company",
  "comp_expectations",
  "coachability_coaching",
  "career_switcher_bridge",
  "resume_walkthrough",
  "constructive_feedback",
  "behavioral_star",
]);

function getSpeakingTime(text: string): { words: number; timeDisplay: string } | null {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words < 10) return null;
  const totalSeconds = Math.round((words / 130) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const timeDisplay = minutes > 0
    ? `~${minutes}:${seconds.toString().padStart(2, "0")} spoken`
    : `~${seconds}s spoken`;
  return { words, timeDisplay };
}

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
    recruiter: "90 seconds max. Lead with your strongest result, not where you went to school. Recruiters are screening for energy, clarity, and a clear reason why sales — not your full life story.",
    hiring_manager: "This is NOT the recruiter pitch. The HM wants your DECISION-MAKING ARC — why you made each move. Own every transition. End with why this specific role at this specific company is the logical next step.",
    role_play: "Frame every part of your background around discovery and pressure. What in your history proves you can handle rejection and keep going? Lead with that.",
    panel: "Multiple people, one shot. Keep it tight — 90 seconds, 3 proof points, a clear close. Hit it and stop. Don't ramble.",
  },
  why_sales: {
    recruiter: "You have one sentence to prove this isn't a fallback. Include a specific moment or realization — not 'I love people' or 'I'm competitive.' What happened that made you choose this?",
    hiring_manager: "HMs want to see intentionality. You didn't fall into sales — you chose it. Make it clear why, and connect it to what you want to build in this role.",
    role_play: "If this comes up, connect your motivation to the act of selling itself — the conversation, the qualification, the close. Not just the money.",
  },
  why_this_company: {
    recruiter: "Show basic research. Pick ONE specific thing — a product feature, a customer segment, a news item — and connect it to why you're excited. Not the mission statement.",
    hiring_manager: "This is where most candidates fail. Go deep: name the product, name a competitor, show you understand who buys this and why. Vague answers ('I love the culture') disqualify you at this stage.",
    panel: "Connect the company's market trajectory to your career ambitions. Show you understand where they're going, not just where they are. The panel is asking 'do they get it?'",
    role_play: "If this comes up: connect your excitement about the product to how you'd actually sell it. 'What drew me to this is that the pain it solves is real — I've seen it firsthand at [experience].'",
  },
  behavioral_star: {
    recruiter: "One story, one metric, under 90 seconds. 'I went from X to Y by doing Z' is all you need. Punch above your experience level with specificity.",
    hiring_manager: "HMs have heard a thousand answers that start with 'I worked really hard.' What they remember: specific numbers, real stakes, and honest self-awareness. Structure: situation (fast) → what YOU did (slow, specific) → result (quantified) → what you learned.",
    panel: "Final round — your strongest story leads. Think about which story has the best metric, the clearest outcome, and shows the trait they care about most. Make each story distinct: resilience, achievement, influence.",
    role_play: "Pick a story about recovering from failure or performing under pressure. These map directly to what they're evaluating in the role play itself.",
  },
  comp_expectations: {
    recruiter: "Give a range — not a single number. Anchor slightly above your target so there's room to negotiate down. Stay calm; they're checking budget fit, not making you an offer.",
    hiring_manager: "HMs rarely lead with this. If asked: redirect quickly to total package and what matters most to you in the opportunity — OTE structure, ramp period, trajectory.",
  },
  cheat_sheet: {
    recruiter: "Skim 10 minutes before the call. Focus on the company facts and the critical tip — those are what you actually need for this stage.",
    hiring_manager: "This is your playbook. Read the key points and your strongest story before you log on — not during the call.",
    role_play: "Read the coachability section twice. How you receive feedback in the debrief is being evaluated as carefully as the role play itself.",
    panel: "Memorize your 2–3 questions and the close language. Asking nothing or asking generic questions at the final round is a real red flag.",
    take_home: "Use the checklist before you submit. The difference between a pass and an offer is almost always one layer of research or personalization most people skip.",
  },
  company_brief: {
    recruiter: "Skim the one-liner and 2–3 talking points. Deep company knowledge isn't the bar for a recruiter screen — knowing enough to sound prepared is.",
    hiring_manager: "Study this. HMs expect you to name their product, know who buys it, and have an opinion on their competitive position. 'I did my research' is not enough — show the research in your answers.",
    panel: "Know the trajectory, not just the current state. Panels ask about where the company is going — make sure you have a point of view on that.",
    role_play: "Know the product cold. The script only works if you can talk about it naturally — not like you're reading off a spec sheet.",
    take_home: "Use this as the foundation for your cold email and pain point analysis. Everything in your submission should be grounded in real facts about this company.",
  },
  resume_walkthrough: {
    hiring_manager: "This is your CAREER STORY, not a bullet-point list. The hiring manager is testing your decision-making — why you made each move. Own every transition. Never say 'I was let go' without adding what you learned. Never say 'I left because I was bored' — say what you were growing toward. 2–3 minutes spoken.",
    panel: "Keep it tight. The panel has read your resume. Hit your 3 biggest moves, connect them to where you're going, and stop. Don't over-explain.",
  },
  constructive_feedback: {
    hiring_manager: "This is the COACHABILITY TEST. Pick real feedback — not a humble-brag. Show you heard it, changed a specific behavior, and have evidence it worked. The candidates who get offers sound honest, not polished.",
    panel: "Senior interviewers probe for self-awareness. Lead with the feedback itself, not the outcome — show you sat with it before you acted on it.",
  },
  cold_email: {
    take_home: "Lead with a specific trigger — hiring signal, funding round, LinkedIn post — not 'I came across your profile.' Subject line: specific enough that the hiring manager would actually open it. Body: under 150 words.",
  },
  pain_point_analysis: {
    take_home: "Anchor your whole assignment on one pain point — not three vague ones. Operational and specific: 'their SDRs spend 3 hours a day on manual research' beats 'they struggle with efficiency.'",
  },
  assignment_guide: {
    take_home: "Read the checklist before you submit, not after. The most common failure mode: great cold email, zero research depth behind it.",
  },
  competitor_battle_card: {
    role_play: "When a prospect names a competitor mid-call: 'Yeah, I know them well.' → acknowledge one thing they do well → use the discovery question. Bashing the competition makes you look defensive.",
    hiring_manager: "HMs test this directly. Know 2 specific reasons customers switch TO this company, not just generic differentiators. 'We're better' is not an answer.",
    panel: "Competitive awareness signals market IQ. Have one clear, confident positioning statement for each major competitor — not a memorized list of features.",
  },
  questions_to_ask: {
    recruiter: "Two goals: get intel for the HM round, and prove you think like a rep who qualifies. Ask what the HM interview focuses on — almost no one does. It immediately makes you memorable.",
    hiring_manager: "Your questions are the last thing they remember. Make at least one show you've read the job description and one show you understand their market. 'What does success look like?' is fine only if it's specific to this role.",
    panel: "Close the process. After your last question: 'Based on everything I've heard, I'm genuinely excited about this. Is there anything that would prevent you from moving me forward?' Most candidates won't say this. The ones who get offers usually do.",
    role_play: "Asking sharp questions after the debrief signals you're already a coachable rep. Ask what the top performers did differently on their first attempt — not what YOU did wrong.",
    take_home: "Ask 'what would make this an A+ submission?' before you finalize. It's the same qualifying instinct you'll use with prospects — and it usually reveals exactly what they care about.",
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
}

// ─── Content renderer ─────────────────────────────────────────────────────────

function ContentRenderer({
  content,
  slot,
  session,
}: {
  content: string | undefined;
  slot: AnswerSlot;
  session: PrepSession;
}) {
  const isJson = content?.trimStart().startsWith("{") || content?.trimStart().startsWith("[");

  if (!isJson || !content) {
    return (
      <p className="text-sm text-ink-light leading-relaxed whitespace-pre-wrap">{content}</p>
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return <p className="text-sm text-ink-light whitespace-pre-wrap">{content}</p>;
  }

  // ─ behavioral_star ─
  if (slot.type === "behavioral_star") {
    const data = parsed as {
      answers?: Array<{ question: string; answer: string; resumeSource: string }>;
    };
    return (
      <div className="space-y-6">
        {(data.answers ?? []).map((a, i) => (
          <div key={i}>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
              Q{i + 1}: {a.question}
            </p>
            <p className="text-sm text-ink-light leading-relaxed whitespace-pre-wrap">{a.answer}</p>
            <p className="text-xs text-ink-muted mt-2 italic">Source: {a.resumeSource}</p>
            {i < (data.answers?.length ?? 0) - 1 && <Separator className="mt-4" />}
          </div>
        ))}
      </div>
    );
  }

  // ─ role_play_script ─
  if (slot.type === "role_play_script") {
    const data = parsed as {
      opener?: string;
      discoveryQuestions?: string[];
      valueProp?: string;
      pivotToDemo?: string;
      objectionResponses?: Array<{ objection: string; response: string }>;
      close?: string;
      nextStepsClose?: string;
    };
    const isAEFormat = !!data.pivotToDemo || !!data.nextStepsClose;
    return (
      <div className="space-y-5">
        {data.opener && (
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
              {isAEFormat ? "Opening / Agenda Setting" : "Opener"}
            </p>
            <p className="text-sm text-ink-light leading-relaxed">{data.opener}</p>
          </div>
        )}
        {data.discoveryQuestions?.length ? (
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
              Discovery Questions
            </p>
            <ol className="list-decimal list-inside space-y-1.5">
              {data.discoveryQuestions.map((q, i) => (
                <li key={i} className="text-sm text-ink-light">{q}</li>
              ))}
            </ol>
          </div>
        ) : null}
        {(data.valueProp ?? data.pivotToDemo) ? (
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
              {isAEFormat ? "Pivot to Demo" : "Value Prop"}
            </p>
            <p className="text-sm text-ink-light leading-relaxed">
              {data.pivotToDemo ?? data.valueProp}
            </p>
          </div>
        ) : null}
        {data.objectionResponses?.length ? (
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
              Objection Responses
            </p>
            <div className="space-y-3">
              {data.objectionResponses.map((o, i) => (
                <div key={i} className="bg-[#F0F7FF] rounded-lg p-3">
                  <p className="text-xs font-medium text-ink-light mb-1">&ldquo;{o.objection}&rdquo;</p>
                  <p className="text-sm text-ink-light">{o.response}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {(data.close ?? data.nextStepsClose) ? (
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
              {isAEFormat ? "Next Steps Close" : "Close"}
            </p>
            <p className="text-sm text-ink-light leading-relaxed">
              {data.nextStepsClose ?? data.close}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  // ─ objection_response ─
  if (slot.type === "objection_response") {
    const data = parsed as { responses?: Array<{ objection: string; response: string }> };
    return (
      <div className="space-y-3">
        {(data.responses ?? []).map((o, i) => (
          <div key={i} className="bg-[#F0F7FF] rounded-lg p-3">
            <p className="text-xs font-medium text-ink-light mb-1">&ldquo;{o.objection}&rdquo;</p>
            <p className="text-sm text-ink-light">{o.response}</p>
          </div>
        ))}
      </div>
    );
  }

  // ─ questions_to_ask ─
  if (slot.type === "questions_to_ask") {
    const data = parsed as { questions?: Array<{ question: string; why: string }> };
    return (
      <div className="space-y-4">
        {(data.questions ?? []).map((q, i) => (
          <div key={i}>
            <p className="text-sm font-medium text-ink">
              {i + 1}. {q.question}
            </p>
            <p className="text-xs text-ink-muted mt-0.5 italic">{q.why}</p>
          </div>
        ))}
      </div>
    );
  }

  // ─ cheat_sheet ─
  if (slot.type === "cheat_sheet") {
    const data = parsed as {
      keyPoints?: string[];
      companyFacts?: string[];
      strongestStory?: string;
      criticalTip?: string;
    };
    return (
      <div className="bg-gradient-to-br from-[#1e40af] to-[#2563eb] rounded-xl p-5 space-y-4">
        {data.keyPoints?.length ? (
          <div>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-2">Key Points</p>
            <ul className="space-y-1.5">
              {data.keyPoints.map((kp, i) => (
                <li key={i} className="text-sm text-white flex items-start gap-2">
                  <span className="text-blue-300 flex-shrink-0 mt-0.5">•</span>
                  {kp}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {data.companyFacts?.length ? (
          <div>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-2">Company Facts</p>
            <ul className="space-y-1.5">
              {data.companyFacts.map((cf, i) => (
                <li key={i} className="text-sm text-white flex items-start gap-2">
                  <span className="text-blue-300 flex-shrink-0 mt-0.5">•</span>
                  {cf}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {data.strongestStory ? (
          <div>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-1.5">Strongest Story</p>
            <p className="text-sm text-white">{data.strongestStory}</p>
          </div>
        ) : null}
        {data.criticalTip ? (
          <div className="border border-yellow-300/40 bg-yellow-400/15 rounded-lg p-3">
            <p className="text-xs font-semibold text-yellow-300 mb-1">Critical Tip</p>
            <p className="text-sm text-yellow-50">{data.criticalTip}</p>
          </div>
        ) : null}
      </div>
    );
  }

  // ─ company_brief ─
  if (slot.type === "company_brief") {
    const data = parsed as {
      oneLiner?: string;
      productExplainer?: string;
      icpSummary?: string;
      salesMotionSummary?: string;
      competitiveLandscape?: string;
      talkingPoints?: string[];
      likelyCompanyQuestions?: string[];
    };
    return (
      <div className="space-y-4">
        {data.oneLiner && (
          <p className="text-sm font-semibold text-ink border-l-4 border-primary-500 pl-3">
            {data.oneLiner}
          </p>
        )}
        {data.productExplainer && (
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase mb-1">Product</p>
            <p className="text-sm text-ink-light">{data.productExplainer}</p>
          </div>
        )}
        {data.icpSummary && (
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase mb-1">Who They Sell To</p>
            <p className="text-sm text-ink-light">{data.icpSummary}</p>
          </div>
        )}
        {data.salesMotionSummary && (
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase mb-1">How They Sell</p>
            <p className="text-sm text-ink-light">{data.salesMotionSummary}</p>
          </div>
        )}
        {data.competitiveLandscape && (
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase mb-1">Competitive Landscape</p>
            <p className="text-sm text-ink-light">{data.competitiveLandscape}</p>
          </div>
        )}
        {data.talkingPoints?.length ? (
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase mb-2">Drop These In Conversation</p>
            <ul className="space-y-1.5">
              {data.talkingPoints.map((tp, i) => (
                <li key={i} className="text-sm text-ink-light flex items-start gap-2">
                  <span className="text-primary-500 flex-shrink-0">•</span>
                  {tp}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {data.likelyCompanyQuestions?.length ? (
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase mb-2">Be Ready For</p>
            <ul className="space-y-1">
              {data.likelyCompanyQuestions.map((q, i) => (
                <li key={i} className="text-sm text-ink-light">
                  <span className="text-primary-500">{i + 1}.</span> {q}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  // ─ career_switcher_bridge ─
  if (slot.type === "career_switcher_bridge") {
    const data = parsed as {
      bridges?: Array<{
        previousExperience: string;
        transferableSkill: string;
        bridgePhrasing: string;
        salesApplication: string;
      }>;
    };
    return (
      <div className="space-y-5">
        {(data.bridges ?? []).map((b, i) => (
          <div key={i} className="border border-[#DBEAFE] rounded-lg p-4">
            <p className="text-xs font-semibold text-ink-muted mb-1">{b.previousExperience}</p>
            <Badge variant="outline" className="text-xs mb-3">{b.transferableSkill}</Badge>
            <p className="text-sm text-ink-light mb-2 italic">&ldquo;{b.bridgePhrasing}&rdquo;</p>
            <p className="text-xs text-ink-muted">Apply when: {b.salesApplication}</p>
          </div>
        ))}
      </div>
    );
  }

  // ─ competitor_battle_card ─
  if (slot.type === "competitor_battle_card") {
    const data = parsed as {
      competitors?: Array<{
        name: string;
        strengths: string[];
        where_we_win: string[];
        switching_triggers: string[];
        discovery_question: string;
      }>;
    };
    return (
      <div className="space-y-5">
        {(data.competitors ?? []).map((c, i) => (
          <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Competitor header */}
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <span className="text-sm font-bold text-ink">⚔️ {c.name}</span>
            </div>
            <div className="px-4 py-3 space-y-3">
              {/* Strengths */}
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                  Their Strengths
                </p>
                <ul className="space-y-1">
                  {c.strengths.map((s, j) => (
                    <li key={j} className="text-sm text-ink-light flex items-start gap-2">
                      <span className="text-gray-400 flex-shrink-0">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Where we win */}
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">
                  Where We Win
                </p>
                <ul className="space-y-1">
                  {c.where_we_win.map((s, j) => (
                    <li key={j} className="text-sm text-ink-light flex items-start gap-2">
                      <span className="text-green-500 flex-shrink-0">✓</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Switching triggers */}
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">
                  Why Customers Switch
                </p>
                <ul className="space-y-1">
                  {c.switching_triggers.map((s, j) => (
                    <li key={j} className="text-sm text-ink-light flex items-start gap-2">
                      <span className="text-amber-500 flex-shrink-0">→</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Discovery question callout */}
              <div className="bg-primary-50 border-l-4 border-primary-400 rounded-r-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-primary-700 mb-1">Discovery Question</p>
                <p className="text-sm text-primary-800 italic">&ldquo;{c.discovery_question}&rdquo;</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre className="text-xs text-ink-light whitespace-pre-wrap overflow-auto bg-[#F0F7FF] rounded-lg p-3">
      {JSON.stringify(parsed, null, 2)}
    </pre>
  );
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
}: AnswerCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [customInstruction, setCustomInstruction] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showFeedbackFollowup, setShowFeedbackFollowup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ quickAction: string | null; custom: string } | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  // Tracks whether action bar has faded in post-reveal
  const [actionBarVisible, setActionBarVisible] = useState(slot.status === "unlocked");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevStatusRef = useRef(slot.status);

  // ─── Detect locked → unlocked for reveal animations ─────────────────────────
  // useLayoutEffect is synchronous before paint — ensures animation starts from
  // the right initial state (no flash of unblurred content on first frame)
  useLayoutEffect(() => {
    if (prevStatusRef.current === "locked" && slot.status === "unlocked") {
      setJustUnlocked(true);
      setActionBarVisible(false);
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
  const canUnlock = creditBalance > 0 && !isUnlocking && !!onUnlock;

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (slot.status === "loading") {
    return (
      <div className="rounded-2xl border border-[#DBEAFE] bg-white overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#EFF6FF]">
          <span className="text-xl leading-none flex-shrink-0 select-none">{EMOJIS[slot.type]}</span>
          <div>
            <h3 className="font-semibold text-ink text-sm">{slot.label}</h3>
            <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">{slot.description}</p>
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="space-y-2.5 animate-pulse">
            <div className="h-3 bg-gray-100 rounded-full w-full" />
            <div className="h-3 bg-gray-100 rounded-full w-11/12" />
            <div className="h-3 bg-gray-100 rounded-full w-4/5" />
            <div className="h-3 bg-gray-100 rounded-full w-full" />
            <div className="h-3 bg-gray-100 rounded-full w-3/5" />
          </div>
          <p className="text-xs text-ink-muted mt-4 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Generating…
          </p>
        </div>
      </div>
    );
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
    onReview?.();
    if (slot.rating !== "up") {
      onSlotUpdate(slot.type, { rating: "up" });
      logFeedback("copy");
    }
  };

  const handleRate = (rating: "up" | "down") => {
    const next = slot.rating === rating ? undefined : rating;
    onSlotUpdate(slot.type, { rating: next });
    if (rating === "down" && next === "down") {
      onReview?.();
      setShowFeedbackFollowup(true);
      logFeedback("thumbs_down");
    } else if (rating === "up" && next === "up") {
      onReview?.();
      logFeedback("thumbs_up");
      setShowFeedbackFollowup(false);
    } else {
      setShowFeedbackFollowup(false);
    }
  };

  const handleStartEdit = () => {
    onReview?.();
    setEditDraft(displayContent ?? "");
    setIsEditing(true);
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
      className={`rounded-2xl border bg-white overflow-hidden shadow-sm ${
        justUnlocked
          ? "animate-unlock-flash"
          : isReference && !isLocked
          ? "border-amber-200 bg-amber-50/30"
          : "border-[#DBEAFE]"
      }`}
    >
      {/* ── Header (always visible) ─────────────────────────────────────── */}
      <div className={`flex items-start justify-between px-5 py-4 border-b ${isReference && !isLocked ? "border-amber-100" : "border-[#EFF6FF]"}`}>
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="text-xl leading-none mt-0.5 flex-shrink-0 select-none">
            {EMOJIS[slot.type]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-ink text-sm leading-snug">{slot.label}</h3>

              {/* Reference badge — study material, not a spoken answer */}
              {isReference && !isLocked && (
                <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded uppercase tracking-wide">
                  Reference
                </span>
              )}

              {/* Primary badge — only when unlocked */}
              {isPrimaryForRound && !isLocked && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-primary-50 text-primary-600 text-xs font-medium rounded-full">
                  ★ Most important for this round
                </span>
              )}

              {/* Version navigator — only when unlocked */}
              {totalVersions > 1 && !isLocked && (
                <div className="flex items-center gap-0.5 bg-gray-100 rounded-full px-1 py-0.5">
                  <button
                    onClick={() => setVersionIndex(Math.min(versionIndex + 1, totalVersions - 1))}
                    disabled={versionIndex >= totalVersions - 1}
                    className="p-0.5 text-ink-muted hover:text-ink disabled:opacity-30 transition-opacity"
                    title="Older version"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-ink-muted px-0.5 tabular-nums">
                    v{totalVersions - versionIndex}/{totalVersions}
                  </span>
                  <button
                    onClick={() => setVersionIndex(Math.max(versionIndex - 1, 0))}
                    disabled={versionIndex <= 0}
                    className="p-0.5 text-ink-muted hover:text-ink disabled:opacity-30 transition-opacity"
                    title="Newer version"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-ink-muted mt-0.5 line-clamp-1 leading-snug">
              {slot.description}
            </p>
            {/* Coaching tip — only when unlocked */}
            {coachingTip && !isLocked && (
              <div className="bg-amber-50/60 border-l-2 border-amber-300 px-2.5 py-1.5 rounded-r-lg mt-2">
                <p className="text-xs text-amber-800 leading-snug">💡 {coachingTip}</p>
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
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-ink-muted hover:text-ink hover:bg-gray-50 rounded-lg transition-colors"
                title="Edit this answer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating || isEditing}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-ink-muted hover:text-ink hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-40"
              title={freeRegenLeft > 0 ? `Refine · ${freeRegenLeft} free left` : "Refine · uses 1 credit"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
              {totalVersions > 1 ? (
                <span className="tabular-nums">v{totalVersions}</span>
              ) : freeRegenLeft > 0 ? (
                <span className="text-primary-500 tabular-nums">{freeRegenLeft}</span>
              ) : null}
            </button>
            <button
              onClick={() => handleRate("up")}
              className={`p-1.5 rounded-lg transition-colors ${slot.rating === "up" ? "text-green-600 bg-green-50" : "text-ink-muted hover:text-ink hover:bg-gray-50"}`}
              title="Good answer"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleRate("down")}
              className={`p-1.5 rounded-lg transition-colors ${slot.rating === "down" ? "text-red-500 bg-red-50" : "text-ink-muted hover:text-ink hover:bg-gray-50"}`}
              title="Needs improvement"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-ink-muted hover:text-ink hover:bg-gray-50 rounded-lg transition-colors"
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
              ? "cursor-pointer group hover:ring-2 hover:ring-primary-200 transition-all duration-150"
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
            <ContentRenderer content={displayContent} slot={slot} session={session} />
          </div>

          {/* Layer 2: semi-transparent overlay — lightens on hover */}
          <div className="absolute inset-0 bg-white/60 group-hover:bg-white/50 transition-colors duration-150 rounded-xl pointer-events-none" />

          {/* Layer 3: centered unlock CTA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {isUnlocking ? (
              <div className="flex items-center gap-2 px-6 py-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                <span className="text-sm font-medium text-ink">Unlocking…</span>
              </div>
            ) : creditBalance <= 0 ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 px-6 py-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-sm">
                  <Lock className="w-4 h-4 text-ink-muted" />
                  <span className="text-sm font-medium text-ink-muted">1 credit to unlock</span>
                </div>
                {/* This is the only non-unlock-click interactive element in locked state */}
                <Link
                  href="/dashboard/billing"
                  className="text-xs font-semibold text-primary-500 hover:text-primary-600 hover:underline pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  Get more credits →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 px-6 py-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-sm group-hover:shadow-md group-hover:scale-[1.03] transition-all duration-150">
                  <Lock className="w-4 h-4 text-ink-muted group-hover:text-primary-500 transition-colors duration-150" />
                  <span className="text-sm font-semibold text-ink">Unlock · 1 credit</span>
                </div>
                <p className="text-[11px] text-ink-muted/70">
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
        <>
          {/* ── Credit warning banner (regen) ─────────────────────────── */}
          {pendingAction !== null && (
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-3">
              <p className="text-sm text-amber-800">
                You&apos;ve used your 3 free refinements. This will use{" "}
                <strong>1 credit</strong> ({creditBalance} remaining).
              </p>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => setPendingAction(null)} className="text-xs text-ink-muted hover:text-ink">
                  Cancel
                </button>
                <button onClick={confirmCreditRegen} className="text-xs font-semibold text-amber-700 underline">
                  Use 1 credit
                </button>
              </div>
            </div>
          )}

          {/* ── Content — blur-reveal animation plays once on unlock ─── */}
          <div className={`px-5 py-4 relative ${justUnlocked ? "animate-blur-reveal" : ""}`}>
            {isRegenerating && (
              <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-10 rounded-b-xl">
                <div className="flex items-center gap-2 text-sm text-ink-muted bg-white border border-[#DBEAFE] px-4 py-2 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
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
                  className="w-full text-sm text-ink-light leading-relaxed min-h-[140px] resize-y border border-[#DBEAFE] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-[#FAFCFF]"
                  placeholder="Edit your answer…"
                />
                <div className="flex items-center gap-3 mt-2.5">
                  <button onClick={handleSaveEdit} className="text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors">
                    Save changes
                  </button>
                  <button onClick={handleCancelEdit} className="text-sm text-ink-muted hover:text-ink transition-colors">
                    Cancel
                  </button>
                  {SPOKEN_TYPES.has(slot.type) && (() => {
                    const st = getSpeakingTime(editDraft);
                    return st ? (
                      <span className="text-xs text-ink-muted tabular-nums ml-auto">
                        {st.words} words · {st.timeDisplay}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-muted ml-auto">Edits are free &amp; saved locally</span>
                    );
                  })()}
                  {!SPOKEN_TYPES.has(slot.type) && (
                    <span className="text-xs text-ink-muted ml-auto">Edits are free &amp; saved locally</span>
                  )}
                </div>
              </div>
            ) : (
              <>
                <ContentRenderer content={displayContent} slot={slot} session={session} />
                {SPOKEN_TYPES.has(slot.type) && displayContent && (() => {
                  const st = getSpeakingTime(displayContent);
                  return st ? (
                    <p className="text-xs text-ink-muted mt-3 tabular-nums">
                      {st.words} words · {st.timeDisplay}
                    </p>
                  ) : null;
                })()}
                {slot.type === "questions_to_ask" && displayContent && (() => {
                  const n = countQuestions(displayContent);
                  return n > 0 ? (
                    <p className="text-xs text-ink-muted mt-3">
                      {n} question{n !== 1 ? "s" : ""} prepared
                    </p>
                  ) : null;
                })()}
              </>
            )}
          </div>

          {/* ── Feedback follow-up ─────────────────────────────────────── */}
          {showFeedbackFollowup && !isEditing && (
            <div className="px-5 pb-3 -mt-1">
              <p className="text-xs text-ink-muted mb-2">What was wrong with this answer?</p>
              <div className="flex flex-wrap gap-1.5">
                {FEEDBACK_ISSUES.map((issue) => {
                  const categoryKey = issue.toLowerCase().replace(/ /g, "_");
                  return (
                    <button
                      key={issue}
                      onClick={() => { logFeedback("thumbs_down", categoryKey); setShowFeedbackFollowup(false); }}
                      className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-ink-muted hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      {issue}
                    </button>
                  );
                })}
                <button onClick={() => setShowFeedbackFollowup(false)} className="p-1 rounded-full text-ink-muted hover:text-ink transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* ── Quick action pills — slide in 400ms after unlock ────────── */}
          {!isEditing && (
            <div
              className={`px-5 pb-4 border-t pt-3 ${isReference ? "border-amber-100" : "border-[#EFF6FF]"}`}
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
                        ? "border-primary-400 bg-primary-50 text-primary-600"
                        : "border-gray-200 text-ink-muted hover:border-primary-300 hover:text-primary-500 hover:bg-primary-50"
                    }`}
                  >
                    {action.label}
                    {regenCount >= FREE_REGENS && action.key !== "custom" ? " · 1 cr" : ""}
                  </button>
                ))}
              </div>

              {/* Free regens counter */}
              <p className="text-xs text-ink-muted mt-2 flex items-center gap-1">
                {freeRegenLeft > 0 ? (
                  <><Sparkles className="w-3 h-3 text-primary-400" />{freeRegenLeft} free refinements left</>
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
                    className="flex-1 text-sm border border-[#DBEAFE] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-[#FAFCFF] placeholder:text-ink-muted"
                    autoFocus
                  />
                  <button
                    onClick={handleCustomSubmit}
                    disabled={!customInstruction.trim() || isRegenerating}
                    className="px-3 py-2 rounded-xl bg-primary-500 text-white disabled:opacity-40 hover:bg-primary-600 transition-colors flex-shrink-0"
                    title="Apply"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setActiveQuickAction(null); setCustomInstruction(""); }}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-ink-muted hover:bg-gray-50 transition-colors flex-shrink-0"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
