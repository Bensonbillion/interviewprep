"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { STAGE_TYPE_METADATA, type StageType } from "@/lib/types/stages";
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

// ─── Inner component (needs useSearchParams) ─────────────────────────────────

function NewPrepInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedType = searchParams.get("type") as StageType | null;
  const parentSessionId = searchParams.get("parent");

  const [selectedType, setSelectedType] = useState<StageType | null>(null);

  // If type=presentation_defense&parent=xxx, skip selection and go straight to setup
  useEffect(() => {
    if (preselectedType && parentSessionId) {
      // Store in localStorage for the details step
      localStorage.setItem(
        "sp_new_prep",
        JSON.stringify({
          stageType: preselectedType,
          parentSessionId,
        })
      );
      router.replace("/get-started/details");
    }
  }, [preselectedType, parentSessionId, router]);

  // If we're redirecting, show loading
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

  const handleSelect = (type: StageType) => {
    setSelectedType(type);
    localStorage.setItem(
      "sp_new_prep",
      JSON.stringify({ stageType: type, parentSessionId: null })
    );
    router.push("/get-started/details");
  };

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
          <h1 className="text-2xl font-semibold text-[#1C1713] mt-3">
            What round are you prepping for?
          </h1>
          <p className="text-sm text-[#5C5347] mt-1">
            Pick the interview stage. We&apos;ll build the right cards for it.
          </p>
        </div>

        {/* Stage tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STAGE_TILES.map((tile) => {
            const Icon = tile.icon;
            const isSelected = selectedType === tile.type;
            return (
              <button
                key={tile.type}
                type="button"
                onClick={() => handleSelect(tile.type)}
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
