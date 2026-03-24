"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { PrepSession, AnswerSlot } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TeleprompterLine {
  id: string;
  text: string;
  type: "speak" | "listen" | "pause" | "section";
  sectionName?: string;
  sectionColor?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSlotContent(slots: AnswerSlot[], type: string): unknown {
  const slot = slots.find((s) => s.type === type && s.content);
  if (!slot?.content) return null;
  try {
    let data: unknown = JSON.parse(slot.content);
    if (typeof data === "string") data = JSON.parse(data);
    return data;
  } catch { return null; }
}

/** Split text >100 chars at sentence or comma boundaries */
function splitLong(text: string, max = 100): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > max) {
    let splitAt = -1;
    // Try sentence break
    for (let i = max; i >= max / 2; i--) {
      if (remaining[i] === "." && remaining[i + 1] === " ") { splitAt = i + 1; break; }
      if (remaining[i] === "," && remaining[i + 1] === " ") { splitAt = i + 1; break; }
      if (remaining[i] === " " && i >= max * 0.6) { splitAt = i; break; }
    }
    if (splitAt === -1) splitAt = max;
    parts.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

/** Render text with [BRACKETS] highlighted */
function renderBrackets(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((p, i) =>
    p.startsWith("[") && p.endsWith("]") ? (
      <span key={i} className="bg-amber-900/50 text-amber-300 rounded px-1">{p}</span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

// ─── Section colors ──────────────────────────────────────────────────────────

const SECTION_COLORS: Record<string, string> = {
  "OPEN THE CALL": "#10B981",
  "YOUR HYPOTHESIS": "#FF6B4A",
  TECHNICAL: "#FF6B4A",
  PERSONAL: "#F59E0B",
  "BUSINESS + TRAPS": "#10B981",
  "PAIN RECAP": "#D97706",
  RECOMMENDATION: "#FF6B4A",
  CLOSE: "#3B82F6",
};

// ─── Line builder ────────────────────────────────────────────────────────────

interface ParsedQ { question?: string; listenFor?: string }
interface ParsedTrap { question?: string; trapsFor?: string; sprangAnswer?: string }

function buildLines(slots: AnswerSlot[]): TeleprompterLine[] {
  const lines: TeleprompterLine[] = [];
  let id = 0;
  const add = (type: TeleprompterLine["type"], text: string, sectionName?: string, sectionColor?: string) => {
    if (type === "section") {
      lines.push({ id: `l${id++}`, text: "", type: "section", sectionName, sectionColor });
      return;
    }
    if (type === "pause") {
      lines.push({ id: `l${id++}`, text: "· · ·", type: "pause" });
      return;
    }
    for (const chunk of splitLong(text)) {
      if (chunk.trim()) lines.push({ id: `l${id++}`, text: chunk, type });
    }
  };

  // OPEN THE CALL
  const opener = getSlotContent(slots, "discovery_opener") as { grabAttention?: string; benefitStatement?: string; agenda?: string; transitionToDiscovery?: string } | null;
  if (opener) {
    add("section", "", "OPEN THE CALL", SECTION_COLORS["OPEN THE CALL"]);
    if (opener.grabAttention) add("speak", opener.grabAttention);
    if (opener.benefitStatement) add("speak", opener.benefitStatement);
    if (opener.agenda) add("speak", opener.agenda);
    add("pause", "");
    if (opener.transitionToDiscovery) add("speak", opener.transitionToDiscovery);
  }

  // HYPOTHESIS
  const hyp = getSlotContent(slots, "discovery_hypothesis") as { hypothesis?: string } | null;
  if (hyp?.hypothesis) {
    add("section", "", "YOUR HYPOTHESIS", SECTION_COLORS["YOUR HYPOTHESIS"]);
    add("speak", hyp.hypothesis);
    add("pause", "");
  }

  // TECHNICAL
  const techData = getSlotContent(slots, "discovery_questions_technical");
  const techItems: ParsedQ[] = Array.isArray(techData) ? techData : ((techData as Record<string, unknown>)?.questions as ParsedQ[] ?? []);
  if (techItems.length > 0) {
    add("section", "", "TECHNICAL", SECTION_COLORS.TECHNICAL);
    for (const q of techItems) {
      if (q.question) add("speak", q.question);
      if (q.listenFor) add("listen", q.listenFor);
    }
  }

  // PERSONAL
  const persData = getSlotContent(slots, "discovery_questions_personal");
  const persItems: ParsedQ[] = Array.isArray(persData) ? persData : ((persData as Record<string, unknown>)?.questions as ParsedQ[] ?? []);
  if (persItems.length > 0) {
    add("section", "", "PERSONAL", SECTION_COLORS.PERSONAL);
    for (const q of persItems) {
      if (q.question) add("speak", q.question);
      if (q.listenFor) add("listen", q.listenFor);
    }
  }

  // BUSINESS + TRAPS interleaved
  const bizData = getSlotContent(slots, "discovery_questions_business");
  const bizItems: ParsedQ[] = Array.isArray(bizData) ? bizData : ((bizData as Record<string, unknown>)?.questions as ParsedQ[] ?? []);
  const trapData = getSlotContent(slots, "discovery_trap_questions");
  const trapItems: ParsedTrap[] = Array.isArray(trapData) ? trapData : ((trapData as Record<string, unknown>)?.traps as ParsedTrap[] ?? []);

  if (bizItems.length > 0 || trapItems.length > 0) {
    add("section", "", "BUSINESS + TRAPS", SECTION_COLORS["BUSINESS + TRAPS"]);
    const interleaved: Array<{ kind: "biz"; item: ParsedQ } | { kind: "trap"; item: ParsedTrap }> = [];
    let bi = 0, ti = 0;
    const pattern = ["biz", "biz", "trap", "biz", "biz", "trap", "trap"] as const;
    for (const p of pattern) {
      if (p === "biz" && bi < bizItems.length) interleaved.push({ kind: "biz", item: bizItems[bi++] });
      else if (p === "trap" && ti < trapItems.length) interleaved.push({ kind: "trap", item: trapItems[ti++] });
    }
    while (bi < bizItems.length) interleaved.push({ kind: "biz", item: bizItems[bi++] });
    while (ti < trapItems.length) interleaved.push({ kind: "trap", item: trapItems[ti++] });

    for (const entry of interleaved) {
      if (entry.kind === "biz") {
        if (entry.item.question) add("speak", entry.item.question);
        if (entry.item.listenFor) add("listen", entry.item.listenFor);
      } else {
        if (entry.item.question) add("speak", entry.item.question);
        if (entry.item.sprangAnswer) add("listen", entry.item.sprangAnswer.slice(0, 80));
      }
    }
  }

  // PAIN RECAP
  const recap = getSlotContent(slots, "discovery_pain_recap") as { recapTemplate?: string; confirmationQuestion?: string } | null;
  if (recap) {
    add("section", "", "PAIN RECAP", SECTION_COLORS["PAIN RECAP"]);
    if (recap.recapTemplate) {
      for (const line of recap.recapTemplate.split("\n")) {
        const trimmed = line.trim();
        if (trimmed) add("speak", trimmed);
      }
    }
    if (recap.confirmationQuestion) add("speak", recap.confirmationQuestion);
    add("pause", "");
  }

  // RECOMMENDATION
  const rec = getSlotContent(slots, "discovery_recommendation") as { challengerTeachMoment?: string; fullScript?: string } | null;
  if (rec) {
    add("section", "", "RECOMMENDATION", SECTION_COLORS.RECOMMENDATION);
    if (rec.challengerTeachMoment) add("speak", rec.challengerTeachMoment);
    add("pause", "");
    if (rec.fullScript) {
      const banned = /samsara|dash cam|driver app|vehicle gateway|asset tag/i;
      for (const sentence of rec.fullScript.split(/(?<=\.)\s+/)) {
        const trimmed = sentence.trim();
        if (trimmed && !banned.test(trimmed)) add("speak", trimmed);
      }
    }
  }

  // CLOSE
  const close = getSlotContent(slots, "discovery_close") as { multithreadingAsk?: string; confirmingQuestion?: string; nextStepProposal?: string; closeScript?: string } | null;
  if (close) {
    add("section", "", "CLOSE", SECTION_COLORS.CLOSE);
    if (close.multithreadingAsk) add("speak", close.multithreadingAsk);
    if (close.confirmingQuestion) add("speak", close.confirmingQuestion);
    add("pause", "");
    if (close.nextStepProposal) add("speak", close.nextStepProposal);
    if (close.closeScript) add("speak", close.closeScript);
  }

  return lines;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface TeleprompterModeProps {
  session: PrepSession;
  answerSlots: AnswerSlot[];
  onExit: () => void;
}

// ─── Rescue deck content ─────────────────────────────────────────────────────

type RescueLine = { type: "speak" | "listen" | "pause"; text: string };

const RESCUE_TABS: Array<{ label: string; lines: RescueLine[] }> = [
  {
    label: "He opened first",
    lines: [
      { type: "listen", text: "He just gave you Level 1 pain free. Do not pitch. Go deeper." },
      { type: "speak", text: "That's actually what caught my attention when I was looking at your account." },
      { type: "speak", text: "Tell me more about that — what happened exactly?" },
      { type: "pause", text: "..." },
      { type: "speak", text: "And what did that end up costing you — between the downtime and everything else that came with it?" },
      { type: "pause", text: "..." },
      { type: "speak", text: "How often has something like that happened in the last year?" },
      { type: "listen", text: "Get a number. Frequency times cost = the business pain." },
    ],
  },
  {
    label: "He's defensive",
    lines: [
      { type: "listen", text: "Do not defend. Do not re-pitch. Acknowledge and redirect." },
      { type: "speak", text: "Yeah, I know — I saw the notes from before." },
      { type: "speak", text: "I'm not here to re-run that conversation." },
      { type: "speak", text: "What I'm curious about is whether anything has changed since then." },
      { type: "pause", text: "..." },
      { type: "speak", text: "A lot of the fleets we work with ended up in a different place 12 to 18 months later — once they added up what the workarounds were actually costing them." },
      { type: "speak", text: "Has the situation on the ground stayed pretty much the same, or has anything shifted?" },
      { type: "pause", text: "..." },
      { type: "listen", text: "Any answer works. 'Same' = opportunity to quantify. 'Changed' = new pain to explore." },
    ],
  },
  {
    label: "Lost the thread",
    lines: [
      { type: "listen", text: "Bridge back through his words. Never hard-pivot." },
      { type: "speak", text: "That's interesting — and it actually connects to something I wanted to ask you about." },
      { type: "speak", text: "When situations like that happen on a remote site — how does your team find out about it, and how quickly can you respond?" },
      { type: "pause", text: "..." },
      { type: "speak", text: "Help me understand — when you think about the biggest headaches day to day, what's taking up the most time that probably shouldn't be?" },
      { type: "pause", text: "..." },
      { type: "speak", text: "I want to make sure I'm asking the right questions before I say anything else. One more thing I want to understand —" },
    ],
  },
  {
    label: "Proof points",
    lines: [
      { type: "listen", text: "Lead with the pattern. Then ask if it resonates." },
      { type: "speak", text: "Something we see a lot with construction fleets operating in remote areas —" },
      { type: "speak", text: "it's usually not one big theft that breaks the budget. It's the cumulative downtime." },
      { type: "speak", text: "A piece of equipment goes missing for two days, the crew can't work, the jobsite stalls." },
      { type: "speak", text: "By the time they added it up — one season of that had cost them more than two years of a connected system would have." },
      { type: "speak", text: "Has that pattern shown up for you at all?" },
      { type: "pause", text: "..." },
      { type: "speak", text: "The other thing we see with smaller construction fleets —" },
      { type: "speak", text: "the admin burden is invisible until someone actually tracks it." },
      { type: "speak", text: "DVIRs, incident reports, maintenance logs — it's usually one or two people spending 8 to 10 hours a week on paperwork that could be automated." },
      { type: "speak", text: "Does that feel familiar at all?" },
      { type: "pause", text: "..." },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function TeleprompterMode({ session, answerSlots, onExit }: TeleprompterModeProps) {
  const lines = buildLines(answerSlots);
  const storageKey = `salesprep_tp_${session.id}`;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const touchStartRef = useRef<number>(0);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Rescue deck state
  const [rescueOpen, setRescueOpen] = useState(false);
  const [rescueTab, setRescueTab] = useState(0);
  const [rescueIndex, setRescueIndex] = useState(0);
  const [rescueOpacity, setRescueOpacity] = useState(1);
  const rescueTouchStart = useRef<number>(0);

  // Triple-tap section skip
  const lastThreeTaps = useRef<number[]>([]);

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.index === "number" && saved.index < lines.length) {
          setCurrentIndex(saved.index);
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ index: currentIndex }));
  }, [currentIndex, storageKey]);

  // Wake lock
  useEffect(() => {
    let wakeLock: { release: () => void } | null = null;
    const acquire = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<{ release: () => void }> } }).wakeLock.request("screen");
        }
      } catch { /* ignore */ }
    };
    acquire();
    return () => { wakeLock?.release(); };
  }, []);

  // Auto-advance for section lines
  useEffect(() => {
    clearTimeout(autoAdvanceTimer.current);
    const line = lines[currentIndex];
    if (line?.type === "section") {
      autoAdvanceTimer.current = setTimeout(() => {
        advance();
      }, 1500);
    }
    return () => clearTimeout(autoAdvanceTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const advance = useCallback(() => {
    if (currentIndex >= lines.length - 1) return;
    setOpacity(0);
    setTimeout(() => {
      setCurrentIndex((i) => Math.min(i + 1, lines.length - 1));
      setOpacity(1);
    }, 80);
  }, [currentIndex, lines.length]);

  const goBack = useCallback(() => {
    if (currentIndex <= 0) return;
    setOpacity(0);
    setTimeout(() => {
      setCurrentIndex((i) => Math.max(i - 1, 0));
      setOpacity(1);
    }, 80);
  }, [currentIndex]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dy = touchStartRef.current - e.changedTouches[0].clientY;
    if (dy > 40) advance();
    else if (dy < -40) goBack();
  };

  // Click zones with triple-tap section skip
  const handleClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const x = e.clientX - rect.left;
    const pctY = y / rect.height;
    const pctX = x / rect.width;

    // Triple-tap upper-left corner → skip to next section
    if (pctY < 0.25 && pctX < 0.3) {
      lastThreeTaps.current = [...lastThreeTaps.current, Date.now()].slice(-3);
      if (lastThreeTaps.current.length === 3) {
        const span = lastThreeTaps.current[2] - lastThreeTaps.current[0];
        if (span < 600) {
          const nextSection = lines.findIndex((l, i) => i > currentIndex && l.type === "section");
          if (nextSection > -1) { setCurrentIndex(nextSection); lastThreeTaps.current = []; return; }
        }
      }
      goBack();
      return;
    }

    if (pctY < 0.2) goBack();
    else advance();
  };

  // Rescue deck navigation
  const rescueAdvance = useCallback(() => {
    const tabLines = RESCUE_TABS[rescueTab]?.lines ?? [];
    if (rescueIndex >= tabLines.length - 1) return;
    setRescueOpacity(0);
    setTimeout(() => { setRescueIndex((i) => i + 1); setRescueOpacity(1); }, 80);
  }, [rescueTab, rescueIndex]);

  const rescueBack = useCallback(() => {
    if (rescueIndex <= 0) return;
    setRescueOpacity(0);
    setTimeout(() => { setRescueIndex((i) => i - 1); setRescueOpacity(1); }, 80);
  }, [rescueIndex]);

  // Current section color
  let sectionColor = "#888";
  for (let i = currentIndex; i >= 0; i--) {
    if (lines[i]?.type === "section" && lines[i].sectionColor) {
      sectionColor = lines[i].sectionColor!;
      break;
    }
  }

  const line = lines[currentIndex];
  const progressPct = lines.length > 0 ? ((currentIndex + 1) / lines.length) * 100 : 0;
  const isComplete = currentIndex >= lines.length - 1 && line?.type !== "section";

  if (isComplete && line?.type !== "section") {
    return (
      <div className="fixed inset-0 z-[60] bg-[#0A0A0F] flex flex-col items-center justify-center text-center px-6">
        <span className="text-[64px] text-emerald-400">✓</span>
        <p className="text-[18px] text-white/50 mt-4">Call complete</p>
        <button type="button" onClick={onExit} className="bg-[#FF6B4A] hover:bg-[#E85D3A] text-white font-semibold rounded-full px-8 py-3 text-[15px] transition-colors mt-8">
          Exit
        </button>
      </div>
    );
  }

  if (!line) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#0A0A0F] flex items-center justify-center px-6">
        <p className="text-white/30 text-sm">No teleprompter content available.</p>
        <button type="button" onClick={onExit} className="ml-4 text-sm text-[#FF6B4A]">Exit</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-[#0A0A0F] flex flex-col select-none">
      {/* Top bar */}
      <div className="h-[48px] flex items-center justify-between shrink-0">
        <button type="button" onClick={onExit} className="text-[12px] text-white/30 px-4 py-3 hover:text-white/60 transition-colors">
          ✕ Exit
        </button>
        <span className="text-[11px] text-white/20 font-mono px-4 tabular-nums">
          {currentIndex + 1} / {lines.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-white/5 shrink-0">
        <div className="h-full transition-all duration-150 ease-out" style={{ width: `${progressPct}%`, backgroundColor: `${sectionColor}80` }} />
      </div>

      {/* Content area */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-7 cursor-pointer"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="transition-opacity duration-150 ease-out max-w-[320px] text-center"
          style={{ opacity }}
        >
          {line.type === "speak" && (
            <p className="text-[26px] font-semibold text-white leading-[1.5] tracking-[-0.01em]">
              {renderBrackets(line.text)}
            </p>
          )}

          {line.type === "listen" && (
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: `${SECTION_COLORS.PERSONAL ?? "#F59E0B"}60` }}>
                LISTEN FOR
              </p>
              <p className="text-[17px] font-normal leading-[1.5]" style={{ color: "#F59E0B" }}>
                {line.text}
              </p>
            </div>
          )}

          {line.type === "pause" && (
            <p className="text-[32px] text-white/15 tracking-[0.3em]">· · ·</p>
          )}

          {line.type === "section" && (
            <div>
              <div className="h-px mb-3" style={{ backgroundColor: `${line.sectionColor}4D` }} />
              <p className="text-[11px] font-bold uppercase tracking-widest py-3" style={{ color: line.sectionColor }}>
                {line.sectionName}
              </p>
              <div className="h-px mt-3" style={{ backgroundColor: `${line.sectionColor}4D` }} />
            </div>
          )}
        </div>

        {/* Barely-visible advance indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <span className="text-[24px] text-white/10 animate-pulse">›</span>
        </div>
      </div>

      {/* ⚡ Rescue deck button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setRescueOpen(true); setRescueIndex(0); setRescueOpacity(1); }}
        className="fixed bottom-6 left-5 z-[61] w-11 h-11 rounded-full bg-[#1E1F2B] border border-[#2A2B3D] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
      >
        ⚡
      </button>

      {/* Rescue deck overlay */}
      {rescueOpen && (() => {
        const tab = RESCUE_TABS[rescueTab];
        const rl = tab?.lines[rescueIndex];
        return (
          <div
            className="fixed inset-0 z-[62] flex flex-col justify-end"
            onClick={() => setRescueOpen(false)}
          >
            <div
              className="bg-[#0D0D14] rounded-t-2xl"
              style={{ height: "75%", animation: "action-reveal 200ms ease-out forwards" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <p className="text-[14px] font-semibold text-white/60 uppercase tracking-wider">⚡ Rescue Deck</p>
                <button type="button" onClick={() => setRescueOpen(false)} className="text-white/30 hover:text-white/60 text-sm">✕</button>
              </div>

              {/* Tab pills */}
              <div className="flex gap-2 px-5 pb-3 overflow-x-auto scrollbar-none">
                {RESCUE_TABS.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setRescueTab(i); setRescueIndex(0); setRescueOpacity(1); }}
                    className={`text-[12px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                      rescueTab === i ? "bg-white/15 text-white" : "bg-white/5 text-white/40 hover:text-white/60"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Back to call */}
              <div className="px-5 pb-3">
                <button
                  type="button"
                  onClick={() => setRescueOpen(false)}
                  className="text-[12px] text-[#FF6B4A] hover:text-[#FF8B70] transition-colors"
                >
                  ↩ Back to call
                </button>
              </div>

              {/* Rescue content */}
              <div
                className="flex-1 flex flex-col items-center justify-center px-7 cursor-pointer"
                style={{ minHeight: "50%" }}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const pct = (e.clientY - rect.top) / rect.height;
                  if (pct < 0.2) rescueBack(); else rescueAdvance();
                }}
              >
                <div className="transition-opacity duration-150 ease-out max-w-[300px] text-center" style={{ opacity: rescueOpacity }}>
                  {rl?.type === "speak" && (
                    <p className="text-[24px] font-semibold text-white leading-[1.5]">{rl.text}</p>
                  )}
                  {rl?.type === "listen" && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-amber-500/60 mb-2">LISTEN FOR</p>
                      <p className="text-[16px] text-amber-400 leading-[1.5]">{rl.text}</p>
                    </div>
                  )}
                  {rl?.type === "pause" && (
                    <p className="text-[28px] text-white/15 tracking-[0.3em]">· · ·</p>
                  )}
                </div>

                {/* Progress dots */}
                <div className="flex gap-1 mt-6">
                  {(tab?.lines ?? []).map((_, i) => (
                    <div key={i} className={`rounded-full transition-all ${i === rescueIndex ? "w-4 h-1.5 bg-white/50" : "w-1.5 h-1.5 bg-white/15"}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
