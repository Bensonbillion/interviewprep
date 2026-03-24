import { tryParseJSON, keyToLabel } from "@/lib/content-parser";
import { Badge } from "@/components/ui/badge";
import type { AnswerType } from "@/types";
import {
  DiscoveryHypothesisCard,
  DiscoveryQuestionsCard,
  DiscoveryTrapCard,
  DiscoveryScoringCard,
  DiscoveryPainRecapCard,
} from "./DiscoveryCards";

// ─── Inline formatting: **bold** and *italic* ──────────────────────────────
export function renderInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-stone-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Formatted text content ────────────────────────────────────────────────
export function FormattedTextContent({ content, isSpoken }: { content: string; isSpoken?: boolean }) {
  const trimmedContent = typeof content === "string" ? content.trim() : "";
  if (trimmedContent.startsWith("{") || trimmedContent.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmedContent);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return <GenericStructuredContent data={parsed as Record<string, unknown>} />;
      }
    } catch { /* not JSON — render as text */ }
  }

  const blocks = content.split(/\n\n+/).filter((b) => b.trim());

  return (
    <div className="space-y-3 max-w-prose">
      {blocks.map((block, i) => {
        const trimmed = block.trim();

        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={i} className="text-sm font-semibold text-stone-900 dark:text-[var(--text-primary)] mt-2 first:mt-0">
              {trimmed.slice(4)}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={i} className="text-base font-semibold text-stone-900 dark:text-[var(--text-primary)] mt-3 first:mt-0">
              {trimmed.slice(3)}
            </h3>
          );
        }

        if (trimmed === "---" || trimmed === "***") {
          return <hr key={i} className="border-stone-200 dark:border-white/10 my-2" />;
        }

        const lines = trimmed.split("\n");
        const isList = lines.every(
          (l) => /^\s*[-•]\s/.test(l) || /^\s*\d+[\.\)]\s/.test(l)
        );

        if (isList) {
          return (
            <ul key={i} className="space-y-1.5">
              {lines.map((line, j) => {
                const text = line
                  .trim()
                  .replace(/^[-•]\s+/, "")
                  .replace(/^\d+[\.\)]\s+/, "");
                return (
                  <li key={j} className="flex gap-2 text-[17px] sm:text-[18px] text-stone-700 dark:text-[var(--text-primary)] leading-[1.6]">
                    <span className="text-[var(--text-tertiary)] mt-0.5 flex-shrink-0">•</span>
                    <span>{renderInlineFormatting(text)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p
            key={i}
            className={`text-[17px] sm:text-[18px] leading-[1.6] ${
              i === 0 && isSpoken
                ? "text-stone-900 dark:text-[var(--text-primary)] font-medium"
                : "text-stone-700 dark:text-[var(--text-primary)]"
            }`}
          >
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {renderInlineFormatting(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// ─── Generic structured JSON renderer ──────────────────────────────────────
export function GenericStructuredContent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, value]) => {
        if (key.startsWith("_") || key === "type" || key === "version") return null;
        const label = keyToLabel(key);

        return (
          <div key={key}>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">
              {label}
            </h4>
            {Array.isArray(value) ? (
              <ul className="space-y-1.5">
                {value.map((item, i) => (
                  <li key={i} className="flex gap-2 text-[15px] sm:text-[16px] text-stone-700 dark:text-[var(--text-primary)]">
                    <span className="text-[var(--text-tertiary)] mt-0.5 flex-shrink-0">•</span>
                    <span className="leading-relaxed">
                      {typeof item === "string"
                        ? renderInlineFormatting(item)
                        : typeof item === "object" && item !== null
                        ? Object.entries(item as Record<string, unknown>)
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(" · ")
                        : String(item)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : typeof value === "object" && value !== null ? (
              <div className="bg-[var(--bg-card-elevated)] dark:bg-white/5 rounded-xl p-3">
                <GenericStructuredContent data={value as Record<string, unknown>} />
              </div>
            ) : (
              <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">{String(value)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── STAR section parser for behavioral answers ─────────────────────────────
const STAR_BADGES = [
  { pattern: /^(?:\*{0,2})Situation(?:\*{0,2})\s*[:—–-]\s*/i, letter: "S", label: "Situation", bg: "bg-brand-blue", ring: "ring-blue-200 dark:ring-blue-800" },
  { pattern: /^(?:\*{0,2})Task(?:\*{0,2})\s*[:—–-]\s*/i, letter: "T", label: "Task", bg: "bg-[var(--warning)]", ring: "ring-amber-200 dark:ring-amber-800" },
  { pattern: /^(?:\*{0,2})Action[s]?(?:\*{0,2})\s*[:—–-]\s*/i, letter: "A", label: "Action", bg: "bg-[var(--success)]", ring: "ring-green-200 dark:ring-green-800" },
  { pattern: /^(?:\*{0,2})Result[s]?(?:\*{0,2})\s*[:—–-]\s*/i, letter: "R", label: "Result", bg: "bg-purple-500", ring: "ring-purple-200 dark:ring-purple-800" },
] as const;

function STARContent({ text }: { text: string }) {
  const sections: Array<{ letter: string; label: string; bg: string; ring: string; content: string }> = [];
  const paragraphs = text.split(/\n(?=\*{0,2}(?:Situation|Task|Actions?|Results?)\*{0,2}\s*[:—–-])/i);
  let currentSection: (typeof sections)[number] | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (currentSection) {
      sections.push({ ...currentSection, content: buffer.join("\n\n").trim() });
    }
    buffer = [];
  };

  for (const para of paragraphs) {
    const firstLine = para.trim().split("\n")[0];
    const badge = STAR_BADGES.find((b) => b.pattern.test(firstLine));
    if (badge) {
      flush();
      const cleaned = para.trim().replace(badge.pattern, "");
      currentSection = { letter: badge.letter, label: badge.label, bg: badge.bg, ring: badge.ring, content: "" };
      buffer.push(cleaned);
    } else {
      buffer.push(para);
    }
  }
  flush();

  if (sections.length < 2) {
    return <FormattedTextContent content={text} isSpoken />;
  }

  return (
    <div className="space-y-3">
      {sections.map((s, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className={`w-7 h-7 rounded-full ${s.bg} ring-2 ${s.ring} flex items-center justify-center`}>
              <span className="text-xs font-bold text-white">{s.letter}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-[15px] sm:text-[16px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">{renderInlineFormatting(s.content)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stage detection coaching (for cheat_sheet) ─────────────────────────────
const STAGE_DETECTION_COACHING: Record<string, {
  technique: string;
  testing: string;
  coach: string;
}> = {
  recruiter: {
    technique: "SCREENING FILTER",
    testing: "Can you communicate clearly in under 90 seconds? Did you research the company? Are you serious or spray-and-praying?",
    coach: "They're making a yes/no decision in the first 2 minutes. Be concise. Show you know what the company does. Ask at least one sharp question.",
  },
  hiring_manager: {
    technique: "DETAIL DRILL + OWNERSHIP TEST",
    testing: "Did you actually DO the things on your resume? Can you go deeper than the headline? Do you think like someone ready for more ownership?",
    coach: "They WILL probe your stories. Be ready to go one level deeper on any claim you make. Use 'I' not 'we' when describing your actions. Have a specific number for every achievement.",
  },
  role_play: {
    technique: "COACHABILITY TEST",
    testing: "Can you take feedback and immediately implement it? This is the #1 predictor of SDR success — not the roleplay itself.",
    coach: "The first roleplay is a baseline. The SECOND one is the actual test. When they give feedback, absorb it visibly — nod, paraphrase it back, then implement it even if imperfectly. Effort > perfection.",
  },
  panel: {
    technique: "MULTI-STAKEHOLDER PRESSURE",
    testing: "Can you adapt your communication style across seniority levels? Can you handle being challenged by multiple people simultaneously?",
    coach: "Different panelists care about different things. VP wants strategic thinking. SDR Manager wants tactical detail. AE wants to know you'll generate quality pipeline. Read the room and adjust.",
  },
  take_home: {
    technique: "RESEARCH DEPTH TEST",
    testing: "Did you actually understand the ICP and market, or did you Google the company for 10 minutes? Can you think like a rep, not a job applicant?",
    coach: "Every good submission has one specific, non-obvious insight about the buyer. Find the thing that proves you did the work. Generic submissions look identical to each other.",
  },
};

// ─── ContentRouter — picks the right renderer ──────────────────────────────
export function ContentRouter({
  content,
  answerType,
  stage,
}: {
  content: string | undefined;
  answerType: AnswerType;
  stage?: string;
}) {
  if (!content) return null;

  // ─ Discovery cards — route FIRST with self-contained parsing ─
  if (answerType.startsWith("discovery_")) {
    let data: unknown = null;
    try {
      data = typeof content === "object" ? content : JSON.parse(content.trim());
    } catch { /* fall through to generic */ }
    // Handle double-encoded JSON strings (content stored as a JSON string inside JSONB)
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch { /* use as-is */ }
    }
    if (data) {
      if (answerType === "discovery_hypothesis") {
        return <DiscoveryHypothesisCard data={data as Record<string, unknown>} />;
      }
      if (answerType === "discovery_questions_technical") {
        return <DiscoveryQuestionsCard data={Array.isArray(data) ? data : []} layer="technical" />;
      }
      if (answerType === "discovery_questions_personal") {
        return <DiscoveryQuestionsCard data={Array.isArray(data) ? data : []} layer="personal" />;
      }
      if (answerType === "discovery_questions_business") {
        return <DiscoveryQuestionsCard data={Array.isArray(data) ? data : []} layer="business" />;
      }
      if (answerType === "discovery_trap_questions") {
        return <DiscoveryTrapCard data={Array.isArray(data) ? data : []} />;
      }
      if (answerType === "discovery_scoring_guide") {
        return <DiscoveryScoringCard data={data as Record<string, unknown>} />;
      }
      if (answerType === "discovery_pain_recap") {
        return <DiscoveryPainRecapCard data={data as Record<string, unknown>} />;
      }
    }
  }

  const parsed = tryParseJSON(content);

  if (parsed === null) {
    const isSpoken = SPOKEN_ANSWER_TYPES.has(answerType);
    return <FormattedTextContent content={content} isSpoken={isSpoken} />;
  }

  // ─ behavioral_star ─
  if (answerType === "behavioral_star") {
    const data = parsed as {
      answers?: Array<{ question: string; answer: string; resumeSource: string }>;
    };
    return (
      <div className="space-y-6">
        {(data.answers ?? []).map((a, i) => (
          <div key={i}>
            <h4 className="text-[14px] sm:text-[15px] font-semibold text-stone-800 dark:text-[var(--text-primary)] flex gap-2 mb-2">
              <span className="text-brand-blue dark:text-brand-blue-light shrink-0">Q{i + 1}:</span>
              <span>{a.question}</span>
            </h4>
            <STARContent text={a.answer} />
            <p className="text-xs text-[var(--text-tertiary)] mt-2 italic">Source: {a.resumeSource}</p>
            {i < (data.answers?.length ?? 0) - 1 && (
              <hr className="border-stone-200 dark:border-white/10 mt-4" />
            )}
          </div>
        ))}
      </div>
    );
  }

  // ─ role_play_script ─
  if (answerType === "role_play_script") {
    const data = parsed as {
      coachingNote?: string;
      patternInterruptOpener?: string;
      valueHypothesis?: string;
      bridgeToNextStep?: string;
      pivotToDemo?: string;
      nextStepsClose?: string;
      opener?: string;
      discoveryQuestions?: string[];
      valueProp?: string;
      objectionResponses?: Array<{ objection: string; response: string }>;
      close?: string;
    };
    const isAEFormat = !!data.pivotToDemo || !!data.nextStepsClose;
    const isNewSDRFormat = !!data.patternInterruptOpener || !!data.valueHypothesis || !!data.bridgeToNextStep;

    if (isNewSDRFormat) {
      return (
        <div className="space-y-5">
          {data.coachingNote && (
            <div className="bg-[var(--warning-bg)] border border-[var(--warning)]/20 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-[var(--warning)] uppercase tracking-wide mb-1">How to Use This</p>
              <p className="text-sm text-stone-800 dark:text-[var(--text-primary)] leading-relaxed">{data.coachingNote}</p>
            </div>
          )}
          {data.patternInterruptOpener && (
            <div className="border border-stone-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-[var(--bg-card-elevated)] dark:bg-white/5 border-b border-stone-200 dark:border-white/10 flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">1 · Pattern Interrupt Opener</span>
                <span className="text-xs text-[var(--text-tertiary)] ml-auto">~10 sec</span>
              </div>
              <p className="px-4 py-3 text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">{data.patternInterruptOpener}</p>
            </div>
          )}
          {data.valueHypothesis && (
            <div className="border border-stone-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-[var(--bg-card-elevated)] dark:bg-white/5 border-b border-stone-200 dark:border-white/10 flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">2 · Value Hypothesis</span>
                <span className="text-xs text-[var(--text-tertiary)] ml-auto">~15–20 sec</span>
              </div>
              <p className="px-4 py-3 text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">{data.valueHypothesis}</p>
            </div>
          )}
          {data.discoveryQuestions?.length ? (
            <div className="border border-stone-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-[var(--bg-card-elevated)] dark:bg-white/5 border-b border-stone-200 dark:border-white/10 flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">3 · Discovery Questions</span>
                <span className="text-xs text-[var(--text-tertiary)] ml-auto">bulk of call</span>
              </div>
              <ol className="px-4 py-3 space-y-2">
                {data.discoveryQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-xs font-bold text-brand-blue dark:text-brand-blue-light mt-0.5 flex-shrink-0">Q{i + 1}</span>
                    <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)]">{q}</p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          {data.objectionResponses?.length ? (
            <div>
              <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Objection Responses
              </p>
              <div className="space-y-3">
                {data.objectionResponses.map((o, i) => (
                  <div key={i} className="bg-[var(--blue-bg)] dark:bg-white/5 rounded-xl p-3">
                    <p className="text-xs font-medium text-[var(--text-primary)] mb-1.5">&ldquo;{o.objection}&rdquo;</p>
                    <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">{o.response}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {data.bridgeToNextStep && (
            <div className="border border-brand-blue/20 dark:border-brand-blue-light/20 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-[var(--blue-bg)] border-b border-brand-blue/10 flex items-center gap-2">
                <span className="text-xs font-bold text-brand-blue-dark dark:text-brand-blue-light uppercase tracking-wide">4 · Bridge to Next Step</span>
                <span className="text-xs text-brand-blue dark:text-brand-blue-light ml-auto">~10 sec</span>
              </div>
              <p className="px-4 py-3 text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">{data.bridgeToNextStep}</p>
            </div>
          )}
        </div>
      );
    }

    // Legacy SDR + AE format
    return (
      <div className="space-y-5">
        {data.opener && (
          <div>
            <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
              {isAEFormat ? "Opening / Agenda Setting" : "Opener"}
            </p>
            <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">{data.opener}</p>
          </div>
        )}
        {data.discoveryQuestions?.length ? (
          <div>
            <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Discovery Questions</p>
            <ol className="list-decimal list-inside space-y-1.5">
              {data.discoveryQuestions.map((q, i) => (
                <li key={i} className="text-[15px] text-stone-700 dark:text-[var(--text-primary)]">{q}</li>
              ))}
            </ol>
          </div>
        ) : null}
        {(data.valueProp ?? data.pivotToDemo) ? (
          <div>
            <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
              {isAEFormat ? "Pivot to Demo" : "Value Prop"}
            </p>
            <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">
              {data.pivotToDemo ?? data.valueProp}
            </p>
          </div>
        ) : null}
        {data.objectionResponses?.length ? (
          <div>
            <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Objection Responses</p>
            <div className="space-y-3">
              {data.objectionResponses.map((o, i) => (
                <div key={i} className="bg-[var(--blue-bg)] dark:bg-white/5 rounded-xl p-3">
                  <p className="text-xs font-medium text-[var(--text-primary)] mb-1">&ldquo;{o.objection}&rdquo;</p>
                  <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)]">{o.response}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {(data.close ?? data.nextStepsClose) ? (
          <div>
            <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
              {isAEFormat ? "Next Steps Close" : "Close"}
            </p>
            <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">
              {data.nextStepsClose ?? data.close}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  // ─ objection_response ─
  if (answerType === "objection_response") {
    const data = parsed as { responses?: Array<{ objection: string; response: string }> };
    return (
      <div className="space-y-3">
        {(data.responses ?? []).map((o, i) => (
          <div key={i} className="bg-[var(--blue-bg)] dark:bg-white/5 rounded-xl p-3">
            <p className="text-xs font-medium text-[var(--text-primary)] mb-1">&ldquo;{o.objection}&rdquo;</p>
            <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)]">{o.response}</p>
          </div>
        ))}
      </div>
    );
  }

  // ─ questions_to_ask ─
  if (answerType === "questions_to_ask") {
    const data = parsed as {
      coachingNote?: string;
      questions?: Array<{
        questionType?: string;
        primary?: string;
        followUp?: string | null;
        why?: string;
        context?: string;
        question?: string;
        followUpChain?: string;
      }>;
    };
    const TYPE_LABELS: Record<string, string> = {
      role_mechanics: "Role mechanics",
      performance: "Performance",
      growth_path: "Growth path",
      close: "Close",
    };
    return (
      <div className="space-y-4">
        {data.coachingNote && (
          <div className="bg-[var(--coral-bg)] border-l-[3px] border-coral dark:border-[var(--coral)] px-2.5 py-1.5 rounded-r-lg">
            <p className="text-xs text-coral-dark dark:text-[var(--coral-text)] leading-snug flex gap-2">
              <span className="shrink-0">💡</span>
              <span>{data.coachingNote}</span>
            </p>
          </div>
        )}
        {(data.questions ?? []).map((q, i) => {
          const primaryText = q.primary ?? q.question ?? "";
          const followUpText = q.followUp ?? q.followUpChain;
          const typeLabel = q.questionType ? TYPE_LABELS[q.questionType] : undefined;
          const isClose = q.questionType === "close";
          return (
            <div key={i} className={isClose ? "bg-[var(--blue-bg)] rounded-xl px-3 py-2.5 -mx-1" : undefined}>
              {typeLabel && (
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{typeLabel}</p>
              )}
              <p className="text-[15px] font-medium text-[var(--text-primary)]">{i + 1}. {primaryText}</p>
              {followUpText && (
                <p className="text-xs text-[var(--text-tertiary)] mt-1 pl-3 border-l-2 border-stone-200 dark:border-white/10">
                  <span className="font-medium text-[var(--text-secondary)]">If they give a short answer:</span> {followUpText}
                </p>
              )}
              {q.why && <p className="text-xs text-[var(--text-tertiary)] mt-0.5 italic">{q.why}</p>}
            </div>
          );
        })}
      </div>
    );
  }

  // ─ cheat_sheet ─
  if (answerType === "cheat_sheet") {
    const data = parsed as {
      testing?: string[];
      oneThingThatMatters?: string;
      timing?: string;
      commonMistakes?: string[];
      closer?: string;
      quickTalkTrack?: {
        thirtySecondTmay?: string;
        grandmotherCompanyDescription?: string;
        preparedMetric?: string;
        closingLine?: string;
      };
      keyPoints?: string[];
      companyFacts?: string[];
      strongestStory?: string;
      criticalTip?: string;
    };
    const isNewFormat = Array.isArray(data.testing);
    const detectionCoaching = stage ? STAGE_DETECTION_COACHING[stage] : undefined;

    if (isNewFormat) {
      return (
        <div className="bg-gradient-to-br from-[#1e40af] to-[#2563eb] dark:from-[#1a2744] dark:to-[#1e3a5f] rounded-xl p-5 space-y-4">
          {detectionCoaching && (
            <div className="bg-white/10 border border-white/20 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">What They&apos;re Actually Testing For</span>
                <span className="ml-auto text-[10px] font-bold bg-white/15 text-white px-2 py-0.5 rounded-full tracking-wide">
                  {detectionCoaching.technique}
                </span>
              </div>
              <p className="text-xs text-white/80 leading-relaxed">{detectionCoaching.testing}</p>
              <div className="border-l-2 border-yellow-300/60 pl-2.5">
                <p className="text-xs text-yellow-100 leading-relaxed">{detectionCoaching.coach}</p>
              </div>
            </div>
          )}
          {data.testing?.length ? (
            <div>
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-2">Personalized for You</p>
              <ul className="space-y-1.5">
                {data.testing.map((t, i) => (
                  <li key={i} className="text-sm text-white flex items-start gap-2">
                    <span className="text-blue-300 flex-shrink-0 mt-0.5">•</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.oneThingThatMatters && (
            <div className="border border-yellow-300/40 bg-yellow-400/15 rounded-lg px-3 py-2.5">
              <p className="text-xs font-semibold text-yellow-300 mb-1">The One Thing That Matters</p>
              <p className="text-sm font-semibold text-yellow-50">{data.oneThingThatMatters}</p>
            </div>
          )}
          {data.timing && (
            <div className="flex items-start gap-2">
              <span className="text-blue-300 text-sm flex-shrink-0">⏱</span>
              <p className="text-sm text-blue-100">{data.timing}</p>
            </div>
          )}
          {data.commonMistakes?.length ? (
            <div>
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-2">Common Mistakes</p>
              <ul className="space-y-1.5">
                {data.commonMistakes.map((m, i) => (
                  <li key={i} className="text-sm text-white/90 flex items-start gap-2">
                    <span className="text-red-300 flex-shrink-0 mt-0.5">✕</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.closer && (
            <div className="border-t border-blue-400/30 pt-3">
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-1.5">Your Closer</p>
              <p className="text-sm text-white italic">&ldquo;{data.closer.replace(/^["']|["']$/g, "")}&rdquo;</p>
            </div>
          )}
          {data.quickTalkTrack && (
            <div className="border-t border-blue-400/30 pt-3 space-y-2.5">
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide">Quick Talk Track</p>
              {data.quickTalkTrack.thirtySecondTmay && (
                <div className="bg-white/10 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-bold text-blue-300 uppercase tracking-wide mb-0.5">30-Second TMAY</p>
                  <p className="text-sm text-white leading-relaxed">{data.quickTalkTrack.thirtySecondTmay}</p>
                </div>
              )}
              {data.quickTalkTrack.grandmotherCompanyDescription && (
                <div className="bg-white/10 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-bold text-blue-300 uppercase tracking-wide mb-0.5">Company in Plain English</p>
                  <p className="text-sm text-white leading-relaxed">{data.quickTalkTrack.grandmotherCompanyDescription}</p>
                </div>
              )}
              {data.quickTalkTrack.preparedMetric && (
                <div className="bg-white/10 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-bold text-blue-300 uppercase tracking-wide mb-0.5">Your Best Number</p>
                  <p className="text-sm text-white font-semibold">{data.quickTalkTrack.preparedMetric}</p>
                </div>
              )}
              {data.quickTalkTrack.closingLine && (
                <div className="bg-white/10 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-bold text-blue-300 uppercase tracking-wide mb-0.5">Closing Line</p>
                  <p className="text-sm text-white italic">&ldquo;{data.quickTalkTrack.closingLine.replace(/^["']|["']$/g, "")}&rdquo;</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Old format fallback
    return (
      <div className="bg-gradient-to-br from-[#1e40af] to-[#2563eb] dark:from-[#1a2744] dark:to-[#1e3a5f] rounded-xl p-5 space-y-4">
        {detectionCoaching && (
          <div className="bg-white/10 border border-white/20 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">What They&apos;re Actually Testing For</span>
              <span className="ml-auto text-[10px] font-bold bg-white/15 text-white px-2 py-0.5 rounded-full tracking-wide">
                {detectionCoaching.technique}
              </span>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">{detectionCoaching.testing}</p>
            <div className="border-l-2 border-yellow-300/60 pl-2.5">
              <p className="text-xs text-yellow-100 leading-relaxed">{detectionCoaching.coach}</p>
            </div>
          </div>
        )}
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
  if (answerType === "company_brief") {
    const data = parsed as {
      sayThis?: string;
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
        {data.sayThis && (
          <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-xl p-4">
            <p className="text-[10px] font-bold text-[var(--success)] uppercase tracking-wider mb-2 flex items-center gap-1">
              <span>🗣️</span> Say This
            </p>
            <p className="text-[15px] text-stone-800 dark:text-[var(--text-primary)] leading-relaxed">{data.sayThis}</p>
          </div>
        )}
        {(data.oneLiner || data.productExplainer || data.icpSummary || data.salesMotionSummary || data.competitiveLandscape || data.talkingPoints?.length || data.likelyCompanyQuestions?.length) && (
          <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider pt-1">Deep Research</p>
        )}
        {data.oneLiner && (
          <p className="text-[15px] font-semibold text-[var(--text-primary)] border-l-[3px] border-brand-blue dark:border-brand-blue-light pl-3">
            {data.oneLiner}
          </p>
        )}
        {data.productExplainer && (
          <div>
            <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Product</p>
            <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)]">{data.productExplainer}</p>
          </div>
        )}
        {data.icpSummary && (
          <div>
            <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Who They Sell To</p>
            <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)]">{data.icpSummary}</p>
          </div>
        )}
        {data.salesMotionSummary && (
          <div>
            <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">How They Sell</p>
            <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)]">{data.salesMotionSummary}</p>
          </div>
        )}
        {data.competitiveLandscape && (
          <div>
            <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Competitive Landscape</p>
            <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)]">{data.competitiveLandscape}</p>
          </div>
        )}
        {data.talkingPoints?.length ? (
          <div>
            <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Drop These In Conversation</p>
            <ul className="space-y-1.5">
              {data.talkingPoints.map((tp, i) => (
                <li key={i} className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] flex items-start gap-2">
                  <span className="text-brand-blue dark:text-brand-blue-light flex-shrink-0">•</span>
                  {tp}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {data.likelyCompanyQuestions?.length ? (
          <div>
            <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Be Ready For</p>
            <ul className="space-y-1">
              {data.likelyCompanyQuestions.map((q, i) => (
                <li key={i} className="text-[15px] text-stone-700 dark:text-[var(--text-primary)]">
                  <span className="text-brand-blue dark:text-brand-blue-light">{i + 1}.</span> {q}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  // ─ career_switcher_bridge ─
  if (answerType === "career_switcher_bridge") {
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
          <div key={i} className="border border-stone-200 dark:border-white/10 rounded-xl p-4">
            <p className="text-xs font-semibold text-[var(--text-tertiary)] mb-1">{b.previousExperience}</p>
            <Badge variant="outline" className="text-xs mb-3">{b.transferableSkill}</Badge>
            <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] mb-2 italic">&ldquo;{b.bridgePhrasing}&rdquo;</p>
            <p className="text-xs text-[var(--text-tertiary)]">Apply when: {b.salesApplication}</p>
          </div>
        ))}
      </div>
    );
  }

  // ─ competitor_battle_card ─
  if (answerType === "competitor_battle_card") {
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
          <div key={i} className="border border-stone-200 dark:border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-[var(--bg-card-elevated)] dark:bg-white/5 border-b border-stone-200 dark:border-white/10 flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--text-primary)]">⚔️ {c.name}</span>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div>
                <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Their Strengths</p>
                <ul className="space-y-1">
                  {c.strengths.map((s, j) => (
                    <li key={j} className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] flex items-start gap-2">
                      <span className="text-[var(--text-tertiary)] flex-shrink-0">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--success)] uppercase tracking-wider mb-1.5">Where We Win</p>
                <ul className="space-y-1">
                  {c.where_we_win.map((s, j) => (
                    <li key={j} className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] flex items-start gap-2">
                      <span className="text-[var(--success)] flex-shrink-0">✓</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--warning)] uppercase tracking-wider mb-1.5">Why Customers Switch</p>
                <ul className="space-y-1">
                  {c.switching_triggers.map((s, j) => (
                    <li key={j} className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] flex items-start gap-2">
                      <span className="text-[var(--warning)] flex-shrink-0">→</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[var(--blue-bg)] border-l-[3px] border-brand-blue dark:border-brand-blue-light rounded-r-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-brand-blue-dark dark:text-brand-blue-light mb-1">Discovery Question</p>
                <p className="text-[15px] text-stone-800 dark:text-[var(--text-primary)] italic">&ldquo;{c.discovery_question}&rdquo;</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─ coachability_game_plan ─
  if (answerType === "coachability_game_plan") {
    const data = parsed as {
      beforeRoleplay?: string;
      selfAssessment?: string;
      receivingFeedback?: string;
      theRedo?: string;
      metaSignal?: string;
    };
    const sections: Array<{ key: keyof typeof data; emoji: string; label: string; borderColor: string; bgColor: string }> = [
      { key: "beforeRoleplay", emoji: "🧠", label: "Before the Roleplay", borderColor: "border-brand-blue", bgColor: "bg-[var(--blue-bg)]" },
      { key: "selfAssessment", emoji: "🔎", label: "The Self-Assessment (Test #1)", borderColor: "border-[var(--warning)]", bgColor: "bg-[var(--warning-bg)]" },
      { key: "receivingFeedback", emoji: "👂", label: "Receiving Feedback", borderColor: "border-brand-blue-dark dark:border-brand-blue-light", bgColor: "bg-[var(--blue-bg)]" },
      { key: "theRedo", emoji: "🔁", label: "The Redo (Where the Job is Won)", borderColor: "border-[var(--success)]", bgColor: "bg-[var(--success-bg)]" },
      { key: "metaSignal", emoji: "⚡", label: "The Meta-Signal", borderColor: "border-[var(--error)]", bgColor: "bg-[var(--error-bg)]" },
    ];
    return (
      <div className="space-y-4">
        {sections.map(({ key, emoji, label, borderColor, bgColor }) => {
          const text = data[key];
          if (!text) return null;
          return (
            <div key={key} className={`border-l-[3px] rounded-r-xl px-4 py-3 ${borderColor} ${bgColor}`}>
              <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide mb-1.5">
                {emoji} {label}
              </p>
              <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{text}</p>
            </div>
          );
        })}
      </div>
    );
  }

  // ─ comp_expectations ─
  if (answerType === "comp_expectations") {
    const data = parsed as {
      script?: string;
      range?: string;
      research?: string;
      notes?: string;
      reasoning?: string;
    };
    if (data.script) {
      return (
        <div className="space-y-4">
          <div className="bg-[var(--bg-card-elevated)] dark:bg-white/5 border-l-[3px] border-brand-blue dark:border-brand-blue-light rounded-r-xl px-4 py-3">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Your Script</p>
            <p className="text-[15px] text-[var(--text-primary)] leading-relaxed italic">{data.script}</p>
          </div>
          {data.range && (
            <div>
              <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Comp Range</p>
              <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] font-medium">{data.range}</p>
            </div>
          )}
          {data.research && (
            <div>
              <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Research</p>
              <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">{data.research}</p>
            </div>
          )}
          {(data.reasoning || data.notes) && (
            <div>
              <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Notes</p>
              <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">{data.reasoning || data.notes}</p>
            </div>
          )}
        </div>
      );
    }
  }

  // ─ cold_email ─
  if (answerType === "cold_email") {
    const data = parsed as {
      subject?: string;
      body?: string;
      notes?: string;
      followUp?: string;
    };
    if (data.subject || data.body) {
      return (
        <div className="space-y-4">
          {data.subject && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Subject:</span>
              <span className="text-[15px] font-semibold text-[var(--text-primary)]">{data.subject}</span>
            </div>
          )}
          {data.body && (
            <div className="bg-[var(--bg-card)] dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl p-4">
              <FormattedTextContent content={data.body} />
            </div>
          )}
          {data.followUp && (
            <div className="bg-[var(--coral-bg)] border-l-[3px] border-coral dark:border-[var(--coral)] px-3 py-2 rounded-r-lg">
              <p className="text-xs font-semibold text-coral-dark dark:text-[var(--coral-text)] mb-1">Follow-up</p>
              <p className="text-[15px] text-stone-800 dark:text-[var(--text-primary)] leading-relaxed">{data.followUp}</p>
            </div>
          )}
          {data.notes && (
            <div>
              <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Notes</p>
              <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">{data.notes}</p>
            </div>
          )}
        </div>
      );
    }
  }

  // ─ pain_point_analysis ─
  if (answerType === "pain_point_analysis") {
    const data = parsed as {
      painPoints?: Array<{ pain: string; evidence: string; question: string }>;
      summary?: string;
    };
    if (data.painPoints?.length) {
      return (
        <div className="space-y-4">
          {data.summary && <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">{data.summary}</p>}
          {data.painPoints.map((pp, i) => (
            <div key={i} className="border border-stone-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-[var(--error-bg)] border-b border-[var(--error)]/10">
                <p className="text-sm font-semibold text-[var(--error)]">🔍 {pp.pain}</p>
              </div>
              <div className="px-4 py-3 space-y-2">
                <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">{pp.evidence}</p>
                <div className="bg-[var(--blue-bg)] border-l-[3px] border-brand-blue dark:border-brand-blue-light rounded-r-lg px-3 py-2">
                  <p className="text-xs font-semibold text-brand-blue-dark dark:text-brand-blue-light mb-1">Discovery Question</p>
                  <p className="text-[15px] text-stone-800 dark:text-[var(--text-primary)] italic">&ldquo;{pp.question}&rdquo;</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
  }

  // ─ assignment_guide ─
  if (answerType === "assignment_guide") {
    const data = parsed as {
      overview?: string;
      checklist?: string[];
      structure?: Array<{ section: string; tips: string }>;
      tips?: string[];
    };
    if (data.checklist?.length || data.structure?.length) {
      return (
        <div className="space-y-4">
          {data.overview && <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">{data.overview}</p>}
          {data.structure?.length ? (
            <div className="space-y-3">
              {data.structure.map((s, i) => (
                <div key={i}>
                  <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{s.section}</p>
                  <p className="text-[15px] text-stone-700 dark:text-[var(--text-primary)] leading-relaxed">{s.tips}</p>
                </div>
              ))}
            </div>
          ) : null}
          {data.checklist?.length ? (
            <div>
              <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Checklist</p>
              <ul className="space-y-1.5">
                {data.checklist.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[15px] text-stone-700 dark:text-[var(--text-primary)]">
                    <span className="text-[var(--success)] flex-shrink-0 mt-0.5">☐</span>
                    <span className="leading-relaxed">{renderInlineFormatting(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.tips?.length ? (
            <div>
              <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Tips</p>
              <ul className="space-y-1.5">
                {data.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-[15px] text-stone-700 dark:text-[var(--text-primary)]">
                    <span className="text-[var(--warning)] flex-shrink-0 mt-0.5">💡</span>
                    <span className="leading-relaxed">{renderInlineFormatting(tip)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      );
    }
  }

  // Unknown JSON — generic structured layout
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    return <GenericStructuredContent data={parsed as Record<string, unknown>} />;
  }

  return <FormattedTextContent content={content} />;
}

// ─── Spoken answer types (for isSpoken flag on FormattedTextContent) ─────────
const SPOKEN_ANSWER_TYPES = new Set([
  "tell_me_about_yourself",
  "resume_walkthrough",
  "why_sales",
  "why_this_company",
  "career_switcher_bridge",
  "coachability_coaching",
  "comp_expectations",
  "constructive_feedback",
  "cold_email",
  "pain_point_analysis",
  "assignment_guide",
]);
