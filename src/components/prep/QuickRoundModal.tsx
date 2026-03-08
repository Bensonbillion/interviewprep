"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Users, Mic, Star, FileText, X, Check, ArrowRight } from "lucide-react";
import type { PrepSession } from "@/types";

// ─── Round config ──────────────────────────────────────────────────────────────

const ROUNDS = [
  {
    key: "recruiter",
    label: "Recruiter Screen",
    icon: Phone,
    description: "TMAY, why sales, comp, company brief",
  },
  {
    key: "hiring_manager",
    label: "Hiring Manager",
    icon: Users,
    description: "STAR stories, deal questions, behavioral",
  },
  {
    key: "role_play",
    label: "Cold Call / Roleplay",
    icon: Mic,
    description: "Cold call script, objection handling",
  },
  {
    key: "panel",
    label: "Panel / Final",
    icon: Star,
    description: "Deep research, executive questions",
  },
  {
    key: "take_home",
    label: "Take-Home Assignment",
    icon: FileText,
    description: "Cold email, pain point analysis, assignment strategy",
  },
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuickRoundModalProps {
  session: PrepSession;
  completedStages: Record<string, string>;
  creditBalance: number;
  initialRound?: string;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickRoundModal({
  session,
  completedStages,
  creditBalance,
  initialRound,
  onClose,
}: QuickRoundModalProps) {
  const router = useRouter();
  const [confirmRound, setConfirmRound] = useState<string | null>(initialRound ?? null);

  const handleRound = (roundKey: string) => {
    const existingSessionId = completedStages[roundKey];

    // Navigate to existing session
    if (existingSessionId) {
      router.push(`/prep/${existingSessionId}`);
      onClose();
      return;
    }

    // Pre-fill wizard state from current session
    const fullSession = (() => {
      try {
        const raw = sessionStorage.getItem(`session-${session.id}`);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

    if (fullSession?.resume) {
      localStorage.setItem("sp_gs_resume", JSON.stringify(fullSession.resume));
    }

    localStorage.setItem("sp_gs_role", session.roleType);
    localStorage.setItem(
      "sp_gs_details",
      JSON.stringify({
        companyName: session.companyName,
        companyUrl: session.companyUrl ?? "",
        targetRole: session.targetRole,
        jobDescription: fullSession?.jobDescription ?? "",
        stage: roundKey,
      })
    );

    router.push("/get-started/building");
    onClose();
  };

  const handleRoundClick = (roundKey: string) => {
    const existingSessionId = completedStages[roundKey];
    if (existingSessionId) {
      handleRound(roundKey);
    } else {
      setConfirmRound(roundKey);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-ink">Prep Another Round</h2>
            <p className="text-sm text-ink-muted mt-0.5">
              {session.companyName} · {session.targetRole}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Round list */}
        <div className="px-5 py-4 space-y-2">
          {ROUNDS.map((round) => {
            const isCurrent = session.stage === round.key;
            const isCompleted = !!completedStages[round.key];
            const isUnprepped = !isCurrent && !isCompleted;
            const Icon = round.icon;

            return (
              <button
                key={round.key}
                onClick={() => !isCurrent && handleRoundClick(round.key)}
                disabled={isCurrent}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? "border-primary-200 bg-primary-50 cursor-default"
                    : isCompleted
                    ? "border-green-200 bg-green-50 hover:bg-green-100 cursor-pointer"
                    : "border-gray-100 hover:border-primary-300 hover:bg-primary-50 cursor-pointer"
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isCurrent
                      ? "bg-primary-500"
                      : isCompleted
                      ? "bg-green-500"
                      : "bg-gray-100"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isCurrent || isCompleted ? "text-white" : "text-ink-muted"
                    }`}
                  />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      isCurrent
                        ? "text-primary-600"
                        : isCompleted
                        ? "text-green-700"
                        : "text-ink"
                    }`}
                  >
                    {round.label}
                    {isUnprepped && (
                      <span className="text-xs font-normal text-ink-muted"> · 1 credit</span>
                    )}
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">{round.description}</p>
                </div>

                {/* Status indicator */}
                {isCurrent && (
                  <span className="text-xs font-medium text-primary-500 flex-shrink-0 bg-primary-100 px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
                {isCompleted && !isCurrent && (
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
                {isUnprepped && (
                  <ArrowRight className="w-4 h-4 text-ink-muted flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Confirmation strip */}
        {confirmRound && !completedStages[confirmRound] && session.stage !== confirmRound && (
          <div className="px-5 pb-4 pt-2 bg-amber-50 border-t border-amber-100">
            <p className="text-sm text-amber-800 mb-3">
              This will use <strong>1 of your {creditBalance} credits</strong>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRound(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-ink-muted hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRound(confirmRound)}
                className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
              >
                Generate prep kit →
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!confirmRound && (
          <div className="px-6 pb-5 pt-1">
            <p className="text-xs text-ink-muted text-center">
              1 credit per round · Resume &amp; company pre-filled automatically
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
