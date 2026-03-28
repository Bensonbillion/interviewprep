"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { PrepSession, AnswerSlot, AnswerType } from "@/types";
import { getCoaching } from "@/lib/coaching-content";

// ─── Types ───────────────────────────────────────────────────────────────────

type TpMode = "flow" | "call" | "cue";

interface TpLine {
  id: string;
  text: string;
  type: "speak" | "listen" | "pause" | "section";
  sectionName?: string;
  sectionColor?: string;
  answerType?: AnswerType;
  fullAnswer?: string; // for cue card reveal
}

// ─── Slot helpers ────────────────────────────────────────────────────────────

function getSlotContent(slots: AnswerSlot[], type: string): unknown {
  const slot = slots.find((s) => s.type === type && s.content);
  if (!slot?.content) return null;
  try {
    let d: unknown = JSON.parse(slot.content);
    if (typeof d === "string") d = JSON.parse(d);
    return d;
  } catch { return null; }
}

function splitLong(text: string, max = 150): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let rem = text;
  while (rem.length > max) {
    let at = -1;
    for (let i = max; i >= max * 0.5; i--) {
      if ((rem[i] === "." || rem[i] === "!" || rem[i] === "?") && rem[i + 1] === " ") { at = i + 1; break; }
      if (rem[i] === "," && rem[i + 1] === " ") { at = i + 1; break; }
    }
    if (at === -1) { for (let i = max; i >= max * 0.6; i--) { if (rem[i] === " ") { at = i; break; } } }
    if (at === -1) at = max;
    parts.push(rem.slice(0, at).trim());
    rem = rem.slice(at).trim();
  }
  if (rem) parts.push(rem);
  return parts;
}

// ─── Render helpers ──────────────────────────────────────────────────────────

function renderBold(text: string, companyName?: string): React.ReactNode {
  // Bold: numbers, dollar amounts, [BRACKETS], company name
  const pattern = new RegExp(
    `(\\$[\\d,.]+[KMBkmbTt]?|\\d+[%x]|\\d+\\.\\d+|\\[\\^\\]]+\\]${companyName ? `|${companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` : ""})`,
    "gi"
  );
  const parts = text.split(pattern);
  return parts.map((p, i) =>
    pattern.test(p)
      ? <span key={i} className="text-[#E8735A] font-bold">{p}</span>
      : <span key={i}>{p}</span>
  );
}

function renderBrackets(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((p, i) =>
    p.startsWith("[") && p.endsWith("]")
      ? <span key={i} className="bg-amber-900/50 text-amber-300 rounded px-1">{p}</span>
      : <span key={i}>{p}</span>
  );
}

// ─── Section colors ──────────────────────────────────────────────────────────

const SECTION_COLORS: Record<string, string> = {
  "OPEN THE CALL": "#10B981", "YOUR HYPOTHESIS": "#FF6B4A", TECHNICAL: "#FF6B4A",
  PERSONAL: "#F59E0B", "BUSINESS + TRAPS": "#10B981", "PAIN RECAP": "#D97706",
  RECOMMENDATION: "#FF6B4A", CLOSE: "#3B82F6",
};

const ANSWER_COLORS: Partial<Record<string, string>> = {
  tell_me_about_yourself: "#E8735A", why_sales: "#E8735A", why_this_company: "#E8735A",
  behavioral_star: "#E8735A", comp_expectations: "#E8735A", resume_walkthrough: "#E8735A",
  constructive_feedback: "#E8735A", career_switcher_bridge: "#E8735A",
  questions_to_ask: "#3B82F6", role_play_script: "#8B5CF6", objection_response: "#8B5CF6",
  coachability_game_plan: "#8B5CF6", coachability_coaching: "#8B5CF6",
  company_brief: "#888", cheat_sheet: "#888", competitor_battle_card: "#888",
  cold_email: "#888", pain_point_analysis: "#888", assignment_guide: "#888",
};

const ANSWER_LABELS: Partial<Record<string, string>> = {
  tell_me_about_yourself: "Tell Me About Yourself", why_sales: "Why Sales?",
  why_this_company: "Why This Company?", behavioral_star: "Behavioral Answer (STAR)",
  comp_expectations: "Comp Expectations", questions_to_ask: "Questions to Ask",
  company_brief: "Company Research Brief", cheat_sheet: "Stage Cheat Sheet",
  coachability_game_plan: "Coachability Game Plan", role_play_script: "Role Play Script",
  objection_response: "Objection Responses", competitor_battle_card: "Competitor Battle Card",
  coachability_coaching: "Coachability Coaching", resume_walkthrough: "Walk Me Through Your Resume",
  constructive_feedback: "Constructive Feedback", career_switcher_bridge: "Career Switcher Bridge",
  cold_email: "Follow-Up Email", pain_point_analysis: "Pain Point Analysis",
  assignment_guide: "Assignment Guide",
  discovery_opener: "Call Opener", discovery_hypothesis: "Business Hypothesis",
  discovery_questions_technical: "Technical Questions", discovery_questions_personal: "Personal Questions",
  discovery_questions_business: "Business Questions", discovery_trap_questions: "Trap Questions",
  discovery_pain_recap: "Pain Recap", discovery_recommendation: "My Recommendation",
  discovery_close: "Close + Next Steps", discovery_scoring_guide: "Scoring Guide",
};

const REFERENCE_TYPES = new Set(["company_brief", "cheat_sheet", "discovery_scoring_guide", "assignment_guide", "competitor_battle_card"]);

// ─── Flow Mode line builder ──────────────────────────────────────────────────

function buildFlowLines(slots: AnswerSlot[]): TpLine[] {
  const lines: TpLine[] = [];
  let id = 0;
  const spoken = slots.filter((s) => s.content?.trim() && !REFERENCE_TYPES.has(s.type) && s.status === "unlocked");

  for (const slot of spoken) {
    const label = ANSWER_LABELS[slot.type] ?? slot.label ?? slot.type;
    const color = ANSWER_COLORS[slot.type] ?? "#E8735A";
    lines.push({ id: `f${id++}`, text: "", type: "section", sectionName: label.toUpperCase(), sectionColor: color, answerType: slot.type as AnswerType });

    // Try JSON parse for structured content
    let rawText = slot.content ?? "";
    try {
      const parsed = JSON.parse(rawText) as unknown;
      if (typeof parsed === "string") rawText = parsed;
      else if (typeof parsed === "object" && parsed !== null) {
        const obj = parsed as Record<string, unknown>;
        if (typeof obj.fullScript === "string") rawText = obj.fullScript;
        else if (typeof obj.answer === "string") rawText = obj.answer;
        else if (Array.isArray(parsed)) rawText = (parsed as Array<Record<string, unknown>>).map((item) => String(item.answer ?? item.question ?? item.text ?? JSON.stringify(item))).join("\n\n");
        else if (Array.isArray(obj.answers)) rawText = (obj.answers as Array<Record<string, string>>).map((a) => `${a.question ?? ""}\n${a.answer ?? ""}`).join("\n\n");
        else rawText = Object.values(obj).filter((v): v is string => typeof v === "string" && v.length > 20).join("\n\n") || (slot.content ?? "");
      }
    } catch { /* use raw */ }

    // Split into paragraphs then sentences
    const paragraphs = rawText.split(/\n\n+/).filter((p) => p.trim());
    for (const para of paragraphs) {
      for (const chunk of splitLong(para.trim())) {
        if (chunk) lines.push({ id: `f${id++}`, text: chunk, type: "speak", answerType: slot.type as AnswerType });
      }
    }
    lines.push({ id: `f${id++}`, text: "...", type: "pause" });
  }
  return lines;
}

// ─── Call Mode line builder (existing discovery logic) ───────────────────────

interface PQ { question?: string; listenFor?: string; followUp?: string }
interface PT { question?: string; trapsFor?: string; sprangAnswer?: string }

function buildCallLines(slots: AnswerSlot[]): TpLine[] {
  const lines: TpLine[] = [];
  let id = 0;
  const add = (type: TpLine["type"], text: string, sn?: string, sc?: string) => {
    if (type === "section") { lines.push({ id: `c${id++}`, text: "", type: "section", sectionName: sn, sectionColor: sc }); return; }
    if (type === "pause") { lines.push({ id: `c${id++}`, text: "...", type: "pause" }); return; }
    for (const chunk of splitLong(text, 100)) { if (chunk.trim()) lines.push({ id: `c${id++}`, text: chunk, type }); }
  };

  const opener = getSlotContent(slots, "discovery_opener") as Record<string, string> | null;
  if (opener) { add("section", "", "OPEN THE CALL", "#10B981"); if (opener.grabAttention) add("speak", opener.grabAttention); if (opener.benefitStatement) add("speak", opener.benefitStatement); if (opener.agenda) add("speak", opener.agenda); add("pause", ""); if (opener.transitionToDiscovery) add("speak", opener.transitionToDiscovery); }

  const hyp = getSlotContent(slots, "discovery_hypothesis") as Record<string, string> | null;
  if (hyp?.hypothesis) { add("section", "", "YOUR HYPOTHESIS", "#FF6B4A"); add("speak", hyp.hypothesis); add("pause", ""); }

  for (const [type, label, color] of [["discovery_questions_technical", "TECHNICAL", "#FF6B4A"], ["discovery_questions_personal", "PERSONAL", "#F59E0B"]] as const) {
    const data = getSlotContent(slots, type); const items: PQ[] = Array.isArray(data) ? data : ((data as Record<string, unknown>)?.questions as PQ[] ?? []);
    if (items.length) { add("section", "", label, color); for (const q of items) { if (q.question) add("speak", q.question); if (q.listenFor) add("listen", q.listenFor); } }
  }

  const bizData = getSlotContent(slots, "discovery_questions_business"); const bizItems: PQ[] = Array.isArray(bizData) ? bizData : ((bizData as Record<string, unknown>)?.questions as PQ[] ?? []);
  const trapData = getSlotContent(slots, "discovery_trap_questions"); const trapItems: PT[] = Array.isArray(trapData) ? trapData : ((trapData as Record<string, unknown>)?.traps as PT[] ?? []);
  if (bizItems.length || trapItems.length) {
    add("section", "", "BUSINESS + TRAPS", "#10B981");
    const inter: Array<{ k: "b"; i: PQ } | { k: "t"; i: PT }> = []; let bi = 0, ti = 0;
    for (const p of ["b", "b", "t", "b", "b", "t", "t"] as const) { if (p === "b" && bi < bizItems.length) inter.push({ k: "b", i: bizItems[bi++] }); else if (p === "t" && ti < trapItems.length) inter.push({ k: "t", i: trapItems[ti++] }); }
    while (bi < bizItems.length) inter.push({ k: "b", i: bizItems[bi++] }); while (ti < trapItems.length) inter.push({ k: "t", i: trapItems[ti++] });
    for (const e of inter) { if (e.k === "b") { if (e.i.question) add("speak", e.i.question); if ((e.i as PQ).listenFor) add("listen", (e.i as PQ).listenFor!); } else { if (e.i.question) add("speak", e.i.question); if ((e.i as PT).sprangAnswer) add("listen", (e.i as PT).sprangAnswer!.slice(0, 80)); } }
  }

  const recap = getSlotContent(slots, "discovery_pain_recap") as Record<string, string> | null;
  if (recap) { add("section", "", "PAIN RECAP", "#D97706"); if (recap.recapTemplate) for (const l of recap.recapTemplate.split("\n")) { const t = l.trim(); if (t) add("speak", t); } if (recap.confirmationQuestion) add("speak", recap.confirmationQuestion); add("pause", ""); }

  const rec = getSlotContent(slots, "discovery_recommendation") as Record<string, string> | null;
  if (rec) { add("section", "", "RECOMMENDATION", "#FF6B4A"); if (rec.challengerTeachMoment) add("speak", rec.challengerTeachMoment); add("pause", ""); if (rec.fullScript) { const banned = /samsara|dash cam|driver app|vehicle gateway|asset tag/i; for (const s of rec.fullScript.split(/(?<=\.)\s+/)) { const t = s.trim(); if (t && !banned.test(t)) add("speak", t); } } }

  const close = getSlotContent(slots, "discovery_close") as Record<string, string> | null;
  if (close) { add("section", "", "CLOSE", "#3B82F6"); if (close.multithreadingAsk) add("speak", close.multithreadingAsk); if (close.confirmingQuestion) add("speak", close.confirmingQuestion); add("pause", ""); if (close.nextStepProposal) add("speak", close.nextStepProposal); if (close.closeScript) add("speak", close.closeScript); }

  return lines;
}

// ─── Cue Card line builder ───────────────────────────────────────────────────

function buildCueLines(slots: AnswerSlot[]): TpLine[] {
  const lines: TpLine[] = [];
  let id = 0;
  const unlocked = slots.filter((s) => s.content?.trim() && s.status === "unlocked");
  for (const slot of unlocked) {
    const label = ANSWER_LABELS[slot.type] ?? slot.label ?? slot.type;
    let cue = "";
    let full = slot.content ?? "";
    try {
      const parsed = JSON.parse(full);
      if (typeof parsed === "string") { full = parsed; cue = parsed.split(/[.!?]/)[0] + "."; }
      else if (parsed?.hypothesis) { cue = parsed.hypothesis; full = parsed.fullScript ?? parsed.hypothesis; }
      else if (parsed?.fullScript) { cue = parsed.fullScript.split(/[.!?]/)[0] + "."; full = parsed.fullScript; }
      else if (parsed?.grabAttention) { cue = parsed.grabAttention; full = parsed.fullScript ?? parsed.grabAttention; }
      else if (Array.isArray(parsed)) { cue = parsed[0]?.question ?? parsed[0]?.answer ?? ""; full = parsed.map((i: Record<string, string>) => i.question ?? i.answer ?? "").join("\n\n"); }
      else if (parsed?.answers) { cue = parsed.answers[0]?.question ?? ""; full = parsed.answers.map((a: Record<string, string>) => `${a.question}\n${a.answer}`).join("\n\n"); }
      else { cue = full.split(/[.!?\n]/)[0] + "."; }
    } catch { cue = full.split(/[.!?\n]/)[0] + "."; }

    lines.push({ id: `q${id++}`, text: cue, type: "section", sectionName: label.toUpperCase(), sectionColor: ANSWER_COLORS[slot.type] ?? "#888", answerType: slot.type as AnswerType, fullAnswer: full });
    lines.push({ id: `q${id++}`, text: cue, type: "speak", answerType: slot.type as AnswerType, fullAnswer: full });
  }
  return lines;
}

// ─── Font sizes ──────────────────────────────────────────────────────────────

const FONTS = [
  { speak: "text-[22px]", listen: "text-[15px]" },
  { speak: "text-[28px]", listen: "text-[18px]" },
  { speak: "text-[34px]", listen: "text-[21px]" },
];

// ─── Rescue deck ─────────────────────────────────────────────────────────────

type RL = { type: "speak" | "listen" | "pause"; text: string };
const RESCUE_TABS: Array<{ label: string; lines: RL[] }> = [
  { label: "He opened first", lines: [{ type: "listen", text: "He gave you Level 1 pain free. Go deeper." }, { type: "speak", text: "That's actually what caught my attention when I was looking at your account." }, { type: "speak", text: "Tell me more about that — what happened exactly?" }, { type: "pause", text: "..." }, { type: "speak", text: "And what did that end up costing you?" }, { type: "speak", text: "How often has something like that happened in the last year?" }, { type: "listen", text: "Get a number. Frequency times cost = business pain." }] },
  { label: "He's defensive", lines: [{ type: "listen", text: "Do not defend. Acknowledge and redirect." }, { type: "speak", text: "Yeah, I know — I saw the notes from before." }, { type: "speak", text: "I'm not here to re-run that conversation." }, { type: "speak", text: "What I'm curious about is whether anything has changed since then." }, { type: "pause", text: "..." }, { type: "speak", text: "Has the situation stayed the same, or has anything shifted?" }, { type: "listen", text: "'Same' = quantify. 'Changed' = new pain." }] },
  { label: "Lost the thread", lines: [{ type: "listen", text: "Bridge back through his words." }, { type: "speak", text: "That's interesting — and it connects to something I wanted to ask." }, { type: "speak", text: "When situations like that happen — how does your team find out, and how quickly?" }, { type: "pause", text: "..." }, { type: "speak", text: "What's taking up the most time that probably shouldn't be?" }] },
  { label: "Proof points", lines: [{ type: "listen", text: "Lead with the pattern. Ask if it resonates." }, { type: "speak", text: "Something we see with construction fleets — it's usually not one big theft." }, { type: "speak", text: "It's the cumulative downtime. Equipment missing for two days, crew can't work." }, { type: "speak", text: "Has that pattern shown up for you?" }, { type: "pause", text: "..." }, { type: "speak", text: "The other thing — the admin burden is invisible until tracked." }, { type: "speak", text: "DVIRs, incident reports — 8-10 hours a week on paperwork." }, { type: "speak", text: "Does that feel familiar?" }] },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface Props { session: PrepSession; answerSlots: AnswerSlot[]; onExit: () => void }

export function TeleprompterMode({ session, answerSlots, onExit }: Props) {
  const isRolePlay = session.stage === "role_play";
  const [mode, setMode] = useState<TpMode>(isRolePlay ? "call" : "flow");
  const [fontIdx, setFontIdx] = useState(1);
  const [speakMode, setSpeakMode] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSec, setTimerSec] = useState(0);
  const [topBarVisible, setTopBarVisible] = useState(true);
  const [modeFlash, setModeFlash] = useState("");
  const [rescueOpen, setRescueOpen] = useState(false);
  const [rescueTab, setRescueTab] = useState(0);
  const [rescueIdx, setRescueIdx] = useState(0);
  const [rescueOp, setRescueOp] = useState(1);

  const touchRef = useRef(0);
  const autoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const topBarTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const timerIv = useRef<ReturnType<typeof setInterval>>(undefined);
  const lastTaps = useRef<number[]>([]);
  const storageKey = `salesprep_tp_${session.id}`;

  // Build lines for current mode
  const lines = mode === "call" ? buildCallLines(answerSlots) : mode === "cue" ? buildCueLines(answerSlots) : buildFlowLines(answerSlots);
  const line = lines[currentIndex];

  // Persist + restore
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(storageKey) ?? "{}"); if (typeof s.index === "number" && s.index < lines.length) setCurrentIndex(s.index); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify({ index: currentIndex })); }, [currentIndex, storageKey]);

  // Wake lock
  useEffect(() => { let wl: { release: () => void } | null = null; (async () => { try { if ("wakeLock" in navigator) wl = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ release: () => void }> } }).wakeLock.request("screen"); } catch {} })(); return () => { wl?.release(); }; }, []);

  // Timer
  useEffect(() => { if (timerRunning) { timerIv.current = setInterval(() => setTimerSec((s) => s + 1), 1000); } else { clearInterval(timerIv.current); } return () => clearInterval(timerIv.current); }, [timerRunning]);

  // Auto-advance sections
  useEffect(() => { clearTimeout(autoTimer.current); if (line?.type === "section") autoTimer.current = setTimeout(advance, 1500); return () => clearTimeout(autoTimer.current); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, mode]);

  // Top bar auto-hide
  useEffect(() => { setTopBarVisible(true); clearTimeout(topBarTimer.current); topBarTimer.current = setTimeout(() => setTopBarVisible(false), 3000); return () => clearTimeout(topBarTimer.current); }, [currentIndex]);

  // Haptic on section
  useEffect(() => { if (line?.type === "section") try { navigator?.vibrate?.(50); } catch {} }, [line]);

  // Keyboard
  useEffect(() => { const h = (e: KeyboardEvent) => { if (rescueOpen) return; if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); handleTap(); } else if (e.key === "ArrowLeft") { e.preventDefault(); goBack(); } else if (e.key === "Escape") onExit(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); });

  const advance = useCallback(() => { if (currentIndex >= lines.length - 1) return; setOpacity(0); setRevealed(false); setTimeout(() => { setCurrentIndex((i) => Math.min(i + 1, lines.length - 1)); setOpacity(1); }, 80); }, [currentIndex, lines.length]);
  const goBack = useCallback(() => { if (currentIndex <= 0) return; setOpacity(0); setRevealed(false); setTimeout(() => { setCurrentIndex((i) => Math.max(i - 1, 0)); setOpacity(1); }, 80); }, [currentIndex]);

  const handleTap = useCallback(() => {
    if (speakMode && !revealed) { setRevealed(true); return; }
    if (mode === "cue" && !revealed && line?.fullAnswer) { setRevealed(true); return; }
    advance();
  }, [speakMode, revealed, mode, line, advance]);

  const handleClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pctY = (e.clientY - rect.top) / rect.height;
    const pctX = (e.clientX - rect.left) / rect.width;
    // Triple-tap upper-left → skip to next section
    if (pctY < 0.25 && pctX < 0.3 && mode === "call") {
      lastTaps.current = [...lastTaps.current, Date.now()].slice(-3);
      if (lastTaps.current.length === 3 && lastTaps.current[2] - lastTaps.current[0] < 600) {
        const next = lines.findIndex((l, i) => i > currentIndex && l.type === "section");
        if (next > -1) { setCurrentIndex(next); lastTaps.current = []; return; }
      }
    }
    if (pctY < 0.15) goBack(); else handleTap();
  };

  const handleTouch = (start: boolean, e: React.TouchEvent) => {
    if (start) { touchRef.current = e.touches[0].clientY; return; }
    const dy = touchRef.current - e.changedTouches[0].clientY;
    if (dy > 40) handleTap(); else if (dy < -40) goBack();
  };

  const switchMode = () => {
    const next: TpMode = mode === "flow" ? "call" : mode === "call" ? "cue" : "flow";
    setMode(next);
    setCurrentIndex(0);
    setRevealed(false);
    setModeFlash(next === "flow" ? "FLOW MODE" : next === "call" ? "CALL MODE" : "CUE CARDS");
    setTimeout(() => setModeFlash(""), 1000);
  };

  // Derived
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const pct = lines.length > 0 ? ((currentIndex + 1) / lines.length) * 100 : 0;
  let sectionColor = "#888";
  for (let i = currentIndex; i >= 0; i--) { if (lines[i]?.type === "section" && lines[i].sectionColor) { sectionColor = lines[i].sectionColor!; break; } }
  const answerLabel = line?.answerType ? (ANSWER_LABELS[line.answerType] ?? line.answerType) : (line?.sectionName ?? "");
  const coaching = line?.answerType ? getCoaching(line.answerType) : null;
  const isComplete = currentIndex >= lines.length - 1 && line?.type !== "section";

  // Completion
  if (isComplete) return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1E] flex flex-col items-center justify-center text-center px-6">
      <span className="text-[64px] text-emerald-400">✓</span>
      <p className="text-[18px] text-white/50 mt-4">Session complete</p>
      <p className="text-[14px] text-white/30 mt-1">{fmt(timerSec)}</p>
      <button type="button" onClick={onExit} className="bg-[#E8735A] text-white font-semibold rounded-full px-8 py-3 text-[15px] mt-8">Exit</button>
    </div>
  );

  if (!line) return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1E] flex items-center justify-center px-6">
      <p className="text-white/30 text-sm">No content available.</p>
      <button type="button" onClick={onExit} className="ml-4 text-sm text-[#E8735A]">Exit</button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1E] flex flex-col select-none">

      {/* Top bar (auto-hides) */}
      <div className={`h-[48px] flex items-center justify-between px-4 shrink-0 transition-opacity duration-300 ${topBarVisible ? "opacity-100" : "opacity-0"}`}>
        <div className="flex items-center gap-2 text-[12px] text-white/40 min-w-0">
          <span className="text-white/20">—</span>
          <span className="truncate">{answerLabel}</span>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-white/30 shrink-0">
          {coaching?.timeTarget && <span>Goal: {coaching.timeTarget}</span>}
          <span className="font-mono tabular-nums">{fmt(timerSec)}</span>
          <button type="button" onClick={onExit} className="hover:text-white/60">Exit | ESC</button>
        </div>
      </div>

      {/* Reading guide lines (flow mode only) */}
      {mode === "flow" && (
        <>
          <div className="absolute top-[35%] left-0 right-0 h-px bg-white/[0.08] pointer-events-none z-10" />
          <div className="absolute top-[65%] left-0 right-0 h-px bg-white/[0.08] pointer-events-none z-10" />
        </>
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-7 cursor-pointer relative"
        onClick={handleClick}
        onTouchStart={(e) => handleTouch(true, e)}
        onTouchEnd={(e) => handleTouch(false, e)}
      >
        {/* Mode flash */}
        {modeFlash && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
            <p className="text-[24px] font-bold text-white uppercase tracking-widest">{modeFlash}</p>
          </div>
        )}

        {/* Speak mode overlay */}
        {speakMode && !revealed && line.type === "speak" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1A1A1E]">
            <p className="text-[16px] text-white/30">Say it. Then tap to check.</p>
          </div>
        )}

        {/* Cue card reveal overlay */}
        {mode === "cue" && !revealed && line.type === "speak" && (
          <div className="absolute inset-x-7 bottom-[30%] z-10 bg-white/5 backdrop-blur-sm rounded-lg h-16 flex items-center justify-center">
            <p className="text-[12px] text-white/20">Tap to reveal</p>
          </div>
        )}

        <div className="transition-opacity duration-150 ease-out max-w-[360px] text-center" style={{ opacity }}>
          {line.type === "speak" && (
            <p className={`${FONTS[fontIdx].speak} font-semibold text-white leading-[1.5] tracking-[-0.01em]`}>
              {mode === "cue" && revealed && line.fullAnswer
                ? renderBrackets(line.fullAnswer.slice(0, 500))
                : mode === "flow"
                  ? renderBold(line.text, session.companyName)
                  : renderBrackets(line.text)
              }
            </p>
          )}
          {line.type === "listen" && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-amber-500/60 mb-2">LISTEN FOR</p>
              <p className={`${FONTS[fontIdx].listen} font-normal text-amber-400 leading-[1.5]`}>{line.text}</p>
            </div>
          )}
          {line.type === "pause" && <p className="text-[32px] text-white/15 tracking-[0.3em]">· · ·</p>}
          {line.type === "section" && (
            <div>
              <div className="h-px mb-3" style={{ backgroundColor: `${line.sectionColor}4D` }} />
              <p className="text-[11px] font-bold uppercase tracking-widest py-3" style={{ color: line.sectionColor }}>{line.sectionName}</p>
              <div className="h-px mt-3" style={{ backgroundColor: `${line.sectionColor}4D` }} />
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-white/5 shrink-0">
        <div className="h-full transition-all duration-150" style={{ width: `${pct}%`, backgroundColor: "#E8735A" }} />
      </div>

      {/* Bottom control bar */}
      <div className="h-[72px] bg-[#111114] flex items-center justify-between px-3 shrink-0 safe-area-pb">
        {/* Left: answer name + speak toggle */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button type="button" onClick={() => setSpeakMode((o) => !o)}
            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${speakMode ? "border-amber-500/50 text-amber-400" : "border-white/10 text-white/30"}`}>
            {speakMode ? "Speak" : "Read"}
          </button>
          <span className="text-[11px] text-white/20 truncate">{answerLabel}</span>
        </div>

        {/* Center: controls */}
        <div className="flex items-center gap-2">
          <button type="button" onClick={goBack} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 text-[14px]">◀</button>
          <button type="button" onClick={() => { setTimerRunning((r) => !r); if (!timerRunning) setTimerSec(0); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] ${timerRunning ? "bg-red-500/20 text-red-400" : "bg-white/5 text-white/40"}`}>
            {timerRunning ? "■" : "▶"}
          </button>
          <button type="button" onClick={handleTap} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 text-[14px]">▶</button>
        </div>

        {/* Right: font, mode, rescue */}
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <button type="button" onClick={() => setFontIdx((i) => (i + 1) % 3)}
            className="w-8 h-8 rounded-lg bg-white/5 text-white/30 hover:text-white/50 text-[11px] font-bold">T</button>
          <button type="button" onClick={switchMode}
            className="w-8 h-8 rounded-lg bg-white/5 text-white/30 hover:text-white/50 text-[13px]">
            {mode === "flow" ? "≡" : mode === "call" ? "↑" : "□"}
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setRescueOpen(true); setRescueIdx(0); setRescueOp(1); }}
            className="w-8 h-8 rounded-lg bg-white/5 text-white/30 hover:text-white/50 text-[13px]">⚡</button>
        </div>
      </div>

      {/* Rescue deck */}
      {rescueOpen && (() => {
        const tab = RESCUE_TABS[rescueTab]; const rl = tab?.lines[rescueIdx];
        return (
          <div className="fixed inset-0 z-[52] flex flex-col justify-end" onClick={() => setRescueOpen(false)}>
            <div className="bg-[#0D0D14] rounded-t-2xl" style={{ height: "75%", animation: "action-reveal 200ms ease-out forwards" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <p className="text-[14px] font-semibold text-white/60 uppercase tracking-wider">⚡ Rescue Deck</p>
                <button type="button" onClick={() => setRescueOpen(false)} className="text-white/30 hover:text-white/60">✕</button>
              </div>
              <div className="flex gap-2 px-5 pb-3 overflow-x-auto scrollbar-none">
                {RESCUE_TABS.map((t, i) => (
                  <button key={i} type="button" onClick={() => { setRescueTab(i); setRescueIdx(0); setRescueOp(1); }}
                    className={`text-[12px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap ${rescueTab === i ? "bg-white/15 text-white" : "bg-white/5 text-white/40"}`}>{t.label}</button>
                ))}
              </div>
              <button type="button" onClick={() => setRescueOpen(false)} className="px-5 pb-3 text-[12px] text-[#E8735A]">↩ Back to call</button>
              <div className="flex-1 flex flex-col items-center justify-center px-7 cursor-pointer" style={{ minHeight: "50%" }}
                onClick={(e) => { e.stopPropagation(); const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); const p = (e.clientY - rect.top) / rect.height;
                  if (p < 0.2) { if (rescueIdx > 0) { setRescueOp(0); setTimeout(() => { setRescueIdx((i) => i - 1); setRescueOp(1); }, 80); } }
                  else { if (rescueIdx < (tab?.lines.length ?? 1) - 1) { setRescueOp(0); setTimeout(() => { setRescueIdx((i) => i + 1); setRescueOp(1); }, 80); } }
                }}>
                <div className="transition-opacity duration-150 max-w-[300px] text-center" style={{ opacity: rescueOp }}>
                  {rl?.type === "speak" && <p className="text-[24px] font-semibold text-white leading-[1.5]">{rl.text}</p>}
                  {rl?.type === "listen" && <div><p className="text-[10px] uppercase tracking-widest text-amber-500/60 mb-2">LISTEN FOR</p><p className="text-[16px] text-amber-400">{rl.text}</p></div>}
                  {rl?.type === "pause" && <p className="text-[28px] text-white/15 tracking-[0.3em]">· · ·</p>}
                </div>
                <div className="flex gap-1 mt-6">{(tab?.lines ?? []).map((_, i) => (<div key={i} className={`rounded-full transition-all ${i === rescueIdx ? "w-4 h-1.5 bg-white/50" : "w-1.5 h-1.5 bg-white/15"}`} />))}</div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
