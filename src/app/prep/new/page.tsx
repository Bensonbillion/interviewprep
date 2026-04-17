"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { type StageType } from "@/lib/types/stages";
import { TakehomeSelector, type TakehomeSession } from "@/components/new-prep/TakehomeSelector";
import { Presentation, Phone, Users, Mic, FileText, Crown } from "lucide-react";

// ─── Stage tiles ─────────────────────────────────────────────────────────────

const STAGE_TILES: Array<{
  type: StageType;
  label: string;
  description: string;
  icon: typeof Phone;
  accent?: boolean;
}> = [
  {
    type: "conversational",
    label: "Recruiter / Culture",
    description: "Fit, motivation, basics — the gate round.",
    icon: Phone,
  },
  {
    type: "deep_dive",
    label: "Hiring Manager / VP",
    description: "Metrics, deal stories, methodology depth.",
    icon: Users,
  },
  {
    type: "skills_demo",
    label: "Cold Call / Roleplay",
    description: "Live demo — the re-run after coaching is the real test.",
    icon: Mic,
  },
  {
    type: "take_home",
    label: "Take-Home Assignment",
    description: "We build your actual submission, not just coaching.",
    icon: FileText,
  },
  {
    type: "presentation_defense",
    label: "Presenting my work",
    description: "Defending a take-home, case study, or presentation you submitted.",
    icon: Presentation,
    accent: true,
  },
  {
    type: "panel_executive",
    label: "Panel / Final Round",
    description: "Every person in the room has veto power.",
    icon: Crown,
  },
];

type Step = "select_stage" | "select_takehome";

// ─── Inner component (needs useSearchParams) ─────────────────────────────────

function NewPrepInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedType = searchParams.get("type") as StageType | null;
  const parentSessionId = searchParams.get("parent");

  const [step, setStep] = useState<Step>("select_stage");
  const [selectedType, setSelectedType] = useState<StageType | null>(null);
  const [takehomeSessions, setTakehomeSessions] = useState<TakehomeSession[]>([]);
  const [loadingTakehomes, setLoadingTakehomes] = useState(false);

  // If type=presentation_defense&parent=xxx, skip everything
  useEffect(() => {
    if (preselectedType && parentSessionId) {
      localStorage.setItem(
        "sp_new_prep",
        JSON.stringify({ stageType: preselectedType, parentSessionId })
      );
      router.replace("/get-started/details");
    }
  }, [preselectedType, parentSessionId, router]);

  // Fetch take-home sessions for the current user
  const fetchTakehomes = useCallback(async () => {
    setLoadingTakehomes(true);
    try {
      const res = await fetch("/api/session/takehomes");
      if (res.ok) {
        const data = await res.json();
        setTakehomeSessions(data.sessions ?? []);
      }
    } catch {
      // Non-fatal
    }
    setLoadingTakehomes(false);
  }, []);

  const handleStageSelect = async (type: StageType) => {
    setSelectedType(type);

    if (type === "presentation_defense") {
      // Check for existing take-home sessions
      await fetchTakehomes();
      setStep("select_takehome");
      return;
    }

    // All other types → go straight to details
    localStorage.setItem(
      "sp_new_prep",
      JSON.stringify({ stageType: type, parentSessionId: null })
    );
    router.push("/get-started/details");
  };

  const handleTakehomeSelect = (parentId: string) => {
    localStorage.setItem(
      "sp_new_prep",
      JSON.stringify({ stageType: "presentation_defense", parentSessionId: parentId })
    );
    router.push("/get-started/details");
  };

  const handleTakehomeSkip = () => {
    // No parent — user will paste submission manually
    localStorage.setItem(
      "sp_new_prep",
      JSON.stringify({ stageType: "presentation_defense", parentSessionId: null })
    );
    router.push("/get-started/details");
  };

  // If we're redirecting from URL params, show loading
  if (preselectedType && parentSessionId) {
    return (
      <main className="min-h-screen bg-[#F0F7FF] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[#5C5347]">
          <div className="w-5 h-5 border-2 border-[#E8735A] border-t-transparent rounded-full animate-spin" />
          Setting up your panel prep...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F0F7FF] px-4 py-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-xs text-[#9B8E82] hover:text-[#5C5347] transition-colors"
          >
            ← Dashboard
          </Link>

          {step === "select_stage" && (
            <>
              <h1 className="text-2xl font-semibold text-[#1C1713] mt-3">
                What round are you prepping for?
              </h1>
              <p className="text-sm text-[#5C5347] mt-1">
                Pick the interview stage. We&apos;ll build the right cards for it.
              </p>
            </>
          )}

          {step === "select_takehome" && (
            <button
              type="button"
              onClick={() => setStep("select_stage")}
              className="text-xs text-[#9B8E82] hover:text-[#5C5347] transition-colors mt-3"
            >
              ← Back to stage selection
            </button>
          )}
        </div>

        {/* Step 1: Stage selection */}
        {step === "select_stage" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STAGE_TILES.map((tile) => {
              const Icon = tile.icon;
              const isSelected = selectedType === tile.type;
              return (
                <button
                  key={tile.type}
                  type="button"
                  onClick={() => handleStageSelect(tile.type)}
                  className={`relative text-left p-5 rounded-xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#FEF0EB] border-[#E8735A] shadow-sm"
                      : tile.accent
                        ? "bg-white border-[#E8735A]/30 hover:border-[#E8735A] hover:bg-[#FEF0EB]/50"
                        : "bg-white border-[#E8E4DF] hover:border-[#C5BDB5] hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected || tile.accent
                          ? "bg-[#E8735A]/10 text-[#E8735A]"
                          : "bg-[#F5F2ED] text-[#9B8E82]"
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          isSelected ? "text-[#E8735A]" : "text-[#1C1713]"
                        }`}
                      >
                        {tile.label}
                      </p>
                      <p className="text-xs text-[#9B8E82] mt-0.5 leading-relaxed">
                        {tile.description}
                      </p>
                    </div>
                  </div>
                  {tile.accent && !isSelected && (
                    <span className="absolute top-2.5 right-2.5 text-[9px] font-bold uppercase tracking-wider text-[#E8735A] bg-[#E8735A]/10 px-2 py-0.5 rounded-full">
                      New
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Take-home selector (presentation_defense only) */}
        {step === "select_takehome" && (
          loadingTakehomes ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-sm text-[#5C5347]">
                <div className="w-5 h-5 border-2 border-[#E8735A] border-t-transparent rounded-full animate-spin" />
                Finding your submissions...
              </div>
            </div>
          ) : (
            <TakehomeSelector
              sessions={takehomeSessions}
              onSelect={handleTakehomeSelect}
              onSkip={handleTakehomeSkip}
            />
          )
        )}
      </div>
    </main>
  );
}

// ─── Page wrapper (Suspense for useSearchParams) ─────────────────────────────

export default function NewPrepPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F0F7FF] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#E8735A] border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <NewPrepInner />
    </Suspense>
  );
}
