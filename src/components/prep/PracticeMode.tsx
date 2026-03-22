"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Play, Pause, RotateCcw, ChevronDown } from "lucide-react";
import { MarkdownContent } from "@/components/prep/MarkdownContent";

type Difficulty = "full" | "key_phrases" | "recall";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  full: "Full script",
  key_phrases: "Key phrases",
  recall: "Memory recall",
};

const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
  full: "Read the complete answer",
  key_phrases: "Only key phrases visible",
  recall: "Just the question — answer from memory",
};

interface PracticeModeProps {
  content: string;
  questionLabel: string;
  targetSeconds?: number; // e.g. 60 for a 60-second answer
  onClose: () => void;
}

/**
 * Practice Mode — teleprompter-grade formatting for spoken rehearsal.
 *
 * Dark background, 24–28px sans-serif text, max 45 chars/line, 1.8× line height.
 * Countdown timer color-coded green→yellow→red.
 * Progressive difficulty: full script → key phrases → memory recall.
 */
export function PracticeMode({
  content,
  questionLabel,
  targetSeconds = 90,
  onClose,
}: PracticeModeProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>("full");
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Timer
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setElapsed(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const toggleTimer = () => setIsRunning((r) => !r);

  // Timer color: green < 60%, yellow 60–90%, red > 90%
  const pct = elapsed / targetSeconds;
  const timerColor =
    pct < 0.6 ? "text-green-400" : pct < 0.9 ? "text-yellow-400" : "text-red-400";
  const timerBgColor =
    pct < 0.6 ? "bg-green-400" : pct < 0.9 ? "bg-yellow-400" : "bg-red-400";

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timerDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Extract key phrases (first 3–5 words of each paragraph/sentence)
  const keyPhrases = content
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter((b) => b && !b.startsWith("#") && b !== "---")
    .map((block) => {
      const words = block.split(/\s+/);
      return words.slice(0, Math.min(4, words.length)).join(" ") + "…";
    })
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* Difficulty selector */}
          <div className="relative">
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value as Difficulty);
                resetTimer();
              }}
              className="appearance-none bg-white/10 text-white text-sm font-medium rounded-lg px-3 py-1.5 pr-8 border border-white/20 focus:outline-none focus:ring-2 focus:ring-coral cursor-pointer"
            >
              {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
                <option key={d} value={d} className="bg-stone-900">
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60 pointer-events-none" />
          </div>
          <span className="text-xs text-white/40 hidden sm:inline">
            {DIFFICULTY_DESCRIPTIONS[difficulty]}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Exit practice mode"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Timer bar */}
      <div className="px-4 sm:px-6 py-3 flex items-center gap-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTimer}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={isRunning ? "Pause" : "Start"}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={resetTimer}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Reset timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className={`text-2xl font-mono tabular-nums ${timerColor}`}>
          {timerDisplay}
        </span>
        <span className="text-xs text-white/30">
          target: {Math.floor(targetSeconds / 60)}:{(targetSeconds % 60).toString().padStart(2, "0")}
        </span>
        {/* Progress bar */}
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${timerBgColor}`}
            style={{ width: `${Math.min(100, pct * 100)}%` }}
          />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 flex justify-center">
        <div className="w-full max-w-[45ch]">
          {/* Question prompt — always visible */}
          <p className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-6">
            {questionLabel}
          </p>

          {difficulty === "full" && (
            <MarkdownContent content={content} teleprompter />
          )}

          {difficulty === "key_phrases" && (
            <div className="space-y-4">
              {keyPhrases.map((phrase, i) => (
                <p key={i} className="text-[24px] sm:text-[28px] leading-[1.8] text-white/70 font-medium">
                  {phrase}
                </p>
              ))}
            </div>
          )}

          {difficulty === "recall" && (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
              <p className="text-white/20 text-lg mb-4">Answer from memory</p>
              <p className="text-white/10 text-sm">Start the timer and speak your answer aloud</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
