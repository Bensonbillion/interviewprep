"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { PrepSession, AnswerSlot } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanText(raw: string): string {
  return raw
    .replace(/^#{1,6}\s+(.+)$/gm, "$1")
    .replace(/^---+\s*$/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderBrackets(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((p, i) =>
    p.startsWith("[") && p.endsWith("]")
      ? <span key={i} className="bg-amber-900/50 text-amber-300 rounded px-1">{p}</span>
      : <span key={i}>{p}</span>
  );
}

// ─── Version parser ──────────────────────────────────────────────────────────

interface Version { label: string; content: string }

function parseVersions(raw: string): Version[] {
  if (!raw || raw.trim().length < 10) return [];
  if (raw.includes("__GENERATION_FAILED__")) return [];

  // Split on " --- ## " — the actual inline separator in generated content
  const parts = raw.split(/\s*---\s*##\s*/);

  if (parts.length <= 1) {
    return [{ label: "Full Answer", content: cleanText(raw) }];
  }

  return parts
    .map((part, i) => {
      const trimmed = part.trim();
      if (i === 0) {
        // First section has no heading — it's the quick take
        return { label: "Quick Take", content: cleanText(trimmed) };
      }
      // The ## was consumed by split — first line is the heading label
      const nl = trimmed.indexOf("\n");
      if (nl === -1) {
        return { label: trimmed || `Section ${i}`, content: "" };
      }
      const label = trimmed
        .slice(0, nl)
        .replace(/\(~?\d+\s*seconds?\)/gi, "")
        .replace(/[()~]/g, "")
        .trim();
      const content = cleanText(trimmed.slice(nl + 1));
      return { label, content };
    })
    .filter((v) => v.content.length > 10);
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
  if (raw.includes("__GENERATION_FAILED__")) return raw;
  try {
    let parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    if (typeof parsed !== "object" || parsed === null) return raw;
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.fullScript === "string") return obj.fullScript;
    if (typeof obj.hypothesis === "string") {
      let t = obj.hypothesis;
      if (typeof obj.deliveryNote === "string") t += "\n\n" + obj.deliveryNote;
      if (typeof obj.backupHypothesis === "string") t += "\n\nAlternate: " + obj.backupHypothesis;
      return t;
    }
    if (Array.isArray(parsed)) return (parsed as PQ[]).map((q, i) => { let l = `${i + 1}. ${q.question ?? ""}`; if (q.listenFor) l += `\n   Listen for: ${q.listenFor}`; if (q.followUp) l += `\n   Follow-up: ${q.followUp}`; return l; }).join("\n\n");
    if (Array.isArray(obj.traps)) return (obj.traps as Array<Record<string, string>>).map((t, i) => { let l = `${i + 1}. ${t.question ?? ""}`; if (t.trapsFor) l += `\n   Traps for: ${t.trapsFor}`; return l; }).join("\n\n");
    if (typeof obj.recapTemplate === "string") { let t = obj.recapTemplate; if (typeof obj.confirmationQuestion === "string") t += "\n\n" + obj.confirmationQuestion; if (typeof obj.recommendationBridge === "string") t += "\n\n→ " + obj.recommendationBridge; return t; }
    if (typeof obj.challengerTeachMoment === "string" || typeof obj.bridgePhrase === "string") { const p: string[] = []; if (typeof obj.challengerTeachMoment === "string") p.push(obj.challengerTeachMoment); if (typeof obj.bridgePhrase === "string") p.push("→ " + obj.bridgePhrase); if (Array.isArray(obj.capabilityStatements)) for (const cs of obj.capabilityStatements as Array<Record<string, string>>) p.push(`• ${cs.capability ?? ""}\n  Because: ${cs.tiedToPain ?? ""}`); if (typeof obj.scopeExpansion === "string") p.push(obj.scopeExpansion); return p.join("\n\n"); }
    if (typeof obj.multithreadingAsk === "string") { const p: string[] = []; if (typeof obj.multithreadingAsk === "string") p.push("1. Expand scope:\n" + obj.multithreadingAsk); if (typeof obj.confirmingQuestion === "string") p.push("2. Confirm:\n" + obj.confirmingQuestion); if (typeof obj.nextStepProposal === "string") p.push("3. Next step:\n" + obj.nextStepProposal); if (typeof obj.closeScript === "string") p.push("4. Calendar:\n" + obj.closeScript); return p.join("\n\n"); }
    if (Array.isArray(obj.categories) || Array.isArray(obj.groups)) { const cats = Array.isArray(obj.groups) ? (obj.groups as Array<Record<string, unknown>>).flatMap((g) => (g.categories as Array<Record<string, string>>) ?? []) : (obj.categories as Array<Record<string, string>>) ?? []; return cats.map((c) => `${c.name ?? ""}\n  5/5: ${c.fiveOutOfFive ?? ""}\n  Winning move: ${c.winningMove ?? ""}`).join("\n\n"); }
    if (Array.isArray(obj.answers)) return (obj.answers as Array<Record<string, string>>).map((a) => `Q: ${a.question ?? ""}\n\n${a.answer ?? ""}`).join("\n\n---\n\n");
    return Object.values(obj).filter((v): v is string => typeof v === "string" && v.length > 20).join("\n\n") || raw;
  } catch { return raw; }
}

// ─── Build cards ─────────────────────────────────────────────────────────────

interface TpCard {
  id: string;
  label: string;
  color: string;
  content: string;
  status: "unlocked" | "locked" | "loading";
}

function buildCards(slots: AnswerSlot[]): TpCard[] {
  return slots
    .filter((s) => s.type !== "cheat_sheet") // skip cheat sheet in teleprompter
    .map((s) => {
      const meta = CARD_META[s.type] ?? { label: s.label?.toUpperCase() ?? s.type, color: "#888" };
      return {
        id: s.type,
        label: meta.label,
        color: meta.color,
        content: s.status === "unlocked" ? extractContent(s) : "",
        status: s.status as TpCard["status"],
      };
    });
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props { session: PrepSession; answerSlots: AnswerSlot[]; onExit: () => void }

export function TeleprompterMode({ session, answerSlots, onExit }: Props) {
  const cards = buildCards(answerSlots);
  const [idx, setIdx] = useState(0);
  const [versionIdx, setVersionIdx] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const touchRef = useRef(0);
  const storageKey = `salesprep_tp3_${session.id}`;

  // Reset version tab when card changes
  useEffect(() => { setVersionIdx(0); }, [idx]);

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
    // Don't advance if clicking version tabs
    if ((e.target as HTMLElement).closest("[data-version-tab]")) return;
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

  // Locked or failed state
  const isLocked = card.status === "locked";
  const isFailed = !card.content || card.content.includes("__GENERATION_FAILED__") || card.content.trim().length < 10;

  if (isLocked || (card.status === "unlocked" && isFailed)) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col select-none">
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onExit} className="text-[12px] text-white/30 hover:text-white/60 transition-colors">✕ Exit</button>
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: card.color }}>{card.label}</span>
          </div>
          <span className="text-[11px] text-white/20 font-mono tabular-nums">{idx + 1} / {cards.length}</span>
        </div>
        <div className="h-[2px] bg-white/5 shrink-0"><div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: card.color }} /></div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
          <div className="w-14 h-14 rounded-full bg-[rgba(255,255,255,0.07)] flex items-center justify-center text-[26px]">
            {isLocked ? "🔒" : "⚠️"}
          </div>
          <div>
            <p className="text-[18px] font-medium text-[#E8E8E8] mb-2">{isLocked ? "This answer is locked" : "This answer didn\u2019t generate"}</p>
            <p className="text-[14px] leading-relaxed text-[rgba(255,255,255,0.4)]">{isLocked ? "Unlock to add it to your teleprompter" : "Tap below to try again — no credit charged"}</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={advance} className="px-5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.1)] text-white/60 text-[13px] font-medium hover:bg-[rgba(255,255,255,0.15)] transition-colors">Skip →</button>
          </div>
        </div>

        <div className="shrink-0 text-center py-3"><p className="text-[11px] text-white/15">Tap to advance · ← → keys</p></div>
      </div>
    );
  }

  // Parse versions
  const versions = parseVersions(card.content);
  const current = versions[versionIdx] ?? versions[0];

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

      {/* Version tabs — only when multiple versions */}
      {versions.length > 1 && (
        <div className="flex gap-2 px-6 py-3 border-b border-[rgba(255,255,255,0.08)] shrink-0" data-version-tab>
          {versions.map((v, i) => (
            <button key={i} type="button" onClick={() => setVersionIdx(i)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium uppercase tracking-[0.06em] transition-all ${
                i === versionIdx ? "bg-[rgba(255,255,255,0.15)] text-[#E8E8E8]" : "text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.5)]"
              }`}>
              {v.label}
            </button>
          ))}
        </div>
      )}

      {/* Content area */}
      <div
        className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 cursor-pointer"
        onClick={handleClick}
        onTouchStart={(e) => { touchRef.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => { const dy = touchRef.current - e.changedTouches[0].clientY; if (dy > 50) advance(); else if (dy < -50) goBack(); }}
      >
        {current && (
          <div className="max-w-[600px] mx-auto space-y-6 transition-opacity duration-150" style={{ opacity }}>
            {current.content.split(/\n\n+/).filter(Boolean).map((para, i) => (
              <p key={i} className="text-[22px] leading-[1.65] text-[#E8E8E8] font-[family-name:var(--font-serif)]">
                {renderBrackets(para)}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <div className="shrink-0 text-center py-3">
        <p className="text-[11px] text-white/15">Tap to advance · ← → keys · Swipe up/down</p>
      </div>
    </div>
  );
}
