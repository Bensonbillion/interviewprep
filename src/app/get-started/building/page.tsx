"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ParsedResume, RoleType, InterviewStage, InterviewerInput } from "@/types";
import { GenerationScreen } from "../components/GenerationScreen";

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
  personalContext?: string;
}

export default function BuildingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [role, setRole] = useState<RoleType>("sdr_bdr");
  const [details, setDetails] = useState<SavedDetails | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/get-started");
        return;
      }

      const savedRole = localStorage.getItem(SP_ROLE_KEY) as RoleType | null;
      const savedResume = localStorage.getItem(SP_RESUME_KEY);
      const savedDetails = localStorage.getItem(SP_DETAILS_KEY);

      if (!savedResume) {
        router.replace("/get-started/resume");
        return;
      }
      if (!savedDetails) {
        router.replace("/get-started/details");
        return;
      }

      setRole(savedRole ?? "sdr_bdr");
      setResume(JSON.parse(savedResume) as ParsedResume);
      setDetails(JSON.parse(savedDetails) as SavedDetails);
      setReady(true);
    });
  }, [router]);

  if (!ready || !resume || !details) {
    return (
      <main className="min-h-screen bg-[#F0F7FF] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A7AFF]" />
      </main>
    );
  }

  return (
    <GenerationScreen
      resume={resume}
      roleType={role}
      companyName={details.companyName}
      companyUrl={details.companyUrl}
      targetRole={details.targetRole}
      jobDescription={details.jobDescription}
      stage={details.stage}
      interviewDate={details.interviewDate}
      interviewers={details.interviewers}
      personalContext={details.personalContext}
    />
  );
}
