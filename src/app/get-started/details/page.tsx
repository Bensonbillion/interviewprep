"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ParsedResume, RoleType, InterviewStage, InterviewerInput } from "@/types";
import { WizardHeader } from "../components/WizardHeader";
import { StepDetails } from "../components/StepDetails";
import { PrepKitPreview } from "../components/PrepKitPreview";

const SP_ROLE_KEY = "sp_gs_role";
const SP_RESUME_KEY = "sp_gs_resume";
const SP_DETAILS_KEY = "sp_gs_details";

interface SavedDetails {
  companyName: string;
  companyUrl: string;
  targetRole: string;
  jobDescription: string;
  stage: InterviewStage;
  interviewDate?: string;
  interviewers?: InterviewerInput[];
}

export default function DetailsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<RoleType>("sdr_bdr");
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/get-started");
        return;
      }
      const savedRole = localStorage.getItem(SP_ROLE_KEY) as RoleType | null;
      const savedResume = localStorage.getItem(SP_RESUME_KEY);
      if (!savedResume) {
        router.replace("/get-started/resume");
        return;
      }
      setRole(savedRole ?? "sdr_bdr");
      setResume(JSON.parse(savedResume) as ParsedResume);
      setChecking(false);
    });
  }, [router]);

  const handleGenerate = (details: SavedDetails) => {
    localStorage.setItem(SP_DETAILS_KEY, JSON.stringify(details));
    router.push("/get-started/building");
  };

  if (checking || !resume) {
    return (
      <main className="min-h-screen bg-[#F0F7FF] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A7AFF]" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F0F7FF] px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <WizardHeader currentStep={3} />

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Left: details form */}
          <div className="bg-white rounded-2xl border border-[#DBEAFE] p-5 shadow-[0_4px_24px_rgba(74,122,255,0.06)]">
            <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A] mb-1">
              Last step — tell us about the interview
            </h1>
            <p className="text-base text-[#64748B] mt-1 mb-5">
              Have the job listing URL? Paste it and we&apos;ll fill in the details.
            </p>
            <StepDetails
              roleType={role}
              onCompanyNameChange={setCompanyName}
              onGenerate={handleGenerate}
            />
          </div>

          {/* Right: prep kit preview (desktop only) */}
          <PrepKitPreview companyName={companyName} />
        </div>
      </div>
    </main>
  );
}
