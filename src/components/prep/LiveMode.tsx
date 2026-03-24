"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PrepSession, AnswerSlot } from "@/types";
import { LiveModeCard, type LiveCard, type CardLayer } from "./LiveModeCard";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function tryParse(content?: string): unknown {
  if (!content) return null;
  try { return JSON.parse(content); } catch { return null; }
}

// ─── Card flattening ─────────────────────────────────────────────────────────

interface ParsedHypothesis { hypothesis?: string; valueDriver?: string; deliveryNote?: string }
interface ParsedQuestion { question?: string; listenFor?: string; followUp?: string; trapOpportunity?: string }
interface ParsedTrap { question?: string; trapsFor?: string; sprangAnswer?: string }
interface ParsedRecap { recommendationBridge?: string; coachingNote?: string; scopeExpansionPrompt?: string }

function flattenDiscoveryCards(slots: AnswerSlot[]): LiveCard[] {
  const cards: LiveCard[] = [];

  // 1. Hypothesis
  const hypSlot = slots.find((s) => s.type === "discovery_hypothesis");
  const hypData = tryParse(hypSlot?.content) as ParsedHypothesis | null;
  if (hypData?.hypothesis) {
    cards.push({
      id: "hyp-0",
      layer: "hypothesis",
      question: hypData.hypothesis,
      hint: hypData.deliveryNote ?? "",
      isCompleted: false,
      cardNumber: 0,
      totalCards: 0,
    });
  }

  // 2-4. Questions by layer
  const questionSlots: Array<{ type: string; layer: CardLayer }> = [
    { type: "discovery_questions_technical", layer: "technical" },
    { type: "discovery_questions_personal", layer: "personal" },
    { type: "discovery_questions_business", layer: "business" },
  ];
  for (const { type, layer } of questionSlots) {
    const slot = slots.find((s) => s.type === type);
    const data = tryParse(slot?.content);
    const items: ParsedQuestion[] = Array.isArray(data) ? data : ((data as Record<string, unknown>)?.questions as ParsedQuestion[] ?? []);
    for (const item of items) {
      if (!item.question) continue;
      cards.push({
        id: `${layer}-${cards.length}`,
        layer,
        question: item.question,
        hint: item.listenFor ? `Listen for: ${item.listenFor}` : "",
        followUp: item.followUp || undefined,
        isCompleted: false,
        cardNumber: 0,
        totalCards: 0,
      });
    }
  }

  // 5. Trap questions
  const trapSlot = slots.find((s) => s.type === "discovery_trap_questions");
  const trapData = tryParse(trapSlot?.content);
  const traps: ParsedTrap[] = Array.isArray(trapData) ? trapData : ((trapData as Record<string, unknown>)?.traps as ParsedTrap[] ?? []);
  for (const item of traps) {
    if (!item.question) continue;
    cards.push({
      id: `trap-${cards.length}`,
      layer: "trap",
      question: item.question,
      hint: item.trapsFor ? `Traps for: ${item.trapsFor}` : "",
      followUp: item.sprangAnswer ? `If sprung: ${item.sprangAnswer}` : undefined,
      isCompleted: false,
      cardNumber: 0,
      totalCards: 0,
    });
  }

  // 6. Pain recap
  const recapSlot = slots.find((s) => s.type === "discovery_pain_recap");
  const recapData = tryParse(recapSlot?.content) as ParsedRecap | null;
  if (recapData?.recommendationBridge) {
    cards.push({
      id: "recap-0",
      layer: "recap",
      question: recapData.recommendationBridge,
      hint: recapData.coachingNote ?? "",
      followUp: recapData.scopeExpansionPrompt || undefined,
      isCompleted: false,
      cardNumber: 0,
      totalCards: 0,
    });
  }

  // Number them
  for (let i = 0; i < cards.length; i++) {
    cards[i].cardNumber = i + 1;
    cards[i].totalCards = cards.length;
  }

  return cards;
}

// ─── Layer progress helper ───────────────────────────────────────────────────

const LAYER_PROGRESS: Array<{ layers: CardLayer[]; emoji: string }> = [
  { layers: ["technical"], emoji: "🔧" },
  { layers: ["personal"], emoji: "💭" },
  { layers: ["business"], emoji: "💰" },
];

// ─── LocalStorage persistence ────────────────────────────────────────────────

interface LiveProgress {
  completedIds: string[];
  currentIndex: number;
  startedAt: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface LiveModeProps {
  session: PrepSession;
  answerSlots: AnswerSlot[];
  onExit: () => void;
}

export function LiveMode({ session, answerSlots, onExit }: LiveModeProps) {
  const storageKey = `salesprep_live_${session.id}`;

  // ── Flatten cards ────────────────────────────────────────────────────────
  const cards = flattenDiscoveryCards(answerSlots);

  // ── State ────────────────────────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showHypothesisOverlay, setShowHypothesisOverlay] = useState(false);
  const startedAtRef = useRef(Date.now());
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // ── Restore from localStorage ────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved: LiveProgress = JSON.parse(raw);
      if (saved.currentIndex < cards.length) setCurrentIndex(saved.currentIndex);
      setCompletedIds(new Set(saved.completedIds));
      startedAtRef.current = saved.startedAt;
      setElapsedSeconds(Math.floor((Date.now() - saved.startedAt) / 1000));
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist to localStorage on state change ──────────────────────────────
  useEffect(() => {
    const data: LiveProgress = {
      completedIds: [...completedIds],
      currentIndex,
      startedAt: startedAtRef.current,
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [completedIds, currentIndex, storageKey]);

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Navigation ───────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, cards.length - 1));
  }, [cards.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const toggleComplete = useCallback(() => {
    const card = cards[currentIndex];
    if (!card) return;
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
  }, [cards, currentIndex]);

  // ── Swipe handlers ───────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    setSwipeOffset(dx * 0.3);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    touchStartRef.current = null;
    setSwipeOffset(0);
    if (dx < -50) goNext();
    else if (dx > 50) goPrev();
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const currentCard = cards[currentIndex];
  const allCompleted = cards.length > 0 && completedIds.size >= cards.length;
  const hypothesisCard = cards.find((c) => c.layer === "hypothesis");
  const hypothesisText = hypothesisCard?.question ?? "";
  const hypothesisSnippet = hypothesisText.split(" ").slice(0, 8).join(" ") + (hypothesisText.split(" ").length > 8 ? "..." : "");

  // Value driver from hypothesis slot
  const hypSlot = answerSlots.find((s) => s.type === "discovery_hypothesis");
  const hypParsed = tryParse(hypSlot?.content) as ParsedHypothesis | null;
  const valueDriver = hypParsed?.valueDriver ?? "reduce_risk";
  const driverLabel: Record<string, string> = {
    reduce_risk: "REDUCE RISK",
    increase_efficiency: "INCREASE EFFICIENCY",
    digitally_transform: "DIGITALLY TRANSFORM",
  };
  const driverColor: Record<string, string> = {
    reduce_risk: "text-red-400",
    increase_efficiency: "text-emerald-400",
    digitally_transform: "text-blue-400",
  };

  // Dot states (max 12 shown)
  const maxDots = 12;
  const dotStart = Math.max(0, currentIndex - Math.floor(maxDots / 2));
  const dotEnd = Math.min(cards.length, dotStart + maxDots);
  const visibleDots = cards.slice(dotStart, dotEnd);

  // ── Completion overlay ───────────────────────────────────────────────────
  if (allCompleted) {
    return (
      <div className="fixed inset-0 z-50 bg-[#121218] flex flex-col items-center justify-center text-center px-6">
        <div className="w-[72px] h-[72px] rounded-full bg-emerald-500 flex items-center justify-center mb-5">
          <span className="text-white text-3xl">✓</span>
        </div>
        <p className="text-[20px] font-bold text-white mb-2">
          All {cards.length} questions covered
        </p>
        <p className="text-[16px] text-[#888] mb-8">
          Time: {formatTime(elapsedSeconds)}
        </p>
        <button
          type="button"
          onClick={onExit}
          className="bg-[#FF6B4A] hover:bg-[#E85D3A] text-white font-semibold rounded-full px-8 py-3 text-[15px] transition-colors"
        >
          Back to full prep
        </button>
      </div>
    );
  }

  // ── Hypothesis overlay ───────────────────────────────────────────────────
  if (showHypothesisOverlay) {
    return (
      <div
        className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center px-8"
        onClick={() => setShowHypothesisOverlay(false)}
      >
        <p className="text-[22px] font-bold text-white text-center max-w-[320px] leading-snug">
          {hypothesisText}
        </p>
        <p className="text-[12px] text-[#666] mt-8">Tap anywhere to close</p>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="fixed inset-0 z-50 bg-[#121218] flex items-center justify-center">
        <p className="text-[#888] text-sm">No discovery cards available yet. Generate your prep kit first.</p>
        <button type="button" onClick={onExit} className="ml-4 text-sm text-[#FF6B4A]">Exit</button>
      </div>
    );
  }

  const cardWithCompletion: LiveCard = {
    ...currentCard,
    isCompleted: completedIds.has(currentCard.id),
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#121218] flex flex-col select-none">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="h-[56px] bg-[#0D0D14] flex items-center justify-between px-4 shrink-0">
        {/* Exit */}
        <button
          type="button"
          onClick={onExit}
          className="text-[#888] text-sm hover:text-white transition-colors"
        >
          ← Exit
        </button>

        {/* Layer progress */}
        <div className="flex items-center gap-3">
          {LAYER_PROGRESS.map(({ layers, emoji }) => {
            const total = cards.filter((c) => layers.includes(c.layer)).length;
            const completed = cards.filter((c) => layers.includes(c.layer) && completedIds.has(c.id)).length;
            const isActive = currentCard && layers.includes(currentCard.layer);
            return (
              <span
                key={layers[0]}
                className={`text-[12px] tabular-nums transition-opacity ${
                  isActive ? "text-[#E8E8E8] opacity-100" : "text-[#555] opacity-40"
                }`}
              >
                {emoji} {completed}/{total}
              </span>
            );
          })}
        </div>

        {/* Timer */}
        <span className="text-[#888] text-[13px] font-mono tabular-nums">
          {formatTime(elapsedSeconds)}
        </span>
      </div>

      {/* ── Card area ───────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-hidden px-4 py-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={toggleComplete}
      >
        <div
          className="h-full transition-transform duration-150 ease-out"
          style={{ transform: `translateX(${swipeOffset}px)` }}
        >
          <LiveModeCard card={cardWithCompletion} />
        </div>
      </div>

      {/* ── Bottom: hypothesis pin + value driver ───────────────────────── */}
      <div className="h-[48px] bg-[#1E1F2B] flex items-center justify-between px-4 shrink-0">
        <button
          type="button"
          onClick={() => setShowHypothesisOverlay(true)}
          className="text-[13px] text-[#888] hover:text-white transition-colors truncate max-w-[60%] text-left"
        >
          🎯 {hypothesisSnippet}
        </button>
        <span className={`text-[11px] uppercase tracking-wider font-semibold ${driverColor[valueDriver] ?? "text-[#888]"}`}>
          HUNTING: {driverLabel[valueDriver] ?? valueDriver}
        </span>
      </div>

      {/* ── Bottom nav: prev / dots / next ──────────────────────────────── */}
      <div className="h-[72px] bg-[#1E1F2B] border-t border-[#2A2B3D] flex items-center justify-between px-4 shrink-0 safe-area-pb">
        {/* Prev */}
        <button
          type="button"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-[#E8E8E8]" />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-1.5 overflow-hidden px-2">
          {visibleDots.map((dot, i) => {
            const globalIndex = dotStart + i;
            const isActive = globalIndex === currentIndex;
            const isDone = completedIds.has(dot.id);
            return (
              <button
                key={dot.id}
                type="button"
                onClick={() => setCurrentIndex(globalIndex)}
                className={`rounded-full shrink-0 transition-all duration-150 ${
                  isActive
                    ? "w-6 h-2 bg-white"
                    : isDone
                    ? "w-2 h-2 bg-emerald-500"
                    : "w-2 h-2 bg-[#444]"
                }`}
              />
            );
          })}
        </div>

        {/* Next */}
        <button
          type="button"
          onClick={goNext}
          disabled={currentIndex >= cards.length - 1}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors shrink-0"
        >
          <ChevronRight className="w-5 h-5 text-[#E8E8E8]" />
        </button>
      </div>
    </div>
  );
}
