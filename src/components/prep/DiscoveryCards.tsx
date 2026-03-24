"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

// ─── Shared helpers ──────────────────────────────────────────────────────────

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${className}`}>
      {children}
    </span>
  );
}

function Collapsible({
  label,
  children,
  defaultOpen = false,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {label}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** Highlight [BRACKET] placeholders in template strings */
function renderTemplate(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) =>
    part.startsWith("[") && part.endsWith("]") ? (
      <span key={i} className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 rounded px-1 font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// ─── Value driver badge colors ───────────────────────────────────────────────

const VALUE_DRIVER_COLORS: Record<string, { bg: string; border: string }> = {
  reduce_risk: { bg: "bg-red-500", border: "border-red-400" },
  increase_efficiency: { bg: "bg-emerald-500", border: "border-emerald-400" },
  digitally_transform: { bg: "bg-blue-500", border: "border-blue-400" },
};

const VALUE_DRIVER_LABELS: Record<string, string> = {
  reduce_risk: "REDUCE RISK",
  increase_efficiency: "INCREASE EFFICIENCY",
  digitally_transform: "DIGITALLY TRANSFORM",
};

// ─── 1. DiscoveryHypothesisCard ──────────────────────────────────────────────

interface HypothesisData {
  hypothesis?: string;
  valueDriver?: string;
  deliveryNote?: string;
  backupHypothesis?: string;
}

export function DiscoveryHypothesisCard({ data }: { data: HypothesisData }) {
  const driver = data.valueDriver ?? "reduce_risk";
  const colors = VALUE_DRIVER_COLORS[driver] ?? VALUE_DRIVER_COLORS.reduce_risk;
  const label = VALUE_DRIVER_LABELS[driver] ?? driver.replace(/_/g, " ").toUpperCase();

  return (
    <div className="space-y-4">
      <Pill className={`${colors.bg} text-white`}>{label}</Pill>

      {data.hypothesis && (
        <div className={`border-l-4 ${colors.border} pl-4 py-1`}>
          <p className="text-[20px] font-bold leading-snug text-[var(--text-primary)]">
            {data.hypothesis}
          </p>
        </div>
      )}

      {data.deliveryNote && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-400 rounded-r-lg px-4 py-3">
          <p className="text-[14px] italic text-stone-700 dark:text-amber-100 leading-relaxed">
            {data.deliveryNote}
          </p>
        </div>
      )}

      {data.backupHypothesis && (
        <Collapsible label="Alternate version">
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed pl-1">
            {data.backupHypothesis}
          </p>
        </Collapsible>
      )}
    </div>
  );
}

// ─── 2. DiscoveryQuestionsCard ───────────────────────────────────────────────

interface QuestionItem {
  layer?: string;
  question?: string;
  listenFor?: string;
  followUp?: string;
  trapOpportunity?: string | null;
}

const LAYER_COLORS: Record<string, { border: string; pill: string; pillText: string }> = {
  technical: { border: "border-[#FF6B4A]", pill: "bg-red-50 dark:bg-red-950/20", pillText: "text-[#FF6B4A]" },
  personal: { border: "border-amber-500", pill: "bg-amber-50 dark:bg-amber-950/20", pillText: "text-amber-600" },
  business: { border: "border-emerald-500", pill: "bg-emerald-50 dark:bg-emerald-950/20", pillText: "text-emerald-600" },
};

export function DiscoveryQuestionsCard({
  data,
  layer,
}: {
  data: QuestionItem[] | { questions?: QuestionItem[] };
  layer: "technical" | "personal" | "business";
}) {
  const questions = Array.isArray(data) ? data : (data.questions ?? []);
  const colors = LAYER_COLORS[layer] ?? LAYER_COLORS.technical;

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={i}>
          <div className={`border-l-4 ${colors.border} pl-4 py-2 min-h-[100px]`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors.pill} ${colors.pillText}`}>
                {layer}
              </span>
              <span className="text-xs font-bold text-[var(--text-tertiary)]">Q{i + 1}</span>
            </div>

            {q.question && (
              <p className="text-[17px] font-semibold leading-snug text-[var(--text-primary)] mb-2">
                {q.question}
              </p>
            )}

            {q.listenFor && (
              <p className="text-[13px] text-[var(--text-tertiary)] italic flex items-start gap-1.5">
                <span className="shrink-0 mt-0.5">→</span>
                <span>Listen for: {q.listenFor}</span>
              </p>
            )}

            {q.followUp && (
              <Collapsible label="If they stay surface-level →" className="mt-2.5">
                <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed pl-1">
                  {q.followUp}
                </p>
              </Collapsible>
            )}

            {q.trapOpportunity && q.trapOpportunity !== "null" && (
              <div className="mt-2.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20 px-2 py-0.5 rounded-full">
                  🪤 Opens trap
                </span>
              </div>
            )}
          </div>
          {i < questions.length - 1 && (
            <hr className="border-stone-200 dark:border-white/10 mt-4" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── 3. DiscoveryTrapCard ────────────────────────────────────────────────────

interface TrapItem {
  question?: string;
  trapsFor?: string;
  targetedCompetitor?: string;
  sprangAnswer?: string;
  reuseInRecap?: string;
}

export function DiscoveryTrapCard({ data }: { data: TrapItem[] | { traps?: TrapItem[] } }) {
  const traps = Array.isArray(data) ? data : (data.traps ?? []);

  return (
    <div className="space-y-5">
      {traps.map((t, i) => (
        <div key={i} className="border border-violet-200 dark:border-violet-800/40 rounded-xl overflow-hidden">
          <div className="px-4 py-3">
            <Pill className="bg-violet-500 text-white mb-3">TRAP QUESTION</Pill>

            {t.question && (
              <p className="text-[17px] font-semibold text-[var(--text-primary)] leading-snug mb-3">
                {t.question}
              </p>
            )}

            <div className="space-y-1">
              {t.trapsFor && (
                <Collapsible label="What this traps for">
                  <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed pl-1">{t.trapsFor}</p>
                </Collapsible>
              )}
              {t.sprangAnswer && (
                <Collapsible label="Sprung answer sounds like">
                  <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed pl-1 italic">
                    &ldquo;{t.sprangAnswer}&rdquo;
                  </p>
                </Collapsible>
              )}
              {t.reuseInRecap && (
                <Collapsible label="Use this in your pain recap">
                  <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed pl-1">{t.reuseInRecap}</p>
                </Collapsible>
              )}
            </div>

            <p className="text-[12px] text-[var(--text-tertiary)] italic mt-3">
              Ask this naturally — if they can hear the product, it&apos;s a leading question not a trap.
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 4. DiscoveryScoringCard ─────────────────────────────────────────────────

interface ScoringCategory {
  name?: string;
  fiveOutOfFive?: string;
  threeOutOfFive?: string;
  commonMistake?: string;
  winningMove?: string;
}

interface ScoringData {
  categories?: ScoringCategory[];
  painRecapScript?: string;
  recommendationTransition?: string;
  multithreadingClose?: string;
}

const HIGH_WEIGHT_CATEGORIES = new Set([
  "Business Pain",
  "Personal Pain",
  "Active Listening",
]);

export function DiscoveryScoringCard({ data }: { data: ScoringData }) {
  return (
    <div className="space-y-5">
      {/* Categories */}
      {data.categories?.map((cat, i) => {
        const isHigh = HIGH_WEIGHT_CATEGORIES.has(cat.name ?? "");
        return (
          <div key={i} className="border border-stone-200 dark:border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[15px] font-semibold text-[var(--text-primary)]">{cat.name}</p>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isHigh
                  ? "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400"
              }`}>
                {isHigh ? "HIGH" : "MEDIUM"}
              </span>
            </div>

            {cat.fiveOutOfFive && (
              <p className="text-[13px] text-emerald-600 dark:text-emerald-400 flex items-start gap-1.5 mb-1">
                <span className="shrink-0 mt-0.5">✓</span>
                <span>{cat.fiveOutOfFive}</span>
              </p>
            )}

            {cat.commonMistake && (
              <Collapsible label="⚠ Common mistake">
                <p className="text-[13px] text-red-600 dark:text-red-400 leading-relaxed pl-1">{cat.commonMistake}</p>
              </Collapsible>
            )}
            {cat.winningMove && (
              <Collapsible label="✓ Winning move">
                <p className="text-[13px] text-emerald-600 dark:text-emerald-400 leading-relaxed pl-1">{cat.winningMove}</p>
              </Collapsible>
            )}
          </div>
        );
      })}

      {/* Pain Recap Script callout */}
      {data.painRecapScript && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-400 rounded-r-xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
              Pain Recap — say this before recommending
            </p>
            <CopyButton text={data.painRecapScript} />
          </div>
          <p className="text-[15px] text-stone-700 dark:text-amber-100 leading-relaxed">
            {renderTemplate(data.painRecapScript)}
          </p>
        </div>
      )}

      {/* Recommendation Transition callout */}
      {data.recommendationTransition && (
        <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-[#FF6B4A] rounded-r-xl px-4 py-3">
          <p className="text-xs font-bold text-[#FF6B4A] uppercase tracking-wide mb-2">
            The bridge phrase
          </p>
          <p className="text-[20px] font-bold text-[var(--text-primary)] leading-snug">
            {data.recommendationTransition}
          </p>
        </div>
      )}

      {/* Multi-threading Close callout */}
      {data.multithreadingClose && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-400 rounded-r-xl px-4 py-3">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-300 uppercase tracking-wide mb-2">
            Expand scope
          </p>
          <p className="text-[15px] text-stone-700 dark:text-blue-100 leading-relaxed">
            {data.multithreadingClose}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── 5. DiscoveryPainRecapCard ───────────────────────────────────────────────

interface PainRecapData {
  recapTemplate?: string;
  confirmationQuestion?: string;
  recommendationBridge?: string;
  scopeExpansionPrompt?: string;
  coachingNote?: string;
}

export function DiscoveryPainRecapCard({ data }: { data: PainRecapData }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Pill className="bg-amber-600 text-white">PAIN RECAP</Pill>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1.5">
          Say every pain thread before recommending
        </p>
      </div>

      {/* Template with highlighted brackets */}
      {data.recapTemplate && (
        <div className="bg-[var(--bg-card-elevated)] dark:bg-white/5 rounded-xl px-4 py-3">
          <p className="text-[16px] text-[var(--text-primary)] leading-[1.7]">
            {renderTemplate(data.recapTemplate)}
          </p>
        </div>
      )}

      {/* Confirmation question */}
      {data.confirmationQuestion && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-400 rounded-r-lg px-4 py-3">
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">
            Get confirmation →
          </p>
          <p className="text-[15px] italic text-stone-700 dark:text-emerald-100 leading-relaxed">
            {data.confirmationQuestion}
          </p>
        </div>
      )}

      {/* Recommendation bridge — THE most important element */}
      {data.recommendationBridge && (
        <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-[#FF6B4A] rounded-r-lg px-4 py-3">
          <p className="text-xs font-bold text-[#FF6B4A] mb-1.5">
            Then say exactly:
          </p>
          <p className="text-[18px] font-bold text-[var(--text-primary)] leading-snug">
            {data.recommendationBridge}
          </p>
        </div>
      )}

      {/* Scope expansion — collapsible */}
      {data.scopeExpansionPrompt && (
        <Collapsible label="Expand the opportunity →">
          <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-400 rounded-r-lg px-4 py-3">
            <p className="text-[15px] text-stone-700 dark:text-blue-100 leading-relaxed">
              {data.scopeExpansionPrompt}
            </p>
          </div>
        </Collapsible>
      )}

      {/* Coaching note from evaluator */}
      {data.coachingNote && (
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1">
            <span>👁️</span>
            What Luke evaluates here:
          </p>
          <p className="text-[13px] italic text-stone-600 dark:text-amber-200/80 leading-relaxed">
            {data.coachingNote}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── 6. DiscoveryOpenerCard ──────────────────────────────────────────────────

interface OpenerData {
  grabAttention?: string;
  benefitStatement?: string;
  agenda?: string;
  transitionToDiscovery?: string;
  fullScript?: string;
  coachingNote?: string;
}

export function DiscoveryOpenerCard({ data }: { data: OpenerData }) {
  return (
    <div className="space-y-4">
      <Pill className="bg-emerald-500 text-white">CALL OPENER</Pill>

      {data.coachingNote && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-400 rounded-r-lg px-4 py-3">
          <p className="text-[14px] italic text-stone-700 dark:text-emerald-100 leading-relaxed">
            {data.coachingNote}
          </p>
        </div>
      )}

      {data.fullScript && (
        <div className="border-l-4 border-emerald-500 pl-4 py-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Full Script</p>
            <CopyButton text={data.fullScript} />
          </div>
          <p className="text-[16px] text-[var(--text-primary)] leading-relaxed">
            {data.fullScript}
          </p>
        </div>
      )}

      {data.grabAttention && (
        <Collapsible label="Grab attention (0-10s)">
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed pl-1">{data.grabAttention}</p>
        </Collapsible>
      )}
      {data.benefitStatement && (
        <Collapsible label="Benefit statement (10-20s)">
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed pl-1">{data.benefitStatement}</p>
        </Collapsible>
      )}
      {data.agenda && (
        <Collapsible label="Set the agenda (20-40s)">
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed pl-1">{data.agenda}</p>
        </Collapsible>
      )}
      {data.transitionToDiscovery && (
        <Collapsible label="Transition to discovery">
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed pl-1">{data.transitionToDiscovery}</p>
        </Collapsible>
      )}
    </div>
  );
}

// ─── 7. DiscoveryRecommendationCard ──────────────────────────────────────────

interface RecommendationData {
  challengerTeachMoment?: string;
  bridgePhrase?: string;
  recommendationTemplate?: string;
  wrongTransitions?: Array<{ phrase?: string; why?: string }>;
  fullScript?: string;
  coachingNote?: string;
}

export function DiscoveryRecommendationCard({ data }: { data: RecommendationData }) {
  return (
    <div className="space-y-4">
      <Pill className="bg-[#FF6B4A] text-white">MY RECOMMENDATION</Pill>

      {data.coachingNote && (
        <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-[#FF6B4A] rounded-r-lg px-4 py-3">
          <p className="text-[14px] italic text-stone-700 dark:text-red-100 leading-relaxed">
            {data.coachingNote}
          </p>
        </div>
      )}

      {data.bridgePhrase && (
        <div className="border-2 border-[#FF6B4A]/30 rounded-xl px-5 py-4 text-center">
          <p className="text-[22px] font-bold text-[#FF6B4A] leading-snug">
            {data.bridgePhrase}
          </p>
        </div>
      )}

      {data.recommendationTemplate && (
        <div className="bg-[var(--bg-card-elevated)] dark:bg-white/5 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            Complete the bridge with their words
          </p>
          <p className="text-[16px] text-[var(--text-primary)] leading-[1.7]">
            {renderTemplate(data.recommendationTemplate)}
          </p>
        </div>
      )}

      {data.challengerTeachMoment && (
        <Collapsible label="The Challenger Teach Moment (say this BEFORE the bridge)">
          <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-400 rounded-r-lg px-4 py-3">
            <p className="text-[15px] text-stone-700 dark:text-blue-100 leading-relaxed">
              {data.challengerTeachMoment}
            </p>
          </div>
        </Collapsible>
      )}

      {data.wrongTransitions && data.wrongTransitions.length > 0 && (
        <Collapsible label="What not to say">
          <div className="space-y-2">
            {data.wrongTransitions.map((wt, i) => (
              <div key={i} className="flex items-start gap-2 text-[14px]">
                <span className="text-red-500 shrink-0 mt-0.5">✗</span>
                <div>
                  <p className="font-medium text-[var(--text-primary)]">&ldquo;{wt.phrase}&rdquo;</p>
                  {wt.why && <p className="text-[var(--text-tertiary)] text-[13px] mt-0.5">{wt.why}</p>}
                </div>
              </div>
            ))}
          </div>
        </Collapsible>
      )}
    </div>
  );
}

// ─── 8. DiscoveryCloseCard ───────────────────────────────────────────────────

interface CloseData {
  multithreadingAsk?: string;
  confirmingQuestion?: string;
  nextStepProposal?: string;
  closeScript?: string;
  notReadyHandle?: string;
  fullScript?: string;
  coachingNote?: string;
}

export function DiscoveryCloseCard({ data }: { data: CloseData }) {
  return (
    <div className="space-y-4">
      <Pill className="bg-blue-500 text-white">CLOSE + NEXT STEPS</Pill>

      {data.coachingNote && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-400 rounded-r-lg px-4 py-3">
          <p className="text-[14px] italic text-stone-700 dark:text-blue-100 leading-relaxed">
            {data.coachingNote}
          </p>
        </div>
      )}

      <div className="space-y-1">
        {data.multithreadingAsk && (
          <Collapsible label="1. Expand scope" defaultOpen>
            <div className="border-l-4 border-blue-400 pl-4 py-1">
              <p className="text-[15px] text-[var(--text-primary)] leading-relaxed">{data.multithreadingAsk}</p>
            </div>
          </Collapsible>
        )}
        {data.confirmingQuestion && (
          <Collapsible label="2. Surface concerns">
            <div className="border-l-4 border-blue-400 pl-4 py-1">
              <p className="text-[15px] text-[var(--text-primary)] leading-relaxed">{data.confirmingQuestion}</p>
            </div>
          </Collapsible>
        )}
        {data.nextStepProposal && (
          <Collapsible label="3. Propose next step">
            <div className="border-l-4 border-blue-400 pl-4 py-1">
              <p className="text-[15px] text-[var(--text-primary)] leading-relaxed">{data.nextStepProposal}</p>
            </div>
          </Collapsible>
        )}
        {data.closeScript && (
          <Collapsible label="4. Set the calendar">
            <div className="border-l-4 border-blue-400 pl-4 py-1">
              <p className="text-[15px] text-[var(--text-primary)] leading-relaxed">{data.closeScript}</p>
            </div>
          </Collapsible>
        )}
      </div>

      {data.notReadyHandle && (
        <Collapsible label="If they're not ready">
          <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-400 rounded-r-lg px-4 py-3">
            <p className="text-[15px] text-stone-700 dark:text-amber-100 leading-relaxed">
              {data.notReadyHandle}
            </p>
          </div>
        </Collapsible>
      )}
    </div>
  );
}
