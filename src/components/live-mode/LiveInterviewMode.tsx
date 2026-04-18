"use client";

import { useState, useEffect, useCallback } from "react";
import type { LiveCard } from "@/lib/live-mode/build-cards";

interface LiveInterviewModeProps {
  sessionId: string;
  cards: LiveCard[];
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "people", label: "People" },
  { key: "timing", label: "Timing" },
  { key: "weak", label: "Weak spots" },
  { key: "question", label: "Questions" },
  { key: "roleplay", label: "Roleplay" },
  { key: "cheat", label: "Cheat sheet" },
] as const;

export default function LiveInterviewMode({ cards }: LiveInterviewModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? cards : cards.filter((c) => c.phase === filter);
  const current = filtered[currentIndex];
  const progress = filtered.length > 0 ? Math.round(((currentIndex + 1) / filtered.length) * 100) : 0;

  const next = useCallback(
    () => setCurrentIndex((i) => Math.min(i + 1, filtered.length - 1)),
    [filtered.length]
  );
  const prev = useCallback(() => setCurrentIndex((i) => Math.max(i - 1, 0)), []);

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
            {/* Counter + badge */}
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

            {/* Title */}
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

            {/* Body */}
            <div
              style={{
                fontSize: 15,
                color: "rgba(255,255,255,0.8)",
                lineHeight: 1.75,
                fontFamily: "Georgia, 'Times New Roman', serif",
                flex: 1,
              }}
            >
              {current.body}
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

      {/* Navigation */}
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
