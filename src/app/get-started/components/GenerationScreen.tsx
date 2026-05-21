"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { LogoIcon } from "@/components/Logo";
import type {
  ParsedResume,
  CompanyProfile,
  RelevanceMap,
  InterviewStage,
  RoleType,
  PrepSession,
  InterviewerInput,
  InterviewerDossier,
} from "@/types";
import { buildAnswerSlots } from "@/lib/session/answer-slots";
import { addToSessionList } from "@/lib/session/session-list";
import { trackEvent } from "@/lib/tracking/events";
import { getAttributionProperties } from "@/lib/tracking/attribution";

function buildSteps(hasInterviewers: boolean) {
  // The priority-answer pre-gen and "Finalizing your prep kit" steps
  // previously here are removed — no answer is generated before the
  // candidate has fed the engine their lived competitive truth in the
  // Insight Interview. "Mapping your strategic angle" covers session
  // save + Positioning Engine as one user-visible step (the save is
  // plumbing the user doesn't care about).
  return [
    "Verifying your resume",
    "Researching the company",
    "Mapping your experience to the role",
    ...(hasInterviewers ? ["Researching your interviewer"] : []),
    "Mapping your strategic angle",
    "Ready for the insight interview",
  ];
}

interface GenerationScreenProps {
  resume: ParsedResume;
  roleType: RoleType;
  companyName: string;
  companyUrl: string;
  targetRole: string;
  jobDescription: string;
  stage: InterviewStage;
  interviewDate?: string;
  interviewers?: InterviewerInput[];
  personalContext?: string;
  mockCallType?: string | null;
  mockCallPersona?: string | null;
  interviewerName?: string;
  interviewContext?: string;
  mockAccountName?: string;
  mockAccountContext?: string;
  previousRoundContext?: string;
  isFirstRound?: boolean;
}

export function GenerationScreen({
  resume,
  roleType,
  companyName,
  companyUrl,
  targetRole,
  jobDescription,
  stage,
  interviewDate,
  interviewers,
  personalContext,
  mockCallType,
  mockCallPersona,
  interviewerName,
  interviewContext,
  mockAccountName,
  mockAccountContext,
  previousRoundContext,
  isFirstRound,
}: GenerationScreenProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const hasStarted = useRef(false);
  const STEPS = buildSteps(!!(interviewers && interviewers.length > 0) || !!interviewerName?.trim());

  const complete = (step: number) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  };

  const advance = (toStep: number) => {
    complete(toStep - 1);
    setCurrentStep(toStep);
  };

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async () => {
    try {
      // Step 0: resume verified (instant)
      await new Promise((r) => setTimeout(r, 600));

      // Step 1: research company
      advance(1);
      const companyRes = await fetch("/api/company-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, companyUrl, jobDescription, targetRole }),
      });
      const companyData = await companyRes.json();
      if (!companyRes.ok) throw new Error(companyData.error ?? "Company research failed");
      const company: CompanyProfile = companyData.company;

      // Step 2: cross-reference resume
      advance(2);
      const crossRefRes = await fetch("/api/cross-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, company, jobDescription, targetRole }),
      });
      const crossRefData = await crossRefRes.json();
      if (!crossRefRes.ok) throw new Error(crossRefData.error ?? "Cross-reference failed");
      const relevanceMap: RelevanceMap = crossRefData.relevanceMap;

      // Build session object
      const sessionId = crypto.randomUUID();
      const mcType = (mockCallType as PrepSession["mockCallType"]) ?? undefined;
      const answerSlots = buildAnswerSlots(stage, resume.backgroundType, roleType, mcType);

      // Merge discovery interviewer name into formal interviewers array
      const allInterviewers = [...(interviewers ?? [])];
      if (interviewerName?.trim() && !allInterviewers.some((iv) => iv.name.toLowerCase() === interviewerName.trim().toLowerCase())) {
        allInterviewers.push({ name: interviewerName.trim(), linkedinUrl: "", roleTitle: "" });
      }

      const session: PrepSession = {
        id: sessionId,
        resume,
        jobDescription,
        companyName,
        companyUrl,
        targetRole,
        roleType,
        stage,
        company,
        relevanceMap,
        answerSlots,
        createdAt: Date.now(),
        interviewDate: interviewDate ?? undefined,
        interviewers: allInterviewers,
        interviewerDossiers: [],
        personalContext: personalContext ?? undefined,
        mockCallType: mcType,
        mockCallPersona: (mockCallPersona as PrepSession["mockCallPersona"]) ?? undefined,
        interviewerName: interviewerName?.trim() || undefined,
        interviewContext: interviewContext?.trim() || undefined,
        mockAccountName: mockAccountName?.trim() || undefined,
        mockAccountContext: mockAccountContext?.trim() || undefined,
        previousRoundContext: previousRoundContext?.trim() || undefined,
        isFirstRound: isFirstRound ?? true,
      };

      // Step 3 (optional): research interviewers
      if (allInterviewers.length > 0) {
        advance(3);
        const dossiers: InterviewerDossier[] = [];
        for (const iv of allInterviewers) {
          try {
            const ivRes = await fetch("/api/interviewer/research", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: iv.name,
                linkedinUrl: iv.linkedinUrl || undefined,
                roleTitle: iv.roleTitle || undefined,
                companyName,
                sessionId,
              }),
            });
            if (ivRes.ok) {
              const ivData = await ivRes.json();
              if (ivData.dossier) dossiers.push(ivData.dossier as InterviewerDossier);
            }
          } catch {
            // Non-fatal — interviewer research is best-effort
          }
        }
        session.interviewerDossiers = dossiers;
      }

      // ── Mapping your strategic angle (one user-visible step): save the
      //   session to Supabase, then run the Positioning Engine against
      //   the saved row.
      //
      //   Order matters. positioning_briefs.session_id FKs to
      //   prep_sessions(id), so the engine's upsert needs the row to
      //   exist. session/save is awaited (not fire-and-forget for the
      //   first time in this flow) because the engine immediately needs
      //   what it writes. Local sessionStorage + session-list write
      //   happen alongside the network save for fast resume on refresh.
      const angleStep = interviewers && interviewers.length > 0 ? 4 : 3;
      advance(angleStep);
      sessionStorage.setItem(`session-${sessionId}`, JSON.stringify(session));
      addToSessionList({
        id: sessionId,
        companyName,
        targetRole,
        roleType,
        stage,
        createdAt: session.createdAt,
        interviewDate: interviewDate ?? undefined,
      });
      const saveRes = await fetch("/api/session/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sessionData: session,
          companyName,
          interviewDate: interviewDate ?? undefined,
        }),
      });
      if (!saveRes.ok) {
        throw new Error("Failed to save session — cannot run positioning engine without a saved row.");
      }

      // Positioning Engine — classifier + competitive synthesis +
      // candidate hook. For competitive types this is ~8–12s cold,
      // ~2–3s warm cache. Best-effort: failure leaves the session
      // without a positioning brief, which the Insight Interview
      // surfaces as an empty interrogation_lines set + auto-advance
      // past the step (per §8 for switcher / no-brief sessions).
      try {
        await fetch("/api/positioning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
      } catch {
        // Engine writes its own audit log on failure; UI continues.
      }

      // Deduct 1 credit (best-effort).
      await fetch("/api/user/spend-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {/* non-blocking */});

      trackEvent({
        name: "prep_kit_created",
        properties: {
          company: companyName,
          role: targetRole,
          stage,
          ...getAttributionProperties(),
        },
      });

      // ── Done — hand off to the Insight Interview route. ──
      //   The priority-answer pre-gen that used to fire here has moved
      //   to the insight-complete handler (POST /api/insight-interview/
      //   complete) — no answer is generated before the candidate has
      //   fed the engine their lived competitive truth.
      advance(STEPS.length - 1);
      await new Promise((r) => setTimeout(r, 600));

      localStorage.removeItem("sp_gs_details");

      router.push(`/get-started/insight?session=${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  const retryGeneration = () => {
    setError("");
    setCurrentStep(0);
    setCompletedSteps(new Set());
    hasStarted.current = false;
    run();
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-[#DBEAFE] p-8 shadow-[0_4px_24px_rgba(74,122,255,0.08)]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <LogoIcon size="lg" theme="light" />
            </div>
            <p className="text-xl font-bold text-[#0F172A] mt-2">Building your prep kit</p>
            <p className="text-sm text-[#64748B] mt-1">
              Personalized for{" "}
              <span className="font-medium text-[#0F172A]">{companyName}</span> ·{" "}
              <span className="font-medium text-[#0F172A]">{targetRole}</span>
            </p>
          </div>

          {/* Step list */}
          <div className="space-y-2">
            {STEPS.map((stepLabel, i) => {
              const isCompleted = completedSteps.has(i);
              const isActive = currentStep === i && !isCompleted;

              return (
                <div
                  key={stepLabel}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-300 ${
                    isActive ? "bg-[#EFF6FF]" : ""
                  }`}
                >
                  {isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 text-[#4A7AFF] animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-[#DBEAFE] flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm transition-colors ${
                      isCompleted
                        ? "text-[#059669] font-medium"
                        : isActive
                        ? "text-[#1D4ED8] font-semibold"
                        : "text-[#94A3B8]"
                    }`}
                  >
                    {stepLabel}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error state */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-600 mb-2">{error}</p>
              <button
                type="button"
                onClick={retryGeneration}
                className="text-xs font-medium text-red-500 underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
