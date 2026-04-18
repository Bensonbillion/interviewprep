"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const STEPS = [
  { id: "read_submission", label: "Reading your take-home submission" },
  { id: "research_interviewers", label: "Researching the people in the room" },
  { id: "find_weak_spots", label: "Finding the 3 hardest questions they\u2019ll ask about your submission" },
  { id: "build_questions", label: "Building your full Q&A prep" },
  { id: "timing_guide", label: "Building your slide-by-slide timing guide" },
  { id: "roleplay", label: "Writing your 2-minute discovery roleplay script" },
  { id: "cheat_sheet", label: "Creating your live interview cheat sheet" },
];

export default function GeneratingPage() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function runGeneration() {
    setError(null);
    setCurrentStep(0);

    try {
      // Step 1: Fetch session to get interviewers + parent
      const sessionRes = await fetch(`/api/session/${sessionId}`);
      if (!sessionRes.ok) throw new Error("Could not load session");
      const sessionData = await sessionRes.json();
      const session = sessionData.session ?? sessionData;

      // Step 2: Research interviewers (if any)
      const interviewerList = session.interviewers ?? [];
      if (interviewerList.length > 0) {
        setCurrentStep(1);
        await fetch("/api/interviewers/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            interviewers: interviewerList
              .filter((iv: { name?: string }) => iv.name?.trim())
              .map((iv: { name: string; roleTitle?: string; title?: string }) => ({
                name: iv.name,
                title: iv.roleTitle ?? iv.title,
                company: session.companyName ?? session.company_name ?? "the company",
              })),
          }),
        });
      }

      // Steps 3-7: Generate kit
      setCurrentStep(2);

      const res = await fetch("/api/defense/generate-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          parent_session_id: session.parentSessionId ?? session.parent_session_id,
        }),
      });

      if (!res.ok) throw new Error("Generation failed");

      // Animate through remaining steps while waiting
      for (let i = 3; i <= 6; i++) {
        await new Promise((r) => setTimeout(r, 800));
        setCurrentStep(i);
      }

      // Done — redirect to prep page
      await new Promise((r) => setTimeout(r, 600));
      router.push(`/prep/${sessionId}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    runGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: "4rem 1.5rem",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>
        Building your panel prep kit
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--text-secondary, #5C5347)",
          marginBottom: 32,
        }}
      >
        This takes about 60 seconds. We&apos;re reading your actual submission and building your
        prep around it.
      </p>

      {/* Progress bar */}
      <div
        style={{
          height: 3,
          background: "var(--bg-secondary, #E8E4DF)",
          borderRadius: 2,
          marginBottom: 32,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round((currentStep / STEPS.length) * 100)}%`,
            background: "#E8735A",
            borderRadius: 2,
            transition: "width 0.5s ease",
          }}
        />
      </div>

      {/* Step list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {STEPS.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          const pending = i > currentStep;

          return (
            <div
              key={step.id}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                opacity: pending ? 0.35 : 1,
              }}
            >
              {/* Status dot */}
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: done
                    ? "#1D9E75"
                    : active
                      ? "#E8735A"
                      : "var(--color-border-tertiary, #D4CFC9)",
                }}
              />

              <span
                style={{
                  fontSize: 14,
                  color: active
                    ? "var(--text-primary, #1C1713)"
                    : done
                      ? "var(--text-secondary, #5C5347)"
                      : "var(--text-tertiary, #C5BDB5)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                {step.label}
                {done && <span style={{ color: "#1D9E75", marginLeft: 6 }}>&#x2713;</span>}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <div
          style={{
            marginTop: 24,
            padding: "12px 16px",
            background: "rgba(239,68,68,0.06)",
            borderRadius: 10,
            fontSize: 13,
            color: "#dc2626",
          }}
        >
          Something went wrong: {error}
          <br />
          <button
            onClick={runGeneration}
            style={{
              textDecoration: "underline",
              cursor: "pointer",
              background: "none",
              border: "none",
              color: "inherit",
              fontFamily: "inherit",
              fontSize: "inherit",
              padding: 0,
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
