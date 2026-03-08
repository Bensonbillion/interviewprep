"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
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
  return [
    "Verifying your resume",
    "Researching the company",
    "Mapping your experience to the role",
    ...(hasInterviewers ? ["Researching your interviewer"] : []),
    "Building your opener answer",
    "Finalizing your prep kit",
    "Your prep kit is ready!",
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
}: GenerationScreenProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const hasStarted = useRef(false);
  const STEPS = buildSteps(!!(interviewers && interviewers.length > 0));

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
      const answerSlots = buildAnswerSlots(stage, resume.backgroundType, roleType);
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
        interviewers: interviewers ?? [],
        interviewerDossiers: [],
        personalContext: personalContext ?? undefined,
      };

      // Step 3 (optional): research interviewers
      if (interviewers && interviewers.length > 0) {
        advance(3);
        const dossiers: InterviewerDossier[] = [];
        for (const iv of interviewers) {
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

      // Pre-generate the priority answer for this stage (best-effort)
      // Only attempt if the slot actually exists for this stage.
      const STAGE_PRIORITY: Record<string, string> = {
        recruiter: "tell_me_about_yourself",
        hiring_manager: "resume_walkthrough", // HMs open with "walk me through your resume"
        role_play: "role_play_script",
        panel: "cheat_sheet",
        take_home: "cold_email",              // primary take-home deliverable
      };
      const priorityType = STAGE_PRIORITY[stage];
      const priorityStep = interviewers && interviewers.length > 0 ? 4 : 3;
      advance(priorityStep);
      const prioritySlotIdx = priorityType
        ? session.answerSlots.findIndex((s) => s.type === priorityType)
        : -1;
      if (prioritySlotIdx !== -1 && priorityType) {
        try {
          const priorityRes = await fetch("/api/generate-answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              answerType: priorityType,
              session,
            }),
          });
          if (priorityRes.ok) {
            const priorityData = await priorityRes.json();
            if (priorityData.content) {
              session.answerSlots[prioritySlotIdx] = {
                ...session.answerSlots[prioritySlotIdx],
                status: "unlocked",
                content: priorityData.content,
                answerId: priorityData.answerId,
              };
            }
          }
        } catch {
          // Priority pre-gen is best-effort — don't block session creation
        }
      }

      // Finalize & persist (second-to-last step)
      advance(STEPS.length - 2);
      sessionStorage.setItem(`session-${sessionId}`, JSON.stringify(session));
      // Save lightweight summary for sidebar/dashboard
      addToSessionList({
        id: sessionId,
        companyName,
        targetRole,
        roleType,
        stage,
        createdAt: session.createdAt,
        interviewDate: interviewDate ?? undefined,
      });
      // Deduct 1 credit in Supabase (best-effort — don't block if it fails)
      await fetch("/api/user/spend-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {/* non-blocking */});

      // Track conversion event with attribution
      trackEvent({
        name: "prep_kit_created",
        properties: {
          company: companyName,
          role: targetRole,
          stage,
          ...getAttributionProperties(),
        },
      });
      await new Promise((r) => setTimeout(r, 600));

      // Done! (last step)
      advance(STEPS.length - 1);
      await new Promise((r) => setTimeout(r, 800));

      // Clear wizard state
      localStorage.removeItem("sp_gs_details");

      router.push(`/prep/${sessionId}`);
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
            <span className="font-bold text-sm text-[#4A7AFF] uppercase tracking-wide">
              SalesPrep AI
            </span>
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
