"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Phone,
  Users,
  Mic,
  Star,
} from "lucide-react";
import {
  ParsedResume,
  CompanyProfile,
  RelevanceMap,
  InterviewStage,
  RoleType,
  PrepSession,
} from "@/types";
import { hasCreditsRemaining, consumeCredit } from "@/lib/credits";
import { buildAnswerSlots } from "@/lib/session/answer-slots";

const ROLE_OPTIONS: { id: RoleType; label: string; desc: string }[] = [
  { id: "sdr_bdr", label: "SDR / BDR", desc: "Sales Development Rep" },
  { id: "account_executive", label: "AE", desc: "Account Executive" },
  { id: "account_manager_csm", label: "AM / CSM", desc: "Account Manager" },
  { id: "other_sales", label: "Other Sales", desc: "Other sales role" },
];

function getStages(roleType: RoleType | null) {
  const isAE = roleType === "account_executive";
  return [
    {
      id: "recruiter" as InterviewStage,
      label: "Recruiter Screen",
      sublabel: "Round 1 · 15–30 min",
      icon: Phone,
      evaluates: isAE
        ? "Numbers check: quota attainment, deal sizes, sales cycle, strategic fit"
        : "Phone presence, motivation, basic fit",
    },
    {
      id: "hiring_manager" as InterviewStage,
      label: isAE ? "VP of Sales / Hiring Manager" : "Hiring Manager",
      sublabel: "Round 2 · 30–45 min",
      icon: Users,
      evaluates: isAE
        ? "Deal depth, multi-threading, enterprise sales process and methodology"
        : "Grit, coachability, STAR storytelling",
    },
    {
      id: "role_play" as InterviewStage,
      label: isAE ? "Discovery Demo / Presentation" : "Cold Call / Role Play",
      sublabel: "Round 3 · 30–60 min",
      icon: Mic,
      evaluates: isAE
        ? "Discovery instinct, demo structure, executive objection handling, coachability"
        : "Structure, objection handling, coachability",
    },
    {
      id: "panel" as InterviewStage,
      label: "Panel / Final Round",
      sublabel: "Round 4 · 30–60 min",
      icon: Star,
      evaluates: isAE
        ? "Executive presence, stakeholder management, close the hiring process"
        : "Culture fit, curiosity, close the interviewer",
    },
  ];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [roleType, setRoleType] = useState<RoleType | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [stage, setStage] = useState<InterviewStage | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setResumeFile(file);
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Server error");
      if (!data.resume) throw new Error("No resume data returned");
      setResume(data.resume);
      if (data.resume.suggestedRoleType && !roleType) {
        setRoleType(data.resume.suggestedRoleType);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("Resume parse error:", msg);
      setError(msg);
      setResumeFile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleGenerate = async () => {
    if (!resume || !jobDescription || !companyName || !targetRole || !stage || !roleType)
      return;

    if (!hasCreditsRemaining()) {
      router.push("/pricing");
      return;
    }

    setStep(3);
    setLoading(true);
    setError("");

    try {
      const companyRes = await fetch("/api/company-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, companyUrl, jobDescription, targetRole }),
      });
      const companyData = await companyRes.json();
      if (!companyRes.ok) throw new Error(companyData.error);
      const company: CompanyProfile = companyData.company;

      const crossRefRes = await fetch("/api/cross-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, company, jobDescription, targetRole }),
      });
      const crossRefData = await crossRefRes.json();
      if (!crossRefRes.ok) throw new Error(crossRefData.error);
      const relevanceMap: RelevanceMap = crossRefData.relevanceMap;

      const sessionId = crypto.randomUUID();
      const answerSlots = buildAnswerSlots(stage, resume.backgroundType, roleType ?? "sdr_bdr");

      const session: PrepSession = {
        id: sessionId,
        resume,
        jobDescription,
        companyName,
        companyUrl,
        targetRole,
        roleType: roleType ?? "sdr_bdr",
        stage,
        company,
        relevanceMap,
        answerSlots,
        createdAt: Date.now(),
      };

      sessionStorage.setItem(`session-${sessionId}`, JSON.stringify(session));
      consumeCredit(sessionId);
      router.push(`/prep/${sessionId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg + " — check your API keys and try again.");
      setStep(2);
      setLoading(false);
    }
  };

  const progressPct = step === 3 ? 100 : (step / 3) * 100;
  const stages = getStages(roleType);
  const isAE = roleType === "account_executive";

  return (
    <main className="min-h-screen bg-[#F0F7FF] flex flex-col items-center py-12 px-4">
      {/* Header */}
      <div className="w-full max-w-xl mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-sm text-[#4A7AFF]">SalesPrep AI</span>
          <span className="text-sm text-[#94A3B8]">
            {step < 3 ? `Step ${step + 1} of 3` : "Generating..."}
          </span>
        </div>
        <Progress value={progressPct} className="h-1" />
      </div>

      {/* Step 0: Resume upload */}
      {step === 0 && (
        <Card className="w-full max-w-xl border-[#DBEAFE]">
          <CardHeader>
            <CardTitle className="text-[#0F172A]">Upload your resume</CardTitle>
            <p className="text-sm text-[#64748B]">
              We personalize every answer to your actual experience. PDF, DOCX, or TXT.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
              className="border-2 border-dashed border-[#BFDBFE] rounded-lg p-10 text-center cursor-pointer hover:border-[#4A7AFF] transition-colors bg-[#F8FBFF]"
            >
              {loading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-[#4A7AFF]" />
                  <p className="text-sm text-[#64748B]">Parsing resume...</p>
                </div>
              ) : resume ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-[#10B981]" />
                  <p className="text-sm font-medium text-[#0F172A]">{resumeFile?.name}</p>
                  {resume.personalInfo.name && (
                    <p className="text-sm text-[#64748B]">{resume.personalInfo.name}</p>
                  )}
                  <p className="text-xs text-[#94A3B8] capitalize">
                    {resume.backgroundType.replace("_", " ")} ·{" "}
                    {resume.roles.length} roles ·{" "}
                    {resume.roles.flatMap((r) => r.bullets).filter((b) => b.quantified).length} quantified achievements
                  </p>
                  {resume.narrativeSummary && (
                    <p className="text-xs text-[#64748B] mt-1 text-center max-w-xs italic">
                      &ldquo;{resume.narrativeSummary}&rdquo;
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-[#93C5FD]" />
                  <p className="text-sm font-medium text-[#475569]">
                    Drop your resume here or click to upload
                  </p>
                  <p className="text-xs text-[#94A3B8]">PDF · DOCX · TXT</p>
                </div>
              )}
            </div>
            <input
              id="file-input"
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button className="w-full gap-2" disabled={!resume || loading} onClick={() => setStep(1)}>
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Job details + role type */}
      {step === 1 && (
        <Card className="w-full max-w-xl border-[#DBEAFE]">
          <CardHeader>
            <CardTitle className="text-[#0F172A]">Job details</CardTitle>
            <p className="text-sm text-[#64748B]">
              The more context you give, the more tailored your prep kit.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Role type selector */}
            <div className="space-y-2">
              <Label className="text-[#0F172A]">What role are you interviewing for? *</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRoleType(r.id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      roleType === r.id
                        ? "border-[#4A7AFF] bg-[#4A7AFF] text-white"
                        : "border-[#DBEAFE] bg-white hover:border-[#4A7AFF]"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${roleType === r.id ? "text-white" : "text-[#0F172A]"}`}>
                      {r.label}
                    </p>
                    <p className={`text-xs mt-0.5 ${roleType === r.id ? "text-blue-100" : "text-[#64748B]"}`}>
                      {r.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[#0F172A]">Company name *</Label>
                <Input
                  placeholder="e.g. Salesforce"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#0F172A]">Target role title *</Label>
                <Input
                  placeholder={isAE ? "e.g. Enterprise AE" : "e.g. SDR, BDR"}
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#0F172A]">Company website</Label>
              <Input
                placeholder="https://company.com (improves company research)"
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#0F172A]">Job description *</Label>
              <Textarea
                placeholder="Paste the full job description here..."
                className="min-h-[160px] text-sm"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={!companyName || !targetRole || !jobDescription || !roleType}
                onClick={() => setStep(2)}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Stage selection */}
      {step === 2 && (
        <div className="w-full max-w-xl space-y-4">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              Which round are you prepping for?
            </h2>
            <p className="text-sm text-[#64748B] mt-1">
              Each round is evaluated differently. Your prep kit will be calibrated to exactly what this stage tests.
            </p>
          </div>
          <div className="grid gap-3">
            {stages.map((s) => (
              <button
                key={s.id}
                onClick={() => setStage(s.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  stage === s.id
                    ? "border-[#4A7AFF] bg-[#4A7AFF] text-white"
                    : "border-[#DBEAFE] bg-white hover:border-[#4A7AFF]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <s.icon
                    className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                      stage === s.id ? "text-white" : "text-[#4A7AFF]"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{s.label}</span>
                      <span className={`text-xs ${stage === s.id ? "text-blue-100" : "text-[#94A3B8]"}`}>
                        {s.sublabel}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${stage === s.id ? "text-blue-100" : "text-[#64748B]"}`}>
                      Evaluates: {s.evaluates}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button className="flex-1 gap-2" disabled={!stage} onClick={handleGenerate}>
              Generate prep kit <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-center text-[#94A3B8]">
            Uses 1 of your 3 free credits
          </p>
        </div>
      )}

      {/* Step 3: Generating */}
      {step === 3 && (
        <Card className="w-full max-w-xl border-[#DBEAFE]">
          <CardContent className="py-16 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#4A7AFF] mx-auto" />
            <p className="font-semibold text-[#0F172A]">Building your prep kit...</p>
            <div className="text-sm text-[#64748B] space-y-1">
              <p>Researching {companyName}</p>
              <p>Cross-referencing your resume against the role</p>
              <p>
                Generating your{" "}
                {stages.find((s) => s.id === stage)?.label ?? ""} prep kit
              </p>
            </div>
            {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
