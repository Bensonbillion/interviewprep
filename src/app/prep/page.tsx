"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  FileText,
  Loader2,
  Phone,
  Users,
  Mic,
  Star,
  Briefcase,
  TrendingUp,
  UserCheck,
  MoreHorizontal,
} from "lucide-react";
import type {
  ParsedResume,
  CompanyProfile,
  InterviewStage,
  RoleType,
  PrepSession,
} from "@/types";
// (Session 3) Removed import of dead localStorage credits stub. Real gate
// is server-side in /api/session/save (entitlement-first / credit fallback).

// ─── Role type cards ──────────────────────────────────────────────────────────

const ROLE_TYPES: { id: RoleType; label: string; sublabel: string; icon: React.ElementType }[] = [
  { id: "sdr_bdr", label: "SDR / BDR", sublabel: "Sales Development", icon: TrendingUp },
  { id: "account_executive", label: "Account Executive", sublabel: "AE / Closer", icon: Briefcase },
  { id: "account_manager_csm", label: "AM / CSM", sublabel: "Account Management", icon: UserCheck },
  { id: "other_sales", label: "Other Sales", sublabel: "Sales-adjacent role", icon: MoreHorizontal },
];

// ─── Stage cards ──────────────────────────────────────────────────────────────

const STAGES: {
  id: InterviewStage;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  evaluates: string;
}[] = [
  {
    id: "recruiter",
    label: "Recruiter Screen",
    sublabel: "Round 1 · 15–30 min",
    icon: Phone,
    evaluates: "Phone presence, motivation, basic fit",
  },
  {
    id: "hiring_manager",
    label: "Hiring Manager",
    sublabel: "Round 2 · 30–45 min",
    icon: Users,
    evaluates: "Grit, coachability, STAR storytelling",
  },
  {
    id: "role_play",
    label: "Cold Call / Role Play",
    sublabel: "Round 3 · 30–60 min",
    icon: Mic,
    evaluates: "Structure, objection handling, coachability",
  },
  {
    id: "panel",
    label: "Panel / Final Round",
    sublabel: "Round 4 · 30–60 min",
    icon: Star,
    evaluates: "Culture fit, curiosity, close the interviewer",
  },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PrepPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [roleType, setRoleType] = useState<RoleType | null>(null);
  const [stage, setStage] = useState<InterviewStage | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setResumeFile(file);
    setUploadingResume(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResume(data.resume);
    } catch {
      setError("Failed to parse resume. Try a PDF, DOCX, or plain text file.");
      setResumeFile(null);
    } finally {
      setUploadingResume(false);
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

  const canGenerate =
    resume && companyName && targetRole && jobDescription && roleType && stage;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setLoading(true);
    setError("");

    try {
      // Step 1: Company research
      const companyRes = await fetch("/api/research-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, companyUrl, jobDescription }),
      });
      const companyData = await companyRes.json();
      if (!companyRes.ok) throw new Error(companyData.error);
      const company: CompanyProfile = companyData.company;

      // Step 2: Create session (cross-ref + answer slots)
      const sessionRes = await fetch("/api/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          company,
          jobDescription,
          targetRole,
          roleType,
          stage,
          companyName,
          companyUrl,
        }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(sessionData.error);

      const session: PrepSession = sessionData.session;

      sessionStorage.setItem(`session-${session.id}`, JSON.stringify(session));
      router.push(`/prep/${session.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg + " — check your API keys and try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Build your prep kit</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fill in all fields — your answers will be personalized to your background and this exact role.
          </p>
        </div>

        {/* Resume upload */}
        <section className="space-y-3">
          <Label className="text-sm font-semibold text-gray-900">Your resume *</Label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition-colors bg-white"
          >
            {uploadingResume ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
                <p className="text-sm text-gray-500">Parsing resume...</p>
              </div>
            ) : resume ? (
              <div className="flex flex-col items-center gap-1.5">
                <FileText className="w-7 h-7 text-green-500" />
                <p className="text-sm font-medium text-gray-900">{resumeFile?.name}</p>
                {resume.personalInfo.name && (
                  <p className="text-sm text-gray-600">{resume.personalInfo.name}</p>
                )}
                <p className="text-xs text-gray-400 capitalize">
                  {resume.backgroundType.replace("_", " ")} · {resume.roles.length} roles ·{" "}
                  {resume.roles.flatMap((r) => r.bullets).filter((b) => b.quantified).length}{" "}
                  quantified achievements
                </p>
                <button
                  className="text-xs text-gray-400 underline mt-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResume(null);
                    setResumeFile(null);
                  }}
                >
                  Replace
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-7 h-7 text-gray-300" />
                <p className="text-sm font-medium text-gray-700">
                  Drop your resume here or click to upload
                </p>
                <p className="text-xs text-gray-400">PDF · DOCX · TXT</p>
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
        </section>

        {/* Company + role details */}
        <section className="space-y-4 bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 text-sm">Role details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Company name *</Label>
              <Input
                placeholder="e.g. Salesforce"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Target role *</Label>
              <Input
                placeholder="e.g. SDR, BDR, AE"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600">Company website (optional — improves research)</Label>
            <Input
              placeholder="https://company.com"
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600">Job description *</Label>
            <Textarea
              placeholder="Paste the full job description here..."
              className="min-h-[140px] text-sm"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
        </section>

        {/* Role type selector */}
        <section className="space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm">What type of role? *</h2>
          <div className="grid grid-cols-2 gap-3">
            {ROLE_TYPES.map((rt) => (
              <button
                key={rt.id}
                onClick={() => setRoleType(rt.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  roleType === rt.id
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white hover:border-gray-400"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <rt.icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      roleType === rt.id ? "text-white" : "text-gray-500"
                    }`}
                  />
                  <div>
                    <p className="font-semibold text-sm">{rt.label}</p>
                    <p
                      className={`text-xs ${
                        roleType === rt.id ? "text-gray-300" : "text-gray-400"
                      }`}
                    >
                      {rt.sublabel}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Stage selector */}
        <section className="space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm">Which round are you prepping for? *</h2>
          <div className="grid gap-3">
            {STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStage(s.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  stage === s.id
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white hover:border-gray-400"
                }`}
              >
                <div className="flex items-start gap-3">
                  <s.icon
                    className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                      stage === s.id ? "text-white" : "text-gray-500"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{s.label}</span>
                      <span
                        className={`text-xs ${
                          stage === s.id ? "text-gray-300" : "text-gray-400"
                        }`}
                      >
                        {s.sublabel}
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-0.5 ${
                        stage === s.id ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      Evaluates: {s.evaluates}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Submit */}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <Button
          className="w-full h-12 text-base font-semibold gap-2"
          disabled={!canGenerate || loading || uploadingResume}
          onClick={handleGenerate}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Building your prep kit...
            </>
          ) : (
            "Generate prep kit — 1 credit"
          )}
        </Button>

        <p className="text-xs text-center text-gray-400">
          3 free credits · No account required · Personalized to your resume
        </p>
      </div>
    </main>
  );
}
