"use client";

import { useState } from "react";
import { Link, Loader2, CheckCircle, AlertTriangle, X } from "lucide-react";

type UrlStatus = "idle" | "extracting" | "success" | "error";

export interface ExtractedJobData {
  company_name: string | null;
  role_title: string | null;
  job_description: string | null;
  company_website: string | null;
}

interface JobUrlInputProps {
  onExtracted: (data: ExtractedJobData) => void;
  onClear: () => void;
}

function getDomain(rawUrl: string): string {
  try {
    const normalized = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
}

function isValidUrl(rawUrl: string): boolean {
  try {
    new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    return true;
  } catch {
    return false;
  }
}

export function JobUrlInput({ onExtracted, onClear }: JobUrlInputProps) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<UrlStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [domain, setDomain] = useState("");

  const extract = async (rawUrl: string) => {
    if (!isValidUrl(rawUrl)) return;
    const normalized = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    setDomain(getDomain(normalized));
    setStatus("extracting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/extract-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(
          (data.error as string) ?? "We couldn't access this listing. Enter details below."
        );
        return;
      }
      const extracted = data as ExtractedJobData;
      if (!extracted.company_name && !extracted.role_title) {
        setStatus("error");
        setErrorMessage(
          "We found the page but couldn't extract job details. Enter them below or paste the job description."
        );
        return;
      }
      setStatus("success");
      onExtracted(extracted);
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Enter details below.");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (status !== "idle") return;
    const pasted = e.clipboardData.getData("text").trim();
    if (!pasted || !isValidUrl(pasted)) return;
    // Let onChange update url first, then extract
    setTimeout(() => extract(pasted), 0);
  };

  const handleBlur = () => {
    if (url.trim() && status === "idle" && isValidUrl(url)) {
      extract(url);
    }
  };

  const handleClear = () => {
    setUrl("");
    setStatus("idle");
    setErrorMessage(null);
    setDomain("");
    onClear();
  };

  // Success: show confirmed strip
  if (status === "success") {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3.5">
        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
        <span className="text-sm text-green-700 truncate flex-1">{url}</span>
        <button
          type="button"
          onClick={handleClear}
          className="text-[#94A3B8] hover:text-red-500 transition-colors flex-shrink-0"
          aria-label="Clear URL"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const isExtracting = status === "extracting";
  const displayValue = isExtracting ? `Extracting from ${domain}...` : url;

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Left icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          {isExtracting ? (
            <Loader2 className="w-4 h-4 text-[#4A7AFF] animate-spin" />
          ) : (
            <Link className="w-4 h-4 text-[#94A3B8]" />
          )}
        </div>

        <input
          type="url"
          inputMode="url"
          placeholder="Paste job listing URL..."
          value={displayValue}
          readOnly={isExtracting}
          onChange={isExtracting ? undefined : (e) => setUrl(e.target.value)}
          onPaste={isExtracting ? undefined : handlePaste}
          onBlur={isExtracting ? undefined : handleBlur}
          className={`w-full py-3.5 pl-11 pr-10 border-2 rounded-xl outline-none transition-all placeholder:text-[#94A3B8] ${
            isExtracting
              ? "bg-gray-50 border-gray-200 text-[#64748B] cursor-wait"
              : status === "error"
              ? "border-amber-200 bg-white focus:border-[#4A7AFF] focus:ring-2 focus:ring-[#4A7AFF]/20"
              : "border-[#BFDBFE] bg-[#EFF6FF]/50 focus:bg-white focus:border-[#4A7AFF] focus:ring-2 focus:ring-[#4A7AFF]/20"
          }`}
          style={{ fontSize: "16px" }}
        />

        {/* Clear button */}
        {url && !isExtracting && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-red-500 transition-colors"
            aria-label="Clear URL"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error message */}
      {status === "error" && errorMessage && (
        <div className="flex items-start gap-1.5 text-sm text-amber-600">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
