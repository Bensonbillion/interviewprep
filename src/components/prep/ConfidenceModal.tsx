"use client";

import { useState } from "react";
import { X } from "lucide-react";

const SCORE_LABELS: Record<number, { label: string; emoji: string }> = {
  1: { label: "Not ready", emoji: "😰" },
  2: { label: "Nervous", emoji: "😬" },
  3: { label: "Getting there", emoji: "🙂" },
  4: { label: "Solid", emoji: "😎" },
  5: { label: "Ready", emoji: "🔥" },
};

interface ConfidenceModalProps {
  sessionId: string;
  stage: string;
  companyName?: string;
  onClose: () => void;
}

export function ConfidenceModal({ sessionId, stage, companyName, onClose }: ConfidenceModalProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [blockerText, setBlockerText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    fetch("/api/feedback/confidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        stage,
        companyName,
        score: selected,
        blockerText: blockerText.trim() || undefined,
      }),
    }).catch(() => {});
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-gray-100 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-base font-bold text-ink mb-1">How confident do you feel about this round?</h2>
        <p className="text-xs text-ink-muted mb-5">
          {companyName ? `${companyName} · ` : ""}{stage}
        </p>

        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((score) => {
            const { label, emoji } = SCORE_LABELS[score];
            const isSelected = selected === score;
            return (
              <button
                key={score}
                onClick={() => setSelected(score)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all text-center ${
                  isSelected
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <span className="text-lg leading-none">{emoji}</span>
                <span className={`text-[10px] font-medium leading-tight ${isSelected ? "text-primary-600" : "text-ink-muted"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {selected !== null && selected <= 3 && (
          <div className="mb-4">
            <label className="text-xs text-ink-muted mb-1.5 block">
              What&apos;s your main concern? <span className="text-ink-muted">(optional)</span>
            </label>
            <textarea
              value={blockerText}
              onChange={(e) => setBlockerText(e.target.value)}
              placeholder="e.g. Not sure how to answer comp questions confidently…"
              rows={2}
              className="w-full text-sm border border-[#DBEAFE] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-[#FAFCFF] placeholder:text-ink-muted resize-none"
            />
          </div>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={handleSave}
            disabled={!selected || saving}
            className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-ink-muted hover:text-ink hover:bg-gray-50 text-sm rounded-xl transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
