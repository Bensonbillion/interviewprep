"use client";

import { useState, useEffect, useRef } from "react";
import type { AnswerSlot } from "@/types";
import type { DisappointmentLevel } from "@/types/feedback";

interface ConfidenceCheckProps {
  sessionId: string;
  slots: AnswerSlot[];
  isFirstSession: boolean;
  onDismiss: () => void;
}

const DISAPPOINTMENT_OPTIONS: { value: DisappointmentLevel; label: string }[] = [
  { value: "very_disappointed", label: "Very disappointed" },
  { value: "somewhat_disappointed", label: "Somewhat disappointed" },
  { value: "not_disappointed", label: "Not disappointed" },
];

export function ConfidenceCheck({ sessionId, slots, isFirstSession, onDismiss }: ConfidenceCheckProps) {
  const [confidence, setConfidence] = useState<number | null>(null);
  const [mostHelpful, setMostHelpful] = useState("");
  const [whatElse, setWhatElse] = useState("");
  const [disappointment, setDisappointment] = useState<DisappointmentLevel | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const unlockedSlots = slots.filter((s) => s.status === "unlocked" && s.content);

  const submitFeedback = () => {
    fetch("/api/feedback/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        confidenceAfter: confidence,
        mostHelpfulCard: mostHelpful || undefined,
        whatElseWouldHelp: whatElse.trim() || undefined,
        disappointmentWithout: disappointment ?? undefined,
      }),
    }).catch(() => {});
  };

  const handleSubmitPartial = () => {
    if (confidence) {
      submitFeedback();
    }
    onDismiss();
  };

  // Slide-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Dismiss on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        handleSubmitPartial();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  });

  const handleSubmit = () => {
    if (!confidence) return;
    submitFeedback();
    setSubmitted(true);
    setTimeout(onDismiss, 3000);
  };

  if (submitted) {
    return (
      <div
        ref={cardRef}
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center p-4 md:p-6"
      >
        <div className="w-full max-w-md bg-[var(--bg-card)] border border-stone-200/50 dark:border-white/10 rounded-2xl shadow-lg p-6 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            You got this. Remember: they already liked your resume enough to call you. Now just be yourself.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center p-4 md:p-6"
      style={{
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 300ms ease-out",
      }}
    >
      <div
        ref={cardRef}
        className="w-full max-w-md bg-[var(--bg-card)] border border-stone-200/50 dark:border-white/10 rounded-2xl shadow-lg p-5 space-y-4 max-h-[40vh] overflow-y-auto"
      >
        {/* Confidence scale */}
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-2.5">How confident are you feeling?</p>
          <div className="flex items-center gap-1">
            <span className="text-sm mr-1 flex-shrink-0">&#x1F630;</span>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setConfidence(n)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                  confidence === n
                    ? "bg-coral text-white scale-110"
                    : "bg-stone-100 dark:bg-white/5 text-[var(--text-tertiary)] hover:bg-[var(--coral-bg)] hover:text-coral-dark"
                }`}
              >
                {n}
              </button>
            ))}
            <span className="text-sm ml-1 flex-shrink-0">&#x1F525;</span>
          </div>
        </div>

        {/* Most helpful answer */}
        {unlockedSlots.length > 0 && (
          <div>
            <label className="text-xs text-[var(--text-tertiary)] mb-1 block">
              Which answer helped most? <span className="opacity-60">(optional)</span>
            </label>
            <select
              value={mostHelpful}
              onChange={(e) => setMostHelpful(e.target.value)}
              className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-[#FAFCFF] text-[var(--text-primary)]"
            >
              <option value="">Select an answer...</option>
              {unlockedSlots.map((s) => (
                <option key={s.type} value={s.type}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* What else would help */}
        <div>
          <label className="text-xs text-[var(--text-tertiary)] mb-1 block">
            Anything else that would help? <span className="opacity-60">(optional)</span>
          </label>
          <input
            type="text"
            value={whatElse}
            onChange={(e) => setWhatElse(e.target.value)}
            placeholder="e.g. More roleplay scenarios, salary negotiation tips..."
            className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-[#FAFCFF] placeholder:text-[var(--text-tertiary)]"
          />
        </div>

        {/* Sean Ellis question — first session only */}
        {isFirstSession && (
          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-1.5">
              One more quick one — if SalesPrep AI disappeared tomorrow, how would you feel?
            </p>
            <div className="flex gap-1.5">
              {DISAPPOINTMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDisappointment(opt.value)}
                  className={`flex-1 text-xs px-2 py-1.5 rounded-lg border transition-colors ${
                    disappointment === opt.value
                      ? "border-coral bg-[var(--coral-bg)] text-coral-dark"
                      : "border-stone-200/50 dark:border-white/10 text-[var(--text-tertiary)] hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!confidence}
          className="w-full py-2.5 bg-coral hover:bg-coral-dark text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save &amp; Good Luck
        </button>
      </div>
    </div>
  );
}
