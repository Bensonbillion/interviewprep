"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { PrepSession, AnswerSlot } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TpCard {
  id: string;
  label: string;
  color: string;
  content: string; // full readable content for this card
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSlotContent(slots: AnswerSlot[], type: string): unknown {
  const slot = slots.find((s) => s.type === type && s.content);
  if (!slot?.content) return null;
  try {
    let d: unknown = JSON.parse(slot.content);
    if (typeof d === "string") d = JSON.parse(d);
    return d;
  } catch { return null; }
}

function renderBrackets(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((p, i) =>
    p.startsWith("[") && p.endsWith("]")
      ? <span key={i} className="bg-amber-900/50 text-amber-300 rounded px-1">{p}</span>
      : <span key={i}>{p}</span>
  );
}

function formatForTeleprompter(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/^#{1,6}\s+(.+)$/gm, "$1")
    .replace(/^---+$/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitIntoSections(content: string): string[] {
  return formatForTeleprompter(content).split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

const SECTION_LABELS = ["quick take", "30-second", "30 second", "full answer", "key points", "coaching tip", "coaching note"];

function isLabel(text: string): boolean {
  const lower = text.toLowerCase();
  return SECTION_LABELS.some((l) => lower.startsWith(l));
}

// ─── Card labels + colors ────────────────────────────────────────────────────

const CARD_META: Record<string, { label: string; color: string }> = {
  discovery_opener: { label: "CALL OPENER", color: "#10B981" },
  discovery_hypothesis: { label: "BUSINESS HYPOTHESIS", color: "#E8735A" },
  discovery_questions_technical: { label: "TECHNICAL QUESTIONS", color: "#E8735A" },
  discovery_questions_personal: { label: "PERSONAL QUESTIONS", color: "#F59E0B" },
  discovery_questions_business: { label: "BUSINESS QUESTIONS", color: "#10B981" },
  discovery_trap_questions: { label: "TRAP QUESTIONS", color: "#8B5CF6" },
  discovery_pain_recap: { label: "PAIN RECAP", color: "#D97706" },
  discovery_recommendation: { label: "MY RECOMMENDATION", color: "#E8735A" },
  discovery_close: { label: "CLOSE + NEXT STEPS", color: "#3B82F6" },
  discovery_scoring_guide: { label: "SCORING GUIDE", color: "#64748B" },
  tell_me_about_yourself: { label: "TELL ME ABOUT YOURSELF", color: "#E8735A" },
  why_sales: { label: "WHY SALES", color: "#E8735A" },
  why_this_company: { label: "WHY THIS COMPANY", color: "#E8735A" },
  behavioral_star: { label: "BEHAVIORAL ANSWER", color: "#E8735A" },
  comp_expectations: { label: "COMP EXPECTATIONS", color: "#E8735A" },
  role_play_script: { label: "ROLE PLAY SCRIPT", color: "#8B5CF6" },
  objection_response: { label: "OBJECTION RESPONSES", color: "#8B5CF6" },
  company_brief: { label: "COMPANY BRIEF", color: "#64748B" },
  cheat_sheet: { label: "CHEAT SHEET", color: "#64748B" },
  questions_to_ask: { label: "QUESTIONS TO ASK", color: "#3B82F6" },
  coachability_game_plan: { label: "COACHABILITY GAME PLAN", color: "#8B5CF6" },
  coachability_coaching: { label: "COACHABILITY COACHING", color: "#8B5CF6" },
  resume_walkthrough: { label: "RESUME WALKTHROUGH", color: "#E8735A" },
  constructive_feedback: { label: "CONSTRUCTIVE FEEDBACK", color: "#E8735A" },
  career_switcher_bridge: { label: "CAREER SWITCHER BRIDGE", color: "#E8735A" },
  cold_email: { label: "COLD EMAIL", color: "#3B82F6" },
  pain_point_analysis: { label: "PAIN POINT ANALYSIS", color: "#3B82F6" },
  assignment_guide: { label: "ASSIGNMENT GUIDE", color: "#64748B" },
  competitor_battle_card: { label: "COMPETITOR BATTLE CARD", color: "#8B5CF6" },
};

// ─── Extract readable content from slot ──────────────────────────────────────

interface PQ { question?: string; listenFor?: string; followUp?: string }

function extractContent(slot: AnswerSlot): string {
  const raw = slot.content ?? "";
  try {
    let parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    if (typeof parsed !== "object" || parsed === null) return raw;

    const obj = parsed as Record<string, unknown>;

    // Full script types
    if (typeof obj.fullScript === "string") return obj.fullScript;

    // Hypothesis
    if (typeof obj.hypothesis === "string") {
      let text = obj.hypothesis;
      if (typeof obj.deliveryNote === "string") text += "\n\n💡 " + obj.deliveryNote;
      if (typeof obj.backupHypothesis === "string") text += "\n\nAlternate: " + obj.backupHypothesis;
      return text;
    }

    // Question arrays (technical, personal, business)
    if (Array.isArray(parsed)) {
      return (parsed as PQ[]).map((q, i) => {
        let line = `${i + 1}. ${q.question ?? ""}`;
        if (q.listenFor) line += `\n   Listen for: ${q.listenFor}`;
        if (q.followUp) line += `\n   Follow-up: ${q.followUp}`;
        return line;
      }).join("\n\n");
    }

    // Trap questions
    if (Array.isArray(obj.traps)) {
      return (obj.traps as Array<Record<string, string>>).map((t, i) => {
        let line = `${i + 1}. ${t.question ?? ""}`;
        if (t.trapsFor) line += `\n   Traps for: ${t.trapsFor}`;
        if (t.sprangAnswer) line += `\n   If sprung: ${t.sprangAnswer}`;
        return line;
      }).join("\n\n");
    }

    // Pain recap
    if (typeof obj.recapTemplate === "string") {
      let text = obj.recapTemplate;
      if (typeof obj.confirmationQuestion === "string") text += "\n\n" + obj.confirmationQuestion;
      if (typeof obj.recommendationBridge === "string") text += "\n\n→ " + obj.recommendationBridge;
      if (typeof obj.coachingNote === "string") text += "\n\n💡 " + obj.coachingNote;
      return text;
    }

    // Recommendation
    if (typeof obj.challengerTeachMoment === "string" || typeof obj.bridgePhrase === "string") {
      const parts: string[] = [];
      if (typeof obj.challengerTeachMoment === "string") parts.push(obj.challengerTeachMoment);
      if (typeof obj.bridgePhrase === "string") parts.push("→ " + obj.bridgePhrase);
      if (typeof obj.recommendationTemplate === "string") parts.push(obj.recommendationTemplate);
      if (Array.isArray(obj.capabilityStatements)) {
        for (const cs of obj.capabilityStatements as Array<Record<string, string>>) {
          parts.push(`• ${cs.capability ?? ""}\n  Because: ${cs.tiedToPain ?? ""}`);
        }
      }
      if (typeof obj.scopeExpansion === "string") parts.push(obj.scopeExpansion);
      if (typeof obj.coachingNote === "string") parts.push("💡 " + obj.coachingNote);
      return parts.join("\n\n");
    }

    // Close
    if (typeof obj.multithreadingAsk === "string") {
      const parts: string[] = [];
      if (typeof obj.multithreadingAsk === "string") parts.push("1. Expand scope:\n" + obj.multithreadingAsk);
      if (typeof obj.confirmingQuestion === "string") parts.push("2. Confirm:\n" + obj.confirmingQuestion);
      if (typeof obj.nextStepProposal === "string") parts.push("3. Next step:\n" + obj.nextStepProposal);
      if (typeof obj.closeScript === "string") parts.push("4. Calendar:\n" + obj.closeScript);
      if (typeof obj.notReadyHandle === "string") parts.push("If not ready:\n" + obj.notReadyHandle);
      return parts.join("\n\n");
    }

    // Scoring guide
    if (Array.isArray(obj.categories) || Array.isArray(obj.groups)) {
      const cats = Array.isArray(obj.groups)
        ? (obj.groups as Array<Record<string, unknown>>).flatMap((g) => (g.categories as Array<Record<string, string>>) ?? [])
        : (obj.categories as Array<Record<string, string>>) ?? [];
      return cats.map((c) => `${c.name ?? ""}\n  5/5: ${c.fiveOutOfFive ?? ""}\n  Winning move: ${c.winningMove ?? ""}`).join("\n\n");
    }

    // Behavioral STAR answers
    if (Array.isArray(obj.answers)) {
      return (obj.answers as Array<Record<string, string>>).map((a) => `Q: ${a.question ?? ""}\n\n${a.answer ?? ""}`).join("\n\n---\n\n");
    }

    // Generic: extract all string values > 20 chars
    return Object.values(obj).filter((v): v is string => typeof v === "string" && v.length > 20).join("\n\n") || raw;
  } catch {
    return raw;
  }
}

// ─── Build cards from slots ──────────────────────────────────────────────────

function buildCards(slots: AnswerSlot[]): TpCard[] {
  return slots
    .filter((s) => s.content?.trim() && s.status === "unlocked")
    .map((s) => {
      const meta = CARD_META[s.type] ?? { label: s.label?.toUpperCase() ?? s.type, color: "#888" };
      return {
        id: s.type,
        label: meta.label,
        color: meta.color,
        content: extractContent(s),
      };
    })
    .filter((c) => c.content.trim().length > 10);
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props { session: PrepSession; answerSlots: AnswerSlot[]; onExit: () => void }

export function TeleprompterMode({ session, answerSlots, onExit }: Props) {
  const cards = buildCards(answerSlots);
  const [idx, setIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const touchRef = useRef(0);
  const storageKey = `salesprep_tp2_${session.id}`;

  // Restore
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(storageKey) ?? "{}"); if (typeof s.idx === "number" && s.idx < cards.length) setIdx(s.idx); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify({ idx })); }, [idx, storageKey]);

  // Wake lock
  useEffect(() => { let wl: { release: () => void } | null = null; (async () => { try { if ("wakeLock" in navigator) wl = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ release: () => void }> } }).wakeLock.request("screen"); } catch {} })(); return () => { wl?.release(); }; }, []);

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); advance(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goBack(); }
      else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const advance = useCallback(() => {
    if (idx >= cards.length - 1) return;
    setOpacity(0);
    setTimeout(() => { setIdx((i) => Math.min(i + 1, cards.length - 1)); setOpacity(1); }, 100);
  }, [idx, cards.length]);

  const goBack = useCallback(() => {
    if (idx <= 0) return;
    setOpacity(0);
    setTimeout(() => { setIdx((i) => Math.max(i - 1, 0)); setOpacity(1); }, 100);
  }, [idx]);

  const handleClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pct = (e.clientY - rect.top) / rect.height;
    if (pct < 0.15) goBack(); else advance();
  };

  const card = cards[idx];
  const pct = cards.length > 0 ? ((idx + 1) / cards.length) * 100 : 0;

  // Completion
  if (!card || idx >= cards.length) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col items-center justify-center text-center px-6">
        <span className="text-[64px] text-emerald-400">✓</span>
        <p className="text-[18px] text-white/50 mt-4">{cards.length > 0 ? "All cards reviewed" : "No content available"}</p>
        <button type="button" onClick={onExit} className="bg-[#E8735A] text-white font-semibold rounded-full px-8 py-3 text-[15px] mt-8">Exit</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col select-none">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onExit} className="text-[12px] text-white/30 hover:text-white/60 transition-colors">✕ Exit</button>
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: card.color }}>{card.label}</span>
        </div>
        <span className="text-[11px] text-white/20 font-mono tabular-nums">{idx + 1} / {cards.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-white/5 shrink-0">
        <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: card.color }} />
      </div>

      {/* Content area — scrollable, full card content */}
      <div
        className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 cursor-pointer"
        onClick={handleClick}
        onTouchStart={(e) => { touchRef.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => { const dy = touchRef.current - e.changedTouches[0].clientY; if (dy > 50) advance(); else if (dy < -50) goBack(); }}
      >
        <div className="max-w-[600px] mx-auto space-y-8 transition-opacity duration-150" style={{ opacity }}>
          {splitIntoSections(card.content).map((section, i) => {
            const firstLine = section.split("\n")[0];
            const rest = section.split("\n").slice(1).join("\n").trim();
            const looksLikeLabel = isLabel(firstLine) && rest.length > 0;

            return looksLikeLabel ? (
              <div key={i} className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[rgba(255,255,255,0.3)]">{firstLine}</p>
                <p className="text-[22px] leading-[1.65] text-[#E8E8E8] font-[family-name:var(--font-serif)]">{renderBrackets(rest)}</p>
              </div>
            ) : (
              <p key={i} className="text-[22px] leading-[1.65] text-[#E8E8E8] font-[family-name:var(--font-serif)]">{renderBrackets(section)}</p>
            );
          })}
        </div>
      </div>

      {/* Bottom hint */}
      <div className="shrink-0 text-center py-3">
        <p className="text-[11px] text-white/15">Tap to advance · ← → keys · Swipe up/down</p>
      </div>
    </div>
  );
}
