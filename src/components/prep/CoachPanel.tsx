"use client";

import { useState } from "react";
import { Star, Play, Square } from "lucide-react";
import type { AnswerType } from "@/types";
import { getCoaching } from "@/lib/coaching-content";

interface CoachPanelProps {
  answerType: AnswerType;
  answerLabel: string;
  stage: string;
  isDiscovery: boolean;
  onLiveMode?: () => void;
  onTeleprompter?: () => void;
}

export function CoachPanel({ answerType, answerLabel, stage, isDiscovery, onLiveMode, onTeleprompter }: CoachPanelProps) {
  const coaching = getCoaching(answerType);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerInterval, setTimerIntervalState] = useState<ReturnType<typeof setInterval> | null>(null);

  const toggleTimer = () => {
    if (timerRunning && timerInterval) {
      clearInterval(timerInterval);
      setTimerIntervalState(null);
      setTimerRunning(false);
    } else {
      setTimerSeconds(0);
      const iv = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
      setTimerIntervalState(iv);
      setTimerRunning(true);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Checklist state — which items are "checked"
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const toggleCheck = (idx: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-warm-400 mb-1">Coach</p>
        <p className="text-[13px] text-warm-500">{answerLabel}</p>
      </div>

      {/* What's strong */}
      <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4">
        <p className="text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2 font-semibold">
          What&apos;s strong
        </p>
        <ul className="space-y-1.5">
          {coaching.strong.map((item, i) => (
            <li key={i} className="text-[13px] text-warm-700 dark:text-warm-300 flex items-start gap-2">
              <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Opportunity to improve */}
      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4">
        <p className="text-[11px] uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2 font-semibold">
          Improve
        </p>
        <ul className="space-y-1.5">
          {coaching.improve.map((item, i) => (
            <li key={i} className="text-[13px] text-warm-700 dark:text-warm-300 flex items-start gap-2">
              <span className="text-amber-500 shrink-0 mt-0.5">→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Listening for checklist */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-warm-400 mb-2 font-semibold">
          {coaching.stage}
        </p>
        <ul className="space-y-2">
          {coaching.listeningFor.map((item, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggleCheck(i)}
                className="flex items-start gap-2 text-left w-full group"
              >
                <Star
                  className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                    checked.has(i)
                      ? "text-emerald-500 fill-emerald-500"
                      : "text-warm-300 dark:text-warm-600 group-hover:text-warm-400"
                  }`}
                />
                <span className={`text-[13px] transition-colors ${
                  checked.has(i)
                    ? "text-warm-700 dark:text-warm-300"
                    : "text-warm-500 dark:text-warm-400"
                }`}>
                  {item}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Speaking time */}
      {coaching.timeTarget && (
        <div className="border-t border-cream-200 dark:border-white/10 pt-4">
          <p className="text-[11px] uppercase tracking-widest text-warm-400 mb-2">
            Target: {coaching.timeTarget}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-[20px] font-mono tabular-nums text-warm-700 dark:text-warm-300">
              {formatTime(timerSeconds)}
            </span>
            <button
              type="button"
              onClick={toggleTimer}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                timerRunning
                  ? "bg-red-100 dark:bg-red-900/30 text-red-500"
                  : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
              }`}
            >
              {timerRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Mode buttons */}
      <div className="border-t border-cream-200 dark:border-white/10 pt-4 space-y-2">
        {stage === "role_play" && isDiscovery && onLiveMode && (
          <button type="button" onClick={onLiveMode} className="w-full text-sm text-left px-3 py-2 rounded-lg border border-warm-200 dark:border-white/10 text-warm-600 dark:text-warm-300 hover:bg-warm-50 dark:hover:bg-white/5 transition-colors">
            📱 Live Mode
          </button>
        )}
        {onTeleprompter && isDiscovery && (
          <button type="button" onClick={onTeleprompter} className="w-full text-sm text-left px-3 py-2 rounded-lg border border-warm-200 dark:border-white/10 text-warm-600 dark:text-warm-300 hover:bg-warm-50 dark:hover:bg-white/5 transition-colors">
            📜 Teleprompter
          </button>
        )}
      </div>
    </div>
  );
}
