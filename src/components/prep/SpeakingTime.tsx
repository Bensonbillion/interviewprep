"use client";

import type { AnswerType } from "@/types";

// ─── Word count targets by answer type ─────────────────────────────────────

interface WordTarget {
  min: number;
  max: number;
}

const WORD_TARGETS: Partial<Record<AnswerType, WordTarget>> = {
  tell_me_about_yourself: { min: 120, max: 200 },
  why_sales: { min: 80, max: 150 },
  why_this_company: { min: 80, max: 150 },
  behavioral_star: { min: 150, max: 250 },
  comp_expectations: { min: 40, max: 80 },
  role_play_script: { min: 100, max: 200 },
  resume_walkthrough: { min: 200, max: 350 },
  constructive_feedback: { min: 120, max: 200 },
  coachability_coaching: { min: 100, max: 180 },
  career_switcher_bridge: { min: 100, max: 180 },
};

interface SpeakingTimeProps {
  text: string;
  answerType: AnswerType;
}

/**
 * Displays word count, speaking time estimate, and length status.
 * Speaking rate: 150 wpm * 1.18 pause factor.
 */
export function SpeakingTime({ text, answerType }: SpeakingTimeProps) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words < 10) return null;

  // 150 wpm baseline + 18% for natural pauses
  const rawSeconds = Math.round((words / 150) * 60 * 1.18);
  const minutes = Math.floor(rawSeconds / 60);
  const seconds = rawSeconds % 60;
  const timeDisplay =
    minutes > 0
      ? `${minutes}:${seconds.toString().padStart(2, "0")}`
      : `~${seconds}s`;

  const target = WORD_TARGETS[answerType];
  let color: string;
  let label: string;

  if (!target) {
    color = "#639922"; // green default
    label = "Good length";
  } else if (words >= target.min && words <= target.max) {
    color = "#639922"; // green
    label = "Good length";
  } else if (words < target.min) {
    color = "#BA7517"; // amber
    label = "Could be longer";
  } else if (words <= Math.round(target.max * 1.3)) {
    color = "#BA7517"; // amber
    label = "Consider trimming";
  } else {
    color = "#A32D2D"; // red
    label = "Too long";
  }

  return (
    <div className="flex items-center flex-wrap gap-x-1 text-[12px] font-medium mt-3" style={{ color }}>
      <span>{words} words</span>
      <span className="text-[var(--text-tertiary)]">·</span>
      <span>~{timeDisplay} spoken</span>
      <span className="text-[var(--text-tertiary)]">·</span>
      <span>{label}</span>
    </div>
  );
}
