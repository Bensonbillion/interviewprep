"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface PanelTriggerBannerProps {
  sessionId: string;
  companyName: string;
}

function getDismissKey(sessionId: string) {
  return `sp_panel_banner_dismissed_${sessionId}`;
}

export default function PanelTriggerBanner({ sessionId, companyName }: PanelTriggerBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(getDismissKey(sessionId));
    setDismissed(stored === "true");
  }, [sessionId]);

  const handleDismiss = () => {
    localStorage.setItem(getDismissKey(sessionId), "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      style={{
        background: "rgba(232,115,90,0.06)",
        border: "1px solid rgba(232,115,90,0.25)",
        borderRadius: 12,
        padding: "20px 24px",
        marginTop: 32,
      }}
    >
      <p
        style={{
          fontSize: 16,
          fontWeight: 500,
          color: "var(--text-primary, #1C1713)",
          marginBottom: 6,
        }}
      >
        Got invited to the panel?
      </p>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary, #5C5347)",
          lineHeight: 1.6,
          marginBottom: 16,
        }}
      >
        We&apos;ll read what you submitted for {companyName} and prep you specifically for questions
        about it — including real research on whoever&apos;s in the room.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() =>
            router.push(`/prep/new?type=presentation_defense&parent=${sessionId}`)
          }
          style={{
            padding: "9px 20px",
            background: "#E8735A",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Prep for my panel →
        </button>
        <button
          onClick={handleDismiss}
          style={{
            padding: "9px 16px",
            background: "transparent",
            color: "var(--text-secondary, #5C5347)",
            border: "0.5px solid var(--color-border-secondary, #E8E4DF)",
            borderRadius: 10,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Not yet
        </button>
      </div>
    </div>
  );
}
