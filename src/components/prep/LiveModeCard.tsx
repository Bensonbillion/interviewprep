"use client";

import { Check } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CardLayer = "technical" | "personal" | "business" | "trap" | "recap" | "hypothesis";

export interface LiveCard {
  id: string;
  layer: CardLayer;
  question: string;
  hint: string;
  followUp?: string;
  isCompleted: boolean;
  cardNumber: number;
  totalCards: number;
}

// ─── Layer styling ───────────────────────────────────────────────────────────

const LAYER_STYLES: Record<CardLayer, { border: string; pill: string; label: string }> = {
  hypothesis: { border: "border-[#FF6B4A]", pill: "bg-[#FF6B4A]/20 text-[#FF6B4A]", label: "YOUR OPENER" },
  technical:  { border: "border-[#FF6B4A]", pill: "bg-[#FF6B4A]/20 text-[#FF6B4A]", label: "TECHNICAL" },
  personal:   { border: "border-[#F59E0B]", pill: "bg-[#F59E0B]/20 text-[#F59E0B]", label: "PERSONAL" },
  business:   { border: "border-[#10B981]", pill: "bg-[#10B981]/20 text-[#10B981]", label: "BUSINESS" },
  trap:       { border: "border-[#8B5CF6]", pill: "bg-[#8B5CF6]/20 text-[#8B5CF6]", label: "TRAP" },
  recap:      { border: "border-[#D97706]", pill: "bg-[#D97706]/20 text-[#D97706]", label: "PAIN RECAP" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function LiveModeCard({ card }: { card: LiveCard }) {
  const style = LAYER_STYLES[card.layer];

  return (
    <div className={`relative bg-[#1E1F2B] rounded-2xl p-6 border-l-4 ${style.border} h-full flex flex-col`}>
      {/* Completed checkmark */}
      {card.isCompleted && (
        <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Top row: layer pill + counter */}
      <div className="flex items-center justify-between mb-5">
        <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${style.pill}`}>
          {style.label}
        </span>
        <span className="text-[12px] text-[#666] tabular-nums">
          {card.cardNumber} / {card.totalCards}
        </span>
      </div>

      {/* Question — primary content */}
      <p className="text-[22px] font-semibold text-[#E8E8E8] leading-[1.4] flex-1">
        {card.question}
      </p>

      {/* Hint */}
      {card.hint && (
        <p className="text-[14px] text-[#888] italic mt-3.5">
          {card.hint}
        </p>
      )}

      {/* Follow-up */}
      {card.followUp && (
        <div className="mt-2.5">
          <p className="text-[12px] text-[#555] uppercase tracking-wider mb-1">
            If surface-level →
          </p>
          <p className="text-[15px] text-[#AAA] leading-relaxed">
            {card.followUp}
          </p>
        </div>
      )}
    </div>
  );
}
