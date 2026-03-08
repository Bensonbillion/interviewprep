"use client";

import { useState } from "react";
import type { PrepSession } from "@/types";
import { Mail, Copy, Check, Loader2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface FollowUpEmail {
  subject: string;
  body: string;
  interviewerName?: string;
}

type State = "idle" | "input" | "generating" | "display";

export function FollowUpSection({
  session,
  sessionId,
}: {
  session: PrepSession;
  sessionId: string;
}) {
  const storageKey = `followup-${sessionId}`;

  const [state, setState] = useState<State>(() => {
    if (typeof window === "undefined") return "idle";
    try {
      const saved = sessionStorage.getItem(storageKey);
      return saved ? "display" : "idle";
    } catch {
      return "idle";
    }
  });

  const [notes, setNotes] = useState("");
  const [emails, setEmails] = useState<FollowUpEmail[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = sessionStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as FollowUpEmail[]) : [];
    } catch {
      return [];
    }
  });
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const activeEmail = emails[activeTab];
  const hasMultiple = emails.length > 1;

  const handleGenerate = async () => {
    setState("generating");
    setError("");
    try {
      const res = await fetch("/api/generate-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, notes }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json() as { emails: FollowUpEmail[] };
      const result = data.emails ?? [];
      setEmails(result);
      setActiveTab(0);
      sessionStorage.setItem(storageKey, JSON.stringify(result));
      setState("display");
    } catch {
      setError("Something went wrong. Try again.");
      setState("input");
    }
  };

  const handleCopy = async () => {
    if (!activeEmail) return;
    const text = `Subject: ${activeEmail.subject}\n\n${activeEmail.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInMail = () => {
    if (!activeEmail) return;
    const subject = encodeURIComponent(activeEmail.subject);
    const body = encodeURIComponent(activeEmail.body);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleReset = () => {
    setEmails([]);
    setNotes("");
    setActiveTab(0);
    sessionStorage.removeItem(storageKey);
    setState("idle");
  };

  if (state === "idle") {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">After the Interview</p>
            <p className="text-xs text-ink-muted mt-0.5">
              Send a follow-up email that actually stands out. Takes 30 seconds.
            </p>
            <button
              onClick={() => setState("input")}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
            >
              Generate follow-up email →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "input") {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-slate-600" />
          <p className="text-sm font-bold text-ink">After the Interview</p>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted block mb-1.5">
            How did it go? Any highlights to reference?{" "}
            <span className="font-normal text-ink-muted/70">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. We talked a lot about their outbound motion, they asked about my cold call experience, the interviewer mentioned they're expanding the SDR team..."
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white placeholder:text-gray-400"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
          >
            Generate email →
          </button>
          <button
            onClick={() => setState("idle")}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-ink-muted hover:bg-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (state === "generating") {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-5 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-slate-600 flex-shrink-0" />
        <p className="text-sm text-ink-muted">Writing your follow-up email…</p>
      </div>
    );
  }

  // Display state
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-slate-600" />
          <p className="text-sm font-bold text-ink">Follow-Up Email</p>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-ink-muted hover:text-ink transition-colors"
        >
          Regenerate
        </button>
      </div>

      {/* Per-interviewer tabs (panel sessions) */}
      {hasMultiple && (
        <div className="flex gap-1.5 px-5 pt-3 pb-0 overflow-x-auto">
          {emails.map((e, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === i
                  ? "bg-slate-700 text-white"
                  : "bg-white border border-slate-200 text-ink-muted hover:border-slate-400"
              }`}
            >
              {e.interviewerName ?? `Email ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Email content */}
      {activeEmail && (
        <div className="px-5 py-4 space-y-3">
          {/* Subject line */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5">
            <p className="text-xs font-semibold text-ink-muted mb-0.5">Subject</p>
            <p className="text-sm font-medium text-ink">{activeEmail.subject}</p>
          </div>

          {/* Body */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-sm text-ink-light leading-relaxed whitespace-pre-wrap">
              {activeEmail.body}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleOpenInMail}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-ink-muted hover:border-slate-400 hover:text-ink transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Mail
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
