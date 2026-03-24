"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PrepSession, AnswerSlot } from "@/types";
import { LiveModeCard, type LiveCard } from "./LiveModeCard";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Phase config ────────────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, string> = {
  "BEFORE YOU START": "#888",
  "OPEN THE CALL": "#10B981",
  "YOUR HYPOTHESIS": "#FF6B4A",
  "TECHNICAL PAIN": "#FF6B4A",
  "PERSONAL PAIN": "#F59E0B",
  "BUSINESS PAIN + TRAPS": "#10B981",
  "PAIN RECAP": "#D97706",
  "MY RECOMMENDATION": "#FF6B4A",
  "CLOSE + NEXT STEPS": "#3B82F6",
};

const TOTAL_PHASES = 9;

// ─── Extended card type (LiveCard + phase fields) ────────────────────────────

interface PhaseCard extends LiveCard {
  phase: string;
  phaseNumber: number;
  totalPhases: number;
  isPhaseFirst: boolean;
}

// ─── Phase-based card flattening ─────────────────────────────────────────────

interface ParsedQuestion { question?: string; listenFor?: string; followUp?: string; trapOpportunity?: string }
interface ParsedTrap { question?: string; trapsFor?: string; sprangAnswer?: string }

function getSlotContent(slots: AnswerSlot[], type: string): unknown {
  const slot = slots.find((s) => s.type === type && s.content);
  if (!slot?.content) return null;
  try {
    let data: unknown = JSON.parse(slot.content);
    if (typeof data === "string") data = JSON.parse(data);
    return data;
  } catch { return null; }
}

function flattenPhaseCards(slots: AnswerSlot[]): PhaseCard[] {
  const cards: PhaseCard[] = [];
  const base = { isCompleted: false, cardNumber: 0, totalCards: 0, totalPhases: TOTAL_PHASES, isPhaseFirst: false };

  // PHASE 1: BEFORE YOU START — scoring guide categories
  const scoringData = getSlotContent(slots, "discovery_scoring_guide") as { categories?: Array<{ name?: string; winningMove?: string; weight?: string }> } | null;
  if (scoringData?.categories) {
    for (const cat of scoringData.categories) {
      if (!cat.name) continue;
      cards.push({
        ...base,
        id: `p1-${cards.length}`,
        layer: "hypothesis",
        question: `${cat.name} — ${cat.winningMove ?? ""}`,
        hint: `Weight: ${(cat.weight ?? "medium").toUpperCase()}`,
        phase: "BEFORE YOU START",
        phaseNumber: 1,
      });
    }
  }

  // PHASE 2: OPEN THE CALL
  const openerData = getSlotContent(slots, "discovery_opener") as { grabAttention?: string; benefitStatement?: string; agenda?: string; transitionToDiscovery?: string } | null;
  if (openerData) {
    if (openerData.grabAttention) {
      cards.push({
        ...base,
        id: `p2-${cards.length}`,
        layer: "hypothesis",
        question: openerData.grabAttention,
        hint: "First 10 seconds — measured pace, not rushed",
        followUp: openerData.benefitStatement || undefined,
        phase: "OPEN THE CALL",
        phaseNumber: 2,
      });
    }
    if (openerData.agenda) {
      cards.push({
        ...base,
        id: `p2-${cards.length}`,
        layer: "hypothesis",
        question: openerData.agenda,
        hint: "Get permission before starting discovery",
        followUp: openerData.transitionToDiscovery || undefined,
        phase: "OPEN THE CALL",
        phaseNumber: 2,
      });
    }
  }

  // PHASE 3: YOUR HYPOTHESIS
  const hypData = getSlotContent(slots, "discovery_hypothesis") as { hypothesis?: string; deliveryNote?: string; backupHypothesis?: string } | null;
  if (hypData?.hypothesis) {
    cards.push({
      ...base,
      id: `p3-${cards.length}`,
      layer: "hypothesis",
      question: hypData.hypothesis,
      hint: hypData.deliveryNote ?? "",
      followUp: hypData.backupHypothesis || undefined,
      phase: "YOUR HYPOTHESIS",
      phaseNumber: 3,
    });
  }

  // PHASE 4: TECHNICAL PAIN
  const techData = getSlotContent(slots, "discovery_questions_technical");
  const techItems: ParsedQuestion[] = Array.isArray(techData) ? techData : ((techData as Record<string, unknown>)?.questions as ParsedQuestion[] ?? []);
  for (const item of techItems) {
    if (!item.question) continue;
    cards.push({
      ...base,
      id: `p4-${cards.length}`,
      layer: "technical",
      question: item.question,
      hint: item.listenFor ? `Listen for: ${item.listenFor}` : "",
      followUp: item.followUp || undefined,
      phase: "TECHNICAL PAIN",
      phaseNumber: 4,
    });
  }

  // PHASE 5: PERSONAL PAIN
  const persData = getSlotContent(slots, "discovery_questions_personal");
  const persItems: ParsedQuestion[] = Array.isArray(persData) ? persData : ((persData as Record<string, unknown>)?.questions as ParsedQuestion[] ?? []);
  for (const item of persItems) {
    if (!item.question) continue;
    cards.push({
      ...base,
      id: `p5-${cards.length}`,
      layer: "personal",
      question: item.question,
      hint: item.listenFor ? `Listen for: ${item.listenFor}` : "",
      followUp: item.followUp || undefined,
      phase: "PERSONAL PAIN",
      phaseNumber: 5,
    });
  }

  // PHASE 6: BUSINESS PAIN + TRAPS (interleaved)
  const bizData = getSlotContent(slots, "discovery_questions_business");
  const bizItems: ParsedQuestion[] = Array.isArray(bizData) ? bizData : ((bizData as Record<string, unknown>)?.questions as ParsedQuestion[] ?? []);
  const trapData = getSlotContent(slots, "discovery_trap_questions");
  const trapItems: ParsedTrap[] = Array.isArray(trapData) ? trapData : ((trapData as Record<string, unknown>)?.traps as ParsedTrap[] ?? []);

  // Interleave: biz[0], biz[1], trap[0], biz[2], biz[3], trap[1], trap[2]
  const interleaved: Array<{ type: "biz"; item: ParsedQuestion } | { type: "trap"; item: ParsedTrap }> = [];
  let bi = 0, ti = 0;
  const pattern = ["biz", "biz", "trap", "biz", "biz", "trap", "trap"] as const;
  for (const p of pattern) {
    if (p === "biz" && bi < bizItems.length) interleaved.push({ type: "biz", item: bizItems[bi++] });
    else if (p === "trap" && ti < trapItems.length) interleaved.push({ type: "trap", item: trapItems[ti++] });
  }
  // Remaining
  while (bi < bizItems.length) interleaved.push({ type: "biz", item: bizItems[bi++] });
  while (ti < trapItems.length) interleaved.push({ type: "trap", item: trapItems[ti++] });

  for (const entry of interleaved) {
    if (entry.type === "biz") {
      const item = entry.item;
      if (!item.question) continue;
      cards.push({
        ...base,
        id: `p6-${cards.length}`,
        layer: "business",
        question: item.question,
        hint: item.listenFor ? `Listen for: ${item.listenFor}` : "",
        followUp: item.followUp || undefined,
        phase: "BUSINESS PAIN + TRAPS",
        phaseNumber: 6,
      });
    } else {
      const item = entry.item;
      if (!item.question) continue;
      cards.push({
        ...base,
        id: `p6-${cards.length}`,
        layer: "trap",
        question: item.question,
        hint: item.trapsFor ? `Traps for: ${item.trapsFor}` : "",
        followUp: item.sprangAnswer ? `If sprung: ${item.sprangAnswer}` : undefined,
        phase: "BUSINESS PAIN + TRAPS",
        phaseNumber: 6,
      });
    }
  }

  // PHASE 7: PAIN RECAP
  const recapData = getSlotContent(slots, "discovery_pain_recap") as { recapTemplate?: string; confirmationQuestion?: string } | null;
  if (recapData) {
    cards.push({
      ...base,
      id: `p7-${cards.length}`,
      layer: "recap",
      question: "RECAP EVERYTHING before recommending",
      hint: "Say each pain thread out loud. Do not skip any.",
      followUp: recapData.recapTemplate || undefined,
      phase: "PAIN RECAP",
      phaseNumber: 7,
    });
    if (recapData.confirmationQuestion) {
      cards.push({
        ...base,
        id: `p7-${cards.length}`,
        layer: "recap",
        question: recapData.confirmationQuestion,
        hint: "Wait for their confirmation. Do not continue without it.",
        phase: "PAIN RECAP",
        phaseNumber: 7,
      });
    }
  }

  // PHASE 8: MY RECOMMENDATION
  const recData = getSlotContent(slots, "discovery_recommendation") as { challengerTeachMoment?: string; bridgePhrase?: string; recommendationTemplate?: string; capabilityStatements?: unknown[]; fullScript?: string } | null;
  if (recData) {
    if (recData.challengerTeachMoment) {
      cards.push({
        ...base,
        id: `p8-${cards.length}`,
        layer: "recap",
        question: recData.challengerTeachMoment,
        hint: "Lead with this insight. No product names here either — this is about their situation, not your solution.",
        phase: "MY RECOMMENDATION",
        phaseNumber: 8,
      });
    }
    if (recData.bridgePhrase) {
      cards.push({
        ...base,
        id: `p8-${cards.length}`,
        layer: "recap",
        question: recData.bridgePhrase,
        hint: 'Describe capabilities, not products. "A system that can..." not product names. Tie each capability to their exact stated pain.',
        followUp: "Check: Did you name any product? Any feature? If yes — rephrase as a capability. What does it DO, not what is it CALLED.",
        phase: "MY RECOMMENDATION",
        phaseNumber: 8,
      });
    }
  }

  // PHASE 9: CLOSE + NEXT STEPS
  const closeData = getSlotContent(slots, "discovery_close") as { multithreadingAsk?: string; confirmingQuestion?: string; nextStepProposal?: string; closeScript?: string } | null;
  if (closeData) {
    if (closeData.multithreadingAsk) {
      cards.push({
        ...base,
        id: `p9-${cards.length}`,
        layer: "technical",
        question: closeData.multithreadingAsk,
        hint: "Expand scope BEFORE proposing next step",
        phase: "CLOSE + NEXT STEPS",
        phaseNumber: 9,
      });
    }
    if (closeData.confirmingQuestion) {
      cards.push({
        ...base,
        id: `p9-${cards.length}`,
        layer: "technical",
        question: closeData.confirmingQuestion,
        hint: "Surface any remaining concerns",
        phase: "CLOSE + NEXT STEPS",
        phaseNumber: 9,
      });
    }
    if (closeData.nextStepProposal) {
      cards.push({
        ...base,
        id: `p9-${cards.length}`,
        layer: "technical",
        question: closeData.nextStepProposal,
        hint: 'Specific. Never "let me know what works."',
        followUp: closeData.closeScript || undefined,
        phase: "CLOSE + NEXT STEPS",
        phaseNumber: 9,
      });
    }
  }

  // Number cards and mark phase firsts
  let lastPhase = -1;
  for (let i = 0; i < cards.length; i++) {
    cards[i].cardNumber = i + 1;
    cards[i].totalCards = cards.length;
    if (cards[i].phaseNumber !== lastPhase) {
      cards[i].isPhaseFirst = true;
      lastPhase = cards[i].phaseNumber;
    }
  }

  return cards;
}

// ─── Phase summary for jump menu ─────────────────────────────────────────────

function getPhases(cards: PhaseCard[]): Array<{ name: string; number: number; count: number; firstIndex: number }> {
  const map = new Map<number, { name: string; number: number; count: number; firstIndex: number }>();
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (!map.has(c.phaseNumber)) {
      map.set(c.phaseNumber, { name: c.phase, number: c.phaseNumber, count: 0, firstIndex: i });
    }
    map.get(c.phaseNumber)!.count++;
  }
  return [...map.values()].sort((a, b) => a.number - b.number);
}

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
  const cards = flattenPhaseCards(answerSlots);
  const phases = getPhases(cards);

  // ── State ────────────────────────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showPhaseOverlay, setShowPhaseOverlay] = useState(false);
  const [showJumpMenu, setShowJumpMenu] = useState(false);
  const startedAtRef = useRef(Date.now());
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const phaseOverlayTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  // ── Persist ──────────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({
      completedIds: [...completedIds],
      currentIndex,
      startedAt: startedAtRef.current,
    } satisfies LiveProgress));
  }, [completedIds, currentIndex, storageKey]);

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Phase transition overlay ─────────────────────────────────────────────
  useEffect(() => {
    const card = cards[currentIndex];
    if (card?.isPhaseFirst && currentIndex > 0) {
      setShowPhaseOverlay(true);
      clearTimeout(phaseOverlayTimer.current);
      phaseOverlayTimer.current = setTimeout(() => setShowPhaseOverlay(false), 2000);
    }
    return () => clearTimeout(phaseOverlayTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

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
      if (next.has(card.id)) next.delete(card.id); else next.add(card.id);
      return next;
    });
  }, [cards, currentIndex]);

  // ── Swipe ────────────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    setSwipeOffset((e.touches[0].clientX - touchStartRef.current.x) * 0.3);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    touchStartRef.current = null;
    setSwipeOffset(0);
    if (dx < -50) goNext(); else if (dx > 50) goPrev();
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const currentCard = cards[currentIndex] as PhaseCard | undefined;
  const allCompleted = cards.length > 0 && completedIds.size >= cards.length;
  const phaseColor = currentCard ? PHASE_COLORS[currentCard.phase] ?? "#888" : "#888";
  const progressPct = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  // Dot states
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
        <p className="text-[20px] font-bold text-white mb-2">All {cards.length} cards covered</p>
        <p className="text-[16px] text-[#888] mb-8">Time: {formatTime(elapsedSeconds)}</p>
        <button type="button" onClick={onExit} className="bg-[#FF6B4A] hover:bg-[#E85D3A] text-white font-semibold rounded-full px-8 py-3 text-[15px] transition-colors">
          Back to full prep
        </button>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="fixed inset-0 z-50 bg-[#121218] flex items-center justify-center px-6">
        <p className="text-[#888] text-sm">No discovery cards available yet.</p>
        <button type="button" onClick={onExit} className="ml-4 text-sm text-[#FF6B4A]">Exit</button>
      </div>
    );
  }

  const cardForRender: LiveCard = {
    id: currentCard.id,
    layer: currentCard.layer,
    question: currentCard.question,
    hint: currentCard.hint,
    followUp: currentCard.followUp,
    isCompleted: completedIds.has(currentCard.id),
    cardNumber: currentCard.cardNumber,
    totalCards: currentCard.totalCards,
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#121218] flex flex-col select-none">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="h-[56px] bg-[#0D0D14] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onExit} className="text-[#888] text-sm hover:text-white transition-colors">
            ← Exit
          </button>
          <button type="button" onClick={() => setShowJumpMenu(true)} className="text-[#666] text-sm hover:text-white transition-colors">
            ☰
          </button>
        </div>

        <span className="font-semibold text-[13px] uppercase tracking-wider" style={{ color: phaseColor }}>
          {currentCard.phase}
        </span>

        <span className="text-[#888] text-[13px] font-mono tabular-nums">
          {formatTime(elapsedSeconds)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-[#2A2B3D] shrink-0">
        <div className="h-full transition-all duration-300 ease-out" style={{ width: `${progressPct}%`, backgroundColor: phaseColor }} />
      </div>

      {/* ── Card area ───────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-hidden px-4 py-4 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={toggleComplete}
      >
        <div className="h-full transition-transform duration-150 ease-out" style={{ transform: `translateX(${swipeOffset}px)` }}>
          <LiveModeCard card={cardForRender} />
        </div>

        {/* Phase transition overlay */}
        {showPhaseOverlay && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center transition-opacity duration-300"
            style={{ backgroundColor: `${phaseColor}15` }}
          >
            <p className="text-[28px] font-bold text-white">{currentCard.phase}</p>
            <p className="text-[14px] text-white/70 mt-2">Phase {currentCard.phaseNumber} of {TOTAL_PHASES}</p>
          </div>
        )}
      </div>

      {/* ── Bottom info bar ─────────────────────────────────────────────── */}
      <div className="h-[40px] bg-[#1E1F2B] flex items-center justify-between px-4 shrink-0">
        <div>
          <span className="text-[12px] text-[#888]">{currentCard.phase}</span>
          <span className="text-[11px] text-[#555] ml-2">Card {currentCard.cardNumber} of {currentCard.totalCards}</span>
        </div>
        <span className="text-[12px] text-[#888] font-mono tabular-nums">
          {Math.round(progressPct)}%
        </span>
      </div>

      {/* ── Bottom nav ──────────────────────────────────────────────────── */}
      <div className="h-[72px] bg-[#1E1F2B] border-t border-[#2A2B3D] flex items-center justify-between px-4 shrink-0 safe-area-pb">
        <button type="button" onClick={goPrev} disabled={currentIndex === 0} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors shrink-0">
          <ChevronLeft className="w-5 h-5 text-[#E8E8E8]" />
        </button>

        <div className="flex items-center gap-1.5 overflow-hidden px-2">
          {visibleDots.map((dot, i) => {
            const globalIndex = dotStart + i;
            const isActive = globalIndex === currentIndex;
            const isDone = completedIds.has(dot.id);
            return (
              <button key={dot.id} type="button" onClick={() => setCurrentIndex(globalIndex)}
                className={`rounded-full shrink-0 transition-all duration-150 ${isActive ? "w-6 h-2 bg-white" : isDone ? "w-2 h-2 bg-emerald-500" : "w-2 h-2 bg-[#444]"}`}
              />
            );
          })}
        </div>

        <button type="button" onClick={goNext} disabled={currentIndex >= cards.length - 1} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors shrink-0">
          <ChevronRight className="w-5 h-5 text-[#E8E8E8]" />
        </button>
      </div>

      {/* ── Jump to phase overlay ───────────────────────────────────────── */}
      {showJumpMenu && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center px-6" onClick={() => setShowJumpMenu(false)}>
          <div className="bg-[#1E1F2B] rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[#888]">Jump to phase</p>
              <button type="button" onClick={() => setShowJumpMenu(false)} className="text-[#666] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              {phases.map((p) => {
                const isCurrent = currentCard.phaseNumber === p.number;
                const phaseCards = cards.filter((c) => c.phaseNumber === p.number);
                const allDone = phaseCards.length > 0 && phaseCards.every((c) => completedIds.has(c.id));
                const color = PHASE_COLORS[p.name] ?? "#888";
                return (
                  <button
                    key={p.number}
                    type="button"
                    onClick={() => { setCurrentIndex(p.firstIndex); setShowJumpMenu(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      isCurrent ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                    style={isCurrent ? { borderLeft: `3px solid ${color}` } : undefined}
                  >
                    <span className="text-[12px] text-[#555] tabular-nums w-4 shrink-0">{p.number}</span>
                    <span className={`text-[13px] flex-1 ${isCurrent ? "text-white font-semibold" : "text-[#AAA]"}`}>
                      {p.name}
                    </span>
                    <span className="text-[11px] text-[#555]">{p.count} cards</span>
                    {allDone && <span className="text-emerald-500 text-[12px]">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
