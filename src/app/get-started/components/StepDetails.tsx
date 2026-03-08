"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { InterviewStage, RoleType, InterviewerInput } from "@/types";
import { PaywallModal } from "./PaywallModal";
import { useCredits } from "@/hooks/useCredits";
import { JobUrlInput, type ExtractedJobData } from "./JobUrlInput";
import { CompanyRoleFields } from "./CompanyRoleFields";
import { RoundSelector, getDefaultRound } from "./RoundSelector";
import { JobDescriptionAccordion } from "./JobDescriptionAccordion";
import { StickyGenerateCta } from "./StickyGenerateCta";
import { UserSearch, ChevronDown, ChevronUp, Plus, X } from "lucide-react";

interface StepDetailsProps {
  roleType: RoleType;
  onCompanyNameChange: (name: string) => void;
  onGenerate: (details: {
    companyName: string;
    companyUrl: string;
    targetRole: string;
    jobDescription: string;
    stage: InterviewStage;
    interviewDate?: string;
    interviewers?: InterviewerInput[];
    personalContext?: string;
  }) => void;
}

export function StepDetails({ roleType, onCompanyNameChange, onGenerate }: StepDetailsProps) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [extractedCompanyUrl, setExtractedCompanyUrl] = useState("");
  const [stage, setStage] = useState<InterviewStage | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [isJdAutoFilled, setIsJdAutoFilled] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [showInterviewerSection, setShowInterviewerSection] = useState(false);
  const [interviewers, setInterviewers] = useState<InterviewerInput[]>([{ name: "", linkedinUrl: "", roleTitle: "" }]);
  const [personalContext, setPersonalContext] = useState("");

  // Smart default round based on role type
  useEffect(() => {
    setStage(getDefaultRound(roleType));
  }, [roleType]);

  const canGenerate = !!(companyName.trim() && roleTitle.trim() && stage);
  const { balance: creditsRemaining, loading: creditsLoading } = useCredits();

  const handleExtracted = (data: ExtractedJobData) => {
    const autoFilled = new Set<string>();
    if (data.company_name && !companyName.trim()) {
      const name = data.company_name;
      setCompanyName(name);
      onCompanyNameChange(name);
      autoFilled.add("company");
    }
    if (data.role_title && !roleTitle.trim()) {
      setRoleTitle(data.role_title);
      autoFilled.add("role");
    }
    if (data.job_description && !jobDescription.trim()) {
      setJobDescription(data.job_description);
      setIsJdAutoFilled(true);
      autoFilled.add("description");
    }
    if (data.company_website) {
      setExtractedCompanyUrl(data.company_website);
    }
    setAutoFilledFields(autoFilled);
  };

  const handleUrlCleared = () => {
    setAutoFilledFields(new Set());
    setIsJdAutoFilled(false);
    setExtractedCompanyUrl("");
  };

  const handleCompanyChange = (v: string) => {
    setCompanyName(v);
    onCompanyNameChange(v);
    if (autoFilledFields.has("company")) {
      setAutoFilledFields((prev) => {
        const next = new Set(prev);
        next.delete("company");
        return next;
      });
    }
  };

  const handleRoleChange = (v: string) => {
    setRoleTitle(v);
    if (autoFilledFields.has("role")) {
      setAutoFilledFields((prev) => {
        const next = new Set(prev);
        next.delete("role");
        return next;
      });
    }
  };

  const filledInterviewers = interviewers.filter((iv) => iv.name.trim());

  const handleInterviewerChange = (idx: number, field: keyof InterviewerInput, value: string) => {
    setInterviewers((prev) => prev.map((iv, i) => i === idx ? { ...iv, [field]: value } : iv));
  };

  const handleAddInterviewer = () => {
    if (interviewers.length < 3) {
      setInterviewers((prev) => [...prev, { name: "", linkedinUrl: "", roleTitle: "" }]);
    }
  };

  const handleRemoveInterviewer = (idx: number) => {
    setInterviewers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleGenerate = () => {
    if (!canGenerate || !stage) return;
    if (creditsRemaining <= 0) {
      setShowPaywall(true);
      return;
    }
    onGenerate({
      companyName: companyName.trim(),
      companyUrl: extractedCompanyUrl,
      targetRole: roleTitle.trim(),
      jobDescription,
      stage,
      interviewDate: interviewDate || undefined,
      interviewers: filledInterviewers.length > 0 ? filledInterviewers : undefined,
      personalContext: personalContext.trim() || undefined,
    });
  };

  return (
    <div className="space-y-5">
      {/* Hero: Job URL input */}
      <JobUrlInput onExtracted={handleExtracted} onClear={handleUrlCleared} />

      {/* Company name + Role title */}
      <CompanyRoleFields
        companyName={companyName}
        roleTitle={roleTitle}
        isCompanyAutoFilled={autoFilledFields.has("company")}
        isRoleAutoFilled={autoFilledFields.has("role")}
        roleType={roleType}
        onCompanyChange={handleCompanyChange}
        onRoleChange={handleRoleChange}
      />

      {/* Round selector */}
      <RoundSelector roleType={roleType} selected={stage} onChange={setStage} />

      {/* Interview date (optional) */}
      <div>
        <label className="text-sm font-medium text-ink mb-1.5 flex items-center gap-2">
          When is your interview?
          <span className="text-xs font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          type="date"
          value={interviewDate}
          onChange={(e) => setInterviewDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
        />
        {interviewDate && (
          <p className="text-xs text-primary-500 mt-1.5 font-medium">
            📅 {(() => {
              const d = new Date(interviewDate + "T12:00:00");
              const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              if (diff === 0) return "Today — let's get you ready!";
              if (diff === 1) return "Tomorrow — we'll make it count.";
              if (diff <= 3) return `In ${diff} days — plenty of time to prep.`;
              return `${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`;
            })()}
          </p>
        )}
      </div>

      {/* Job description (collapsed accordion) */}
      <JobDescriptionAccordion
        value={jobDescription}
        isAutoFilled={isJdAutoFilled}
        onChange={(v) => {
          setJobDescription(v);
          if (isJdAutoFilled) setIsJdAutoFilled(false);
        }}
      />

      {/* Optional: Who's your interviewer? */}
      <div className="border border-dashed border-gray-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowInterviewerSection((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <UserSearch className="w-4 h-4 text-ink-muted" />
            <span className="text-sm font-medium text-ink">Who&apos;s your interviewer?</span>
            <span className="text-xs text-ink-muted hidden sm:inline">Get personalized intel</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-primary-500 font-medium">Optional</span>
            {showInterviewerSection ? (
              <ChevronUp className="w-4 h-4 text-ink-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-ink-muted" />
            )}
          </div>
        </button>

        {showInterviewerSection && (
          <div className="px-4 pb-4 space-y-3 border-t border-dashed border-gray-100">
            <p className="text-xs text-ink-muted pt-3">
              We&apos;ll research their background and tailor your prep to what they care about.
            </p>
            {interviewers.map((iv, idx) => (
              <div key={idx} className="space-y-2 bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-muted">Interviewer {idx + 1}</span>
                  {interviewers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveInterviewer(idx)}
                      className="text-ink-muted hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Full name *"
                  value={iv.name}
                  onChange={(e) => handleInterviewerChange(idx, "name", e.target.value)}
                  className="w-full text-sm border border-[#DBEAFE] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white placeholder:text-gray-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Role / Title"
                    value={iv.roleTitle ?? ""}
                    onChange={(e) => handleInterviewerChange(idx, "roleTitle", e.target.value)}
                    className="w-full text-sm border border-[#DBEAFE] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white placeholder:text-gray-400"
                  />
                  <input
                    type="url"
                    placeholder="LinkedIn URL"
                    value={iv.linkedinUrl ?? ""}
                    onChange={(e) => handleInterviewerChange(idx, "linkedinUrl", e.target.value)}
                    className="w-full text-sm border border-[#DBEAFE] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white placeholder:text-gray-400"
                  />
                </div>
              </div>
            ))}
            {interviewers.length < 3 && (
              <button
                type="button"
                onClick={handleAddInterviewer}
                className="flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another interviewer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Personal context (optional) */}
      <div>
        <label className="text-sm font-medium text-ink mb-1.5 flex items-center gap-2">
          Anything else that makes you stand out?
          <span className="text-xs font-normal text-ink-muted">(optional)</span>
        </label>
        <p className="text-xs text-ink-muted mb-2">
          Side projects, hobbies, volunteer work, something unexpected — the stuff that makes interviewers remember you.
        </p>
        <div className="relative">
          <textarea
            rows={3}
            maxLength={500}
            value={personalContext}
            onChange={(e) => setPersonalContext(e.target.value)}
            placeholder="I coach a youth soccer team, I run a small e-commerce business on the side, I taught myself to code..."
            className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white resize-none placeholder:text-gray-400"
          />
          <span className="absolute bottom-2 right-3 text-xs text-ink-muted">
            {personalContext.length}/500
          </span>
        </div>
      </div>

      {/* Back link */}
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-[#94A3B8] hover:text-[#0F172A] font-medium flex items-center gap-1 transition-colors"
      >
        ← Back
      </button>

      {/* Desktop Generate CTA */}
      <div className="hidden md:block space-y-2">
        <button
          type="button"
          disabled={!canGenerate}
          onClick={handleGenerate}
          className="w-full py-4 bg-[#FF6B4A] hover:bg-[#E85D3A] text-white font-bold rounded-xl text-lg transition-all shadow-md hover:shadow-lg disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
        >
          Generate my prep kit →
        </button>
        <p className="text-xs text-center text-[#94A3B8]">
          {creditsLoading
            ? "Loading credits..."
            : `Uses 1 of your ${creditsRemaining} prep kit${creditsRemaining !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Mobile spacer for sticky CTA */}
      <div className="md:hidden h-24" />

      {/* Mobile sticky CTA */}
      <StickyGenerateCta
        canGenerate={canGenerate}
        onGenerate={handleGenerate}
        creditsRemaining={creditsRemaining}
      />

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
    </div>
  );
}
