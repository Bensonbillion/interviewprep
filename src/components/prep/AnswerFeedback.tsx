"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface AnswerFeedbackProps {
  sessionId: string;
  answerId?: string;
  answerType: string;
  onFeedbackGiven?: () => void;
}

type FeedbackState = "initial" | "thumbs_down" | "write_alternative" | "submitted";

const ISSUE_CHIPS = [
  { key: "too_generic", label: "Too generic" },
  { key: "too_long", label: "Too long" },
  { key: "too_short", label: "Too short" },
  { key: "sounds_unnatural", label: "Doesn't sound like me" },
  { key: "missing_detail", label: "Missing detail" },
] as const;

export function AnswerFeedback({ sessionId, answerId, answerType, onFeedbackGiven }: AnswerFeedbackProps) {
  const [state, setState] = useState<FeedbackState>("initial");
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set());
  const [whatWouldImprove, setWhatWouldImprove] = useState("");
  const [howWouldYouSayIt, setHowWouldYouSayIt] = useState("");
  const [fadeOut, setFadeOut] = useState(false);

  const submit = (payload: Record<string, unknown>) => {
    fetch("/api/feedback/explicit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        answerId: answerId ?? null,
        answerType,
        ...payload,
      }),
    }).catch(() => {});
    setState("submitted");
    onFeedbackGiven?.();
    setTimeout(() => setFadeOut(true), 2000);
  };

  const handleThumbsUp = () => {
    submit({ rating: 4, soundsNatural: true });
  };

  const handleThumbsDown = () => {
    setState("thumbs_down");
  };

  const handleWriteAlternative = () => {
    setState("write_alternative");
  };

  const handleSubmitIssues = () => {
    submit({
      rating: 2,
      tooGeneric: selectedChips.has("too_generic"),
      tooLong: selectedChips.has("too_long"),
      tooShort: selectedChips.has("too_short"),
      soundsNatural: !selectedChips.has("sounds_unnatural"),
      missingDetail: selectedChips.has("missing_detail"),
      whatWouldImprove: whatWouldImprove.trim() || undefined,
    });
  };

  const handleSubmitAlternative = () => {
    const trimmed = howWouldYouSayIt.trim();
    if (!trimmed) return;
    submit({
      rating: 3,
      howWouldYouSayIt: trimmed,
    });
  };

  const toggleChip = (key: string) => {
    setSelectedChips((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (state === "submitted") {
    return (
      <div
        className={`px-5 py-2 transition-all duration-500 ${fadeOut ? "opacity-0 max-h-0 py-0 overflow-hidden" : "opacity-100 max-h-10"}`}
      >
        <p className="text-xs text-ink-muted">Thanks — this helps SalesPrep get better</p>
      </div>
    );
  }

  if (state === "thumbs_down") {
    return (
      <div className="px-5 pb-3 space-y-2 animate-in slide-in-from-top-1 duration-200">
        <p className="text-xs text-ink-muted">What could be better?</p>
        <div className="flex flex-wrap gap-1.5">
          {ISSUE_CHIPS.map((chip) => (
            <button
              key={chip.key}
              onClick={() => toggleChip(chip.key)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                selectedChips.has(chip.key)
                  ? "border-red-300 bg-red-50 text-red-600"
                  : "border-gray-200 text-ink-muted hover:border-red-300 hover:text-red-500"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <textarea
          value={whatWouldImprove}
          onChange={(e) => setWhatWouldImprove(e.target.value)}
          placeholder="What would you change? (optional)"
          rows={2}
          className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-[#FAFCFF] placeholder:text-ink-muted resize-none"
        />
        <button
          onClick={handleSubmitIssues}
          disabled={selectedChips.size === 0 && !whatWouldImprove.trim()}
          className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary-50 text-primary-600 border border-primary-200 hover:bg-primary-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>
    );
  }

  if (state === "write_alternative") {
    return (
      <div className="px-5 pb-3 space-y-2 animate-in slide-in-from-top-1 duration-200">
        <p className="text-xs text-ink-muted">How would YOU actually answer this question?</p>
        <textarea
          value={howWouldYouSayIt}
          onChange={(e) => setHowWouldYouSayIt(e.target.value)}
          placeholder="Type how you'd naturally say this on a call..."
          rows={3}
          className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-[#FAFCFF] placeholder:text-ink-muted resize-none"
          autoFocus
        />
        <button
          onClick={handleSubmitAlternative}
          disabled={!howWouldYouSayIt.trim()}
          className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary-50 text-primary-600 border border-primary-200 hover:bg-primary-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>
    );
  }

  // STATE 1 — Initial (minimal, always visible)
  return (
    <div className="px-5 py-2 flex items-center gap-3">
      <span className="text-xs text-ink-muted">How&apos;s this answer?</span>
      <div className="flex items-center gap-1">
        <button
          onClick={handleThumbsUp}
          className="p-1 rounded-md text-ink-muted/60 hover:text-green-600 hover:bg-green-50 transition-colors"
          title="Good answer"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleThumbsDown}
          className="p-1 rounded-md text-ink-muted/60 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Needs work"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>
      <button
        onClick={handleWriteAlternative}
        className="text-xs text-primary-500 hover:text-primary-600 font-medium underline underline-offset-2 decoration-primary-300 transition-colors"
      >
        I&apos;d say it differently
      </button>
    </div>
  );
}
