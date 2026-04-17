"use client";

import { useState, useEffect, useCallback } from "react";

interface LiveCard {
  id: string;
  category: string;
  title: string;
  content: string;
  sub?: string;
  badge?: string;
  badgeColor?: string;
}

interface LiveInterviewModeProps {
  sessionId: string;
  kit: {
    weakness_audit: unknown[];
    hard_questions: unknown[];
    timing_guide: unknown[];
    roleplay_script: unknown;
    cheat_sheet: unknown;
    interviewers: Array<{
      name: string;
      title: string;
      profile: Record<string, unknown>;
    }>;
  };
}

export default function LiveInterviewMode({ sessionId: _sessionId, kit }: LiveInterviewModeProps) {
  const [cards, setCards] = useState<LiveCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<string>("all");

  // Build flat card list from kit
  useEffect(() => {
    const allCards: LiveCard[] = [];

    // Interviewer cards
    kit.interviewers.forEach((i) => {
      allCards.push({
        id: `person-${i.name}`,
        category: "person",
        title: i.name,
        content: (i.profile.how_to_talk_to_them as string) ?? "",
        sub: (i.profile.watch_outs as string) ?? "",
        badge: i.title,
      });
    });

    // Weak spots
    const weakSpots = Array.isArray(kit.weakness_audit)
      ? kit.weakness_audit
      : ((kit.weakness_audit as Record<string, unknown>)?.weak_spots as unknown[]) ?? [];

    weakSpots.forEach((w: unknown, i) => {
      const ws = w as Record<string, unknown>;
      allCards.push({
        id: `weak-${i}`,
        category: "weak",
        title: (ws.likely_question as string) ?? "",
        content: (ws.model_answer as string) ?? "",
        sub: `Avoid: ${(ws.trap_to_avoid as string) ?? ""}`,
        badge: (ws.severity as string) ?? "medium",
        badgeColor: ws.severity === "high" ? "#E24B4A" : "#EF9F27",
      });
    });

    // Hard questions
    const questions = Array.isArray(kit.hard_questions) ? kit.hard_questions : [];
    questions.forEach((q: unknown, i) => {
      const qu = q as Record<string, unknown>;
      allCards.push({
        id: `q-${i}`,
        category: "question",
        title: (qu.question as string) ?? "",
        content: (qu.model_answer as string) ?? "",
        sub: `Trap: ${(qu.trap_to_avoid as string) ?? ""}`,
        badge: (qu.asked_by as string) ?? "",
      });
    });

    // Timing cards
    const timing = Array.isArray(kit.timing_guide) ? kit.timing_guide : [];
    timing.forEach((t: unknown, i) => {
      const ti = t as Record<string, unknown>;
      allCards.push({
        id: `timing-${i}`,
        category: "timing",
        title: `${ti.time_range} — ${ti.slide}`,
        content: (ti.key_move as string) ?? "",
        sub: (ti.tip as string) ?? "",
        badge: (ti.risk as string) ?? "",
      });
    });

    // Cheat sheet
    const cheatData = kit.cheat_sheet as Record<string, unknown>;
    const points = (cheatData?.points as Array<Record<string, unknown>>) ?? [];
    points.forEach((p, i) => {
      allCards.push({
        id: `cheat-${i}`,
        category: "cheat",
        title: (p.point as string) ?? "",
        content: (p.detail as string) ?? "",
        badge: (p.who_its_for as string) ?? "both",
      });
    });

    // Permission to stop — always last
    if (cheatData?.permission_to_stop) {
      allCards.push({
        id: "permission",
        category: "cheat",
        title: "You\u2019re ready.",
        content: cheatData.permission_to_stop as string,
      });
    }

    setCards(allCards);
  }, [kit]);

  const filtered = filter === "all" ? cards : cards.filter((c) => c.category === filter);

  const current = filtered[currentIndex];
  const progress = filtered.length > 0 ? Math.round(((currentIndex + 1) / filtered.length) * 100) : 0;

  const next = useCallback(
    () => setCurrentIndex((i) => Math.min(i + 1, filtered.length - 1)),
    [filtered.length]
  );
  const prev = useCallback(
    () => setCurrentIndex((i) => Math.max(i - 1, 0)),
    []
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  const FILTERS = [
    { key: "all", label: "All" },
    { key: "person", label: "People" },
    { key: "weak", label: "Weak spots" },
    { key: "question", label: "Questions" },
    { key: "timing", label: "Timing" },
    { key: "cheat", label: "Cheat sheet" },
  ] as const;

  return (
    <div
      style={{
        background: "#0A0A0F",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        WebkitUserSelect: "none",
        color: "#fff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Filter strip */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "12px 16px",
          borderBottom: "0.5px solid rgba(255,255,255,0.08)",
          overflowX: "auto",
          flexShrink: 0,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setCurrentIndex(0);
            }}
            style={{
              padding: "4px 12px",
              borderRadius: 100,
              border: `0.5px solid ${filter === f.key ? "#E8735A" : "rgba(255,255,255,0.15)"}`,
              background: filter === f.key ? "rgba(232,115,90,0.15)" : "transparent",
              color: filter === f.key ? "#E8735A" : "rgba(255,255,255,0.5)",
              fontSize: 11,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: "rgba(255,255,255,0.08)", flexShrink: 0 }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "#E8735A",
            transition: "width 0.2s ease-out",
          }}
        />
      </div>

      {/* Main card area — tap to advance */}
      <div
        style={{
          flex: 1,
          padding: "28px 20px",
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
        }}
        onClick={next}
      >
        {current ? (
          <>
            {/* Category + badge */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
              <span
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.3)",
                  fontWeight: 500,
                }}
              >
                {currentIndex + 1} of {filtered.length}
              </span>
              {current.badge && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 100,
                    background: current.badgeColor ? `${current.badgeColor}22` : "rgba(255,255,255,0.08)",
                    color: current.badgeColor ?? "rgba(255,255,255,0.4)",
                    border: `0.5px solid ${current.badgeColor ?? "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  {current.badge}
                </span>
              )}
            </div>

            {/* Title — the question or heading */}
            <div
              style={{
                fontSize: 20,
                fontWeight: 500,
                color: "#fff",
                lineHeight: 1.35,
                marginBottom: 20,
              }}
            >
              {current.title}
            </div>

            {/* Content — the answer */}
            <div
              style={{
                fontSize: 15,
                color: "rgba(255,255,255,0.8)",
                lineHeight: 1.75,
                fontFamily: "Georgia, 'Times New Roman', serif",
                flex: 1,
              }}
            >
              {current.content}
            </div>

            {/* Sub — trap / tip */}
            {current.sub && (
              <div
                style={{
                  marginTop: 20,
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 10,
                  borderLeft: "2px solid rgba(232,115,90,0.4)",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.45)",
                  lineHeight: 1.5,
                }}
              >
                {current.sub}
              </div>
            )}
          </>
        ) : (
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>No cards in this category</div>
        )}
      </div>

      {/* Navigation — tap zones */}
      <div
        style={{
          display: "flex",
          borderTop: "0.5px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
          paddingBottom: "env(safe-area-inset-bottom, 0)",
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          disabled={currentIndex === 0}
          style={{
            flex: 1,
            padding: "16px",
            background: "transparent",
            border: "none",
            borderRight: "0.5px solid rgba(255,255,255,0.08)",
            color: currentIndex === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.5)",
            fontSize: 13,
            cursor: currentIndex === 0 ? "default" : "pointer",
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Previous
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          disabled={currentIndex === filtered.length - 1}
          style={{
            flex: 1,
            padding: "16px",
            background: "transparent",
            border: "none",
            color: currentIndex === filtered.length - 1 ? "rgba(255,255,255,0.15)" : "#E8735A",
            fontSize: 13,
            cursor: currentIndex === filtered.length - 1 ? "default" : "pointer",
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
