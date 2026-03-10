"use client";

import { useState } from "react";

interface AnswerFeedbackProps {
  sessionId: string;
  answerId?: string;
  answerType: string;
  onFeedbackGiven?: () => void;
}

const QUICK_TAGS = [
  { key: "helpful", label: "👍 Helpful", rating: 4, positive: true },
  { key: "too_ai", label: "🤖 Too AI", rating: 2, positive: false },
  { key: "too_long", label: "📏 Too long", rating: 2, positive: false },
] as const;

export function AnswerFeedback({ sessionId, answerId, answerType, onFeedbackGiven }: AnswerFeedbackProps) {
  const [submitted, setSubmitted] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const handleTag = (tag: typeof QUICK_TAGS[number]) => {
    fetch("/api/feedback/explicit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        answerId: answerId ?? null,
        answerType,
        rating: tag.rating,
        quickTag: tag.key,
        tooRobotic: tag.key === "too_ai" ? true : undefined,
        tooLong: tag.key === "too_long" ? true : undefined,
      }),
    }).catch(() => {});

    setSubmitted(true);
    onFeedbackGiven?.();
    setTimeout(() => setFadeOut(true), 2000);
  };

  if (submitted) {
    return (
      <div
        className={`px-5 py-2 transition-all duration-500 ${fadeOut ? "opacity-0 max-h-0 py-0 overflow-hidden" : "opacity-100 max-h-10"}`}
      >
        <p className="text-xs text-stone-400">Thanks — this helps improve your answers</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-5 pt-3 pb-3 border-t border-stone-100 mt-1">
      <span className="text-xs text-stone-400">How&apos;s this?</span>
      {QUICK_TAGS.map((tag) => (
        <button
          key={tag.key}
          onClick={() => handleTag(tag)}
          className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors min-h-[36px] ${
            tag.positive
              ? "border-green-200 hover:bg-green-50 hover:border-green-300 text-stone-600"
              : "border-stone-200 hover:bg-stone-50 hover:border-stone-300 text-stone-500"
          }`}
        >
          {tag.label}
        </button>
      ))}
    </div>
  );
}
