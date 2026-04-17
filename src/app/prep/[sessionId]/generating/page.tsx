"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  { id: "read_submission", label: "Reading your take-home submission" },
  { id: "research_interviewers", label: "Researching the people in the room" },
  { id: "find_weak_spots", label: "Finding the 3 hardest questions they\u2019ll ask about your submission" },
  { id: "build_questions", label: "Building your full Q&A prep" },
  { id: "timing_guide", label: "Building your slide-by-slide timing guide" },
  { id: "roleplay", label: "Writing your 2-minute discovery roleplay script" },
  { id: "cheat_sheet", label: "Creating your live interview cheat sheet" },
];

export default function GeneratingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setSessionId(p.sessionId));
  }, [params]);

  const runGeneration = useCallback(async () => {
    if (!sessionId) return;
    setError(null);
    setCurrentStep(0);

    try {
      // Step 0: Read submission — fetch session to get interviewers + parent
      const sessionRes = await fetch(`/api/session/${sessionId}`);
      if (!sessionRes.ok) throw new Error("Could not load session");
      const sessionData = await sessionRes.json();

      const session = sessionData.session ?? sessionData;
      const parentId = session.parentSessionId ?? session.parent_session_id ?? null;
      const companyName = session.companyName ?? session.company_name ?? "the company";
      const sessionInterviewers = session.interviewers ?? [];

      setCurrentStep(1);

      // Step 1: Research interviewers (if any)
      if (sessionInterviewers.length > 0) {
        try {
          await fetch("/api/interviewers/research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: sessionId,
              interviewers: sessionInterviewers
                .filter((iv: { name?: string }) => iv.name?.trim())
                .map((iv: { name: string; roleTitle?: string; title?: string }) => ({
                  name: iv.name,
                  title: iv.roleTitle ?? iv.title ?? undefined,
                  company: companyName,
                })),
            }),
          });
        } catch {
          // Non-fatal — continue without interviewer research
          console.warn("Interviewer research failed (non-fatal)");
        }
      }

      // Steps 2-6: Generate defense kit
      setCurrentStep(2);

      // Start the kit generation (this takes ~60-90 seconds)
      const kitPromise = fetch("/api/defense/generate-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          parent_session_id: parentId,
        }),
      });

      // Animate through steps while waiting for generation
      const stepAnimation = async () => {
        for (let i = 3; i <= 6; i++) {
          await new Promise((r) => setTimeout(r, 8000 + Math.random() * 4000));
          setCurrentStep(i);
        }
      };

      const [kitRes] = await Promise.all([kitPromise, stepAnimation()]);

      if (!kitRes.ok) {
        const errData = await kitRes.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? "Generation failed");
      }

      // Done �� brief pause then redirect
      setCurrentStep(STEPS.length);
      await new Promise((r) => setTimeout(r, 800));
      router.push(`/prep/${sessionId}`);
    } catch (err) {
      setError((err as Error).message ?? "Something went wrong");
    }
  }, [sessionId, router]);

  // Auto-start on mount (once)
  useEffect(() => {
    if (sessionId && !started.current) {
      started.current = true;
      runGeneration();
    }
  }, [sessionId, runGeneration]);

  return (
    <main className="min-h-screen bg-[#F0F7FF] px-4">
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "4rem 0" }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "#1C1713", marginBottom: 8 }}>
          Building your panel prep kit
        </h1>
        <p style={{ fontSize: 14, color: "#5C5347", marginBottom: 32 }}>
          This takes about 60 seconds. We&apos;re reading your actual submission and building your
          prep around it.
        </p>

        {/* Progress bar */}
        <div
          style={{
            height: 3,
            background: "#E8E4DF",
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
                  transition: "opacity 0.3s ease",
                }}
              >
                {/* Status indicator */}
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: done ? "#1D9E75" : active ? "#E8735A" : "#D4CFC9",
                    transition: "background 0.3s ease",
                    ...(active
                      ? {
                          boxShadow: "0 0 0 3px rgba(232,115,90,0.2)",
                          animation: "pulse 1.5s ease-in-out infinite",
                        }
                      : {}),
                  }}
                />

                <span
                  style={{
                    fontSize: 14,
                    color: active ? "#1C1713" : done ? "#5C5347" : "#C5BDB5",
                    fontWeight: active ? 500 : 400,
                    transition: "color 0.3s ease",
                  }}
                >
                  {step.label}
                  {done && <span style={{ color: "#1D9E75", marginLeft: 6 }}>&#x2713;</span>}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error state */}
        {error && (
          <div
            style={{
              marginTop: 24,
              padding: "12px 16px",
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: 10,
              fontSize: 13,
              color: "#dc2626",
              lineHeight: 1.6,
            }}
          >
            Something went wrong: {error}
            <br />
            <button
              onClick={() => {
                started.current = false;
                runGeneration();
              }}
              style={{
                textDecoration: "underline",
                cursor: "pointer",
                background: "none",
                border: "none",
                color: "inherit",
                fontFamily: "inherit",
                fontSize: "inherit",
                padding: 0,
                marginTop: 4,
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Pulse animation for active step */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(232,115,90,0.2); }
          50% { box-shadow: 0 0 0 6px rgba(232,115,90,0.1); }
        }
      `}</style>
    </main>
  );
}
