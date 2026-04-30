"use client";

import { useState, useEffect, useCallback } from "react";
import type { LiveCard } from "@/lib/live-mode/build-cards";

type Phase = "all" | "people" | "timing" | "weak" | "question" | "roleplay" | "cheat";

const PHASE_LABELS: Record<Phase, string> = {
  all: "All",
  people: "People",
  timing: "Timing",
  weak: "Weak spots",
  question: "Questions",
  roleplay: "Roleplay",
  cheat: "Cheat sheet",
};

export default function LiveInterviewMode({ cards }: { cards: LiveCard[] }) {
  const [phase, setPhase] = useState<Phase>("all");
  const [index, setIndex] = useState(0);

  const filtered = phase === "all" ? cards : cards.filter((c) => c.phase === phase);

  const current = filtered[index];
  const isFirst = index === 0;
  const isLast = index === filtered.length - 1;

  const next = useCallback(() => {
    if (!isLast) setIndex((i) => i + 1);
  }, [isLast]);

  const prev = useCallback(() => {
    if (!isFirst) setIndex((i) => i - 1);
  }, [isFirst]);

  // Reset index when phase changes
  useEffect(() => {
    // Resetting child state on parent prop change is a documented React pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(0);
  }, [phase]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  // Swipe support (mobile)
  useEffect(() => {
    let startX = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx < -50) next();
      if (dx > 50) prev();
    };
    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [next, prev]);

  return (
    <div
      style={{
        background: "#0A0A0F",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Filter strip */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "12px 14px",
          borderBottom: "0.5px solid rgba(255,255,255,0.08)",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          flexShrink: 0,
        }}
      >
        {(Object.keys(PHASE_LABELS) as Phase[]).map((p) => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            style={{
              padding: "5px 13px",
              borderRadius: 100,
              border: `0.5px solid ${phase === p ? "#E8735A" : "rgba(255,255,255,0.15)"}`,
              background: phase === p ? "rgba(232,115,90,0.12)" : "transparent",
              color: phase === p ? "#E8735A" : "rgba(255,255,255,0.45)",
              fontSize: 11,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            {PHASE_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 2,
          background: "rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            height: "100%",
            background: "#E8735A",
            width:
              filtered.length > 0
                ? `${Math.round(((index + 1) / filtered.length) * 100)}%`
                : "0%",
            transition: "width 0.2s",
          }}
        />
      </div>

      {/* Card area — tap to advance */}
      <div
        onClick={next}
        style={{
          flex: 1,
          padding: "28px 20px 20px",
          display: "flex",
          flexDirection: "column",
          cursor: isLast ? "default" : "pointer",
          userSelect: "none",
        }}
      >
        {current ? (
          <>
            {/* Counter + badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.25)",
                  letterSpacing: "0.05em",
                }}
              >
                {index + 1} / {filtered.length}
              </span>
              {current.badge && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 100,
                    border: `0.5px solid ${current.badgeColor ?? "rgba(255,255,255,0.12)"}`,
                    background: current.badgeColor
                      ? `${current.badgeColor}18`
                      : "rgba(255,255,255,0.06)",
                    color: current.badgeColor ?? "rgba(255,255,255,0.4)",
                  }}
                >
                  {current.badge}
                </span>
              )}
            </div>

            {/* Title */}
            <p
              style={{
                fontSize: 19,
                fontWeight: 500,
                color: "#ffffff",
                lineHeight: 1.35,
                marginBottom: 18,
              }}
            >
              {current.title}
            </p>

            {/* Body */}
            <p
              style={{
                fontSize: 15,
                color: "rgba(255,255,255,0.78)",
                lineHeight: 1.78,
                fontFamily: "Georgia, serif",
                flex: 1,
              }}
            >
              {current.body}
            </p>

            {/* Sub — trap / tip */}
            {current.sub && (
              <div
                style={{
                  marginTop: 20,
                  padding: "11px 14px",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 10,
                  borderLeft: "2px solid rgba(232,115,90,0.35)",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.42)",
                  lineHeight: 1.55,
                }}
              >
                {current.sub}
              </div>
            )}
          </>
        ) : (
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 14 }}>No cards in this section</p>
        )}
      </div>

      {/* Bottom nav */}
      <div
        style={{
          display: "flex",
          borderTop: "0.5px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          disabled={isFirst}
          style={{
            flex: 1,
            padding: "16px",
            background: "transparent",
            border: "none",
            borderRight: "0.5px solid rgba(255,255,255,0.08)",
            color: isFirst ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.4)",
            fontSize: 13,
            cursor: isFirst ? "default" : "pointer",
            fontFamily: "inherit",
          }}
        >
          ← Previous
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          disabled={isLast}
          style={{
            flex: 1,
            padding: "16px",
            background: "transparent",
            border: "none",
            color: isLast ? "rgba(255,255,255,0.12)" : "#E8735A",
            fontSize: 13,
            cursor: isLast ? "default" : "pointer",
            fontFamily: "inherit",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
