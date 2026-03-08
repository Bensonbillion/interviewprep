"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Lock } from "lucide-react";
import type { ParsedResume } from "@/types";
import { ResumeParsedCard } from "./ResumeParsedCard";

interface StepResumeProps {
  onParsed: (resume: ParsedResume | null) => void;
}

type Tab = "paste" | "upload";

export function StepResume({ onParsed }: StepResumeProps) {
  const [tab, setTab] = useState<Tab>("paste");
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");

  const handleParsed = (r: ParsedResume) => {
    setResume(r);
    onParsed(r);
  };

  const handleClear = () => {
    setResume(null);
    setPasteText("");
    setUploadedFileName("");
    setError("");
    onParsed(null);
  };

  const parseFile = async (file: File) => {
    setLoading(true);
    setError("");
    setResume(null);
    setUploadedFileName(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-resume", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      if (!data.resume) throw new Error("No resume data returned");
      handleParsed(data.resume);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse resume");
    } finally {
      setLoading(false);
    }
  };

  const parsePastedText = async () => {
    if (!pasteText.trim()) return;
    const blob = new Blob([pasteText], { type: "text/plain" });
    const file = new File([blob], "resume.txt", { type: "text/plain" });
    await parseFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // After parse: show only the parsed card — upload zone collapses
  if (resume) {
    return <ResumeParsedCard resume={resume} onClear={handleClear} />;
  }

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex bg-[#EFF6FF] rounded-xl p-1 gap-1">
        {(["paste", "upload"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t
                ? "bg-white text-[#0F172A] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            {t === "paste" ? "Paste text" : "Upload file"}
          </button>
        ))}
      </div>

      {/* Paste tab */}
      {tab === "paste" && (
        <div className="space-y-3">
          <Textarea
            placeholder="Paste your resume here — copy from a Word doc, LinkedIn, or any text format..."
            className="min-h-[200px] text-sm border-[#DBEAFE] resize-none"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={parsePastedText}
            disabled={!pasteText.trim() || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Parsing...
              </>
            ) : (
              "Parse my resume"
            )}
          </Button>
        </div>
      )}

      {/* Upload tab */}
      {tab === "upload" && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById("gs-file-input")?.click()}
          className="border-2 border-dashed border-[#BFDBFE] rounded-xl p-10 text-center cursor-pointer hover:border-[#4A7AFF] transition-colors bg-[#F8FBFF]"
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#4A7AFF]" />
              <p className="text-sm text-[#64748B]">Parsing {uploadedFileName}...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-[#93C5FD]" />
              <p className="text-sm font-medium text-[#475569]">
                Drop your resume or click to upload
              </p>
              <p className="text-xs text-[#94A3B8]">PDF · DOCX · TXT</p>
            </div>
          )}
          <input
            id="gs-file-input"
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) parseFile(f);
            }}
          />
        </div>
      )}

      {/* Error */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Privacy line */}
      <p className="text-xs text-[#94A3B8] text-center flex items-center justify-center gap-1.5">
        <Lock className="w-3.5 h-3.5" />
        Your resume is only used to personalize your prep kit
      </p>
    </div>
  );
}
