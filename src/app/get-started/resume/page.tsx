"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { ParsedResume, RoleType } from "@/types";
import { WizardHeader } from "../components/WizardHeader";
import { StepResume } from "../components/StepResume";

const SP_ROLE_KEY = "sp_gs_role";
const SP_RESUME_KEY = "sp_gs_resume";

function deriveRightPanelData(resume: ParsedResume) {
  const roleCount = resume.roles.length;
  const companyNames = resume.roles.map((r) => r.company).filter(Boolean);
  const allBullets = resume.roles.flatMap((r) => r.bullets);
  const topMetrics = allBullets
    .filter((b) => b.quantified)
    .flatMap((b) => b.extractedMetrics)
    .filter(Boolean)
    .slice(0, 3);
  const topSignals = resume.skills
    .filter((s) => s.salesRelevance >= 7)
    .map((s) => s.name)
    .slice(0, 4);
  const metricCount = allBullets.filter((b) => b.quantified).length;
  const signalCount = allBullets.filter((b) => b.salesRelevanceScore >= 7).length;
  return { roleCount, companyNames, topMetrics, topSignals, metricCount, signalCount };
}

export default function ResumePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<RoleType | null>(null);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/get-started");
        return;
      }
      const savedRole = localStorage.getItem(SP_ROLE_KEY) as RoleType | null;
      setRole(savedRole);
      setChecking(false);
    });
  }, [router]);

  const handleContinue = () => {
    if (!parsedResume) return;
    localStorage.setItem(SP_RESUME_KEY, JSON.stringify(parsedResume));
    if (!role && parsedResume.suggestedRoleType) {
      localStorage.setItem(SP_ROLE_KEY, parsedResume.suggestedRoleType);
    }
    router.push("/get-started/details");
  };

  if (checking) {
    return (
      <main className="min-h-screen bg-[#F0F7FF] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A7AFF]" />
      </main>
    );
  }

  const panelData = parsedResume ? deriveRightPanelData(parsedResume) : null;

  return (
    <main className="min-h-screen bg-[#F0F7FF] px-4 py-10 pb-28 md:pb-10">
      <div className="max-w-5xl mx-auto">
        <WizardHeader currentStep={2} />

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Left: resume form */}
          <div className="bg-white rounded-2xl border border-[#DBEAFE] p-5 shadow-[0_4px_24px_rgba(74,122,255,0.06)]">
            <h1 className="text-xl font-bold text-[#0F172A] mb-1">Add your resume</h1>
            <p className="text-sm text-[#64748B] mb-5">
              We personalize every answer to your actual experience.
            </p>
            <StepResume onParsed={setParsedResume} />

            {/* Desktop Continue — inline, below parsed card */}
            {parsedResume && (
              <Button className="w-full gap-2 mt-4 hidden md:flex" onClick={handleContinue}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Right: static "why" before parse, dynamic "what we found" after */}
          <div className="hidden md:block">
            {panelData ? (
              <div className="bg-white rounded-2xl border border-[#DBEAFE] p-6 space-y-4 animate-fade-in">
                <h3 className="font-semibold text-[#0F172A]">What we&apos;ll use from your resume</h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                      <span className="text-[#10B981]">✓</span>
                      {panelData.roleCount} role{panelData.roleCount !== 1 ? "s" : ""} across SaaS sales
                    </p>
                    {panelData.companyNames.length > 0 && (
                      <p className="text-xs text-[#94A3B8] ml-6 mt-0.5">
                        {panelData.companyNames.slice(0, 2).join(", ")}
                        {panelData.companyNames.length > 2 && ` + ${panelData.companyNames.length - 2} more`}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                      <span className="text-[#10B981]">✓</span>
                      {panelData.metricCount} quantified achievement{panelData.metricCount !== 1 ? "s" : ""}
                    </p>
                    {panelData.topMetrics.length > 0 && (
                      <p className="text-xs text-[#94A3B8] ml-6 mt-0.5">
                        {panelData.topMetrics.slice(0, 2).join(", ")}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[#0F172A] flex items-center gap-2">
                      <span className="text-[#10B981]">✓</span>
                      {panelData.signalCount} sales signals detected
                    </p>
                    {panelData.topSignals.length > 0 && (
                      <p className="text-xs text-[#94A3B8] ml-6 mt-0.5">
                        {panelData.topSignals.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#94A3B8] pt-4 border-t border-gray-100">
                  These will be woven into every answer in your prep kit.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#DBEAFE] p-6 space-y-4">
                <h3 className="font-semibold text-[#0F172A]">Why your resume matters</h3>
                <ul className="space-y-3 text-sm text-[#475569]">
                  {[
                    "Answers reference your actual experience — not generic scripts",
                    "Quantified metrics you've achieved become the core of your STAR answers",
                    "Career transitions get custom translation frameworks for your background",
                    "Role-specific weaknesses are addressed with bridging strategies",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-[#10B981] font-bold mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="bg-[#F0F7FF] rounded-xl p-4 mt-2">
                  <p className="text-xs text-[#64748B] font-medium mb-1">Supported formats</p>
                  <p className="text-xs text-[#94A3B8]">
                    PDF · DOCX · TXT · Paste from LinkedIn or any text source
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky mobile CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <Button
          className="w-full gap-2"
          disabled={!parsedResume}
          onClick={handleContinue}
        >
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </main>
  );
}
