"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { FileText, Plus, X, ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";

interface Interviewer {
  name: string;
  title: string;
}

// ─── Inner component ─────────────────────────────────────────────────────────

function PanelSetupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const parentSessionId = searchParams.get("parent") ?? "";
  const companyName = searchParams.get("company") ?? "";
  const parentStageName = searchParams.get("stageName") ?? "Take-home assignment";
  const parentDate = searchParams.get("date") ?? "";

  const [stageName, setStageName] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewers, setInterviewers] = useState<Interviewer[]>([
    { name: "", title: "" },
    { name: "", title: "" },
  ]);

  // Email paste state
  const [showEmailPaste, setShowEmailPaste] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractSuccess, setExtractSuccess] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Check we have required data
  useEffect(() => {
    if (!parentSessionId) {
      router.replace("/prep/new");
    }
  }, [parentSessionId, router]);

  const updateInterviewer = (index: number, field: keyof Interviewer, value: string) => {
    setInterviewers((prev) =>
      prev.map((iv, i) => (i === index ? { ...iv, [field]: value } : iv))
    );
  };

  const addInterviewer = () => {
    if (interviewers.length < 6) {
      setInterviewers((prev) => [...prev, { name: "", title: "" }]);
    }
  };

  const removeInterviewer = (index: number) => {
    if (interviewers.length > 1) {
      setInterviewers((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const extractFromEmail = async () => {
    if (!emailText.trim()) return;
    setExtracting(true);
    setExtractError(null);
    setExtractSuccess(null);

    try {
      const res = await fetch("/api/extract-panel-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_text: emailText }),
      });

      if (!res.ok) {
        setExtractError("Couldn't extract details from that email. Fill in manually below.");
        setExtracting(false);
        return;
      }

      const data = await res.json();

      // Auto-fill fields
      if (data.round_name && !stageName) {
        setStageName(data.round_name);
      }

      if (data.interviewers?.length > 0) {
        const extracted = data.interviewers.map((iv: { name?: string; title?: string }) => ({
          name: iv.name ?? "",
          title: iv.title ?? "",
        }));
        setInterviewers(extracted);
      }

      const count = data.interviewers?.length ?? 0;
      setExtractSuccess(
        `Found it — we pulled out ${count} interviewer${count !== 1 ? "s" : ""}${data.round_name ? ` and the round name` : ""}${data.format_notes ? ` with format notes` : ""}. Review and confirm below.`
      );
      setShowEmailPaste(false);
    } catch {
      setExtractError("Something went wrong. Fill in manually below.");
    }

    setExtracting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Store setup data and redirect to building/generation
    const validInterviewers = interviewers.filter((iv) => iv.name.trim());

    localStorage.setItem(
      "sp_new_prep",
      JSON.stringify({
        stageType: "presentation_defense",
        parentSessionId,
        stageName: stageName || "Panel Interview",
        interviewDate: interviewDate || null,
        interviewers: validInterviewers,
        companyName,
      })
    );

    router.push("/get-started/building");
  };

  if (!parentSessionId) return null;

  return (
    <main className="min-h-screen bg-[#F0F7FF] px-4 py-10">
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {/* Back link */}
        <Link
          href="/prep/new"
          className="text-xs text-[#9B8E82] hover:text-[#5C5347] transition-colors"
        >
          ← Back
        </Link>

        <h1 className="text-2xl font-semibold text-[#1C1713] mt-4 mb-6">
          Set up your panel prep
        </h1>

        {/* Linked submission card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            background: "rgba(232,115,90,0.06)",
            border: "1px solid rgba(232,115,90,0.2)",
            borderRadius: 10,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(232,115,90,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FileText style={{ width: 16, height: 16, color: "#E8735A" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#1C1713" }}>
              Linked to your {companyName} submission
            </p>
            <p style={{ fontSize: 11, color: "#9B8E82", marginTop: 2 }}>
              {parentStageName}{parentDate ? ` · ${parentDate}` : ""}
            </p>
          </div>
          <Check style={{ width: 16, height: 16, color: "#E8735A", flexShrink: 0, marginLeft: "auto" }} />
        </div>

        {/* Email paste section */}
        <div style={{ marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setShowEmailPaste(!showEmailPaste)}
            className="flex items-center gap-1.5 text-xs text-[#9B8E82] hover:text-[#5C5347] transition-colors"
          >
            {showEmailPaste ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Got an email about the panel? Paste it here and we&apos;ll fill this in automatically.
          </button>

          {showEmailPaste && (
            <div style={{ marginTop: 12 }}>
              <textarea
                placeholder="Paste the email from the recruiter..."
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                rows={5}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1.5px solid #E8E4DF",
                  fontSize: 13,
                  fontFamily: "inherit",
                  resize: "vertical",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={extractFromEmail}
                disabled={extracting || !emailText.trim()}
                style={{
                  marginTop: 8,
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #E8E4DF",
                  background: "#fff",
                  fontSize: 13,
                  cursor: extracting ? "wait" : "pointer",
                  fontFamily: "inherit",
                  color: "#5C5347",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {extracting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {extracting ? "Extracting..." : "Extract panel details"}
              </button>
            </div>
          )}

          {extractSuccess && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 14px",
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: 8,
                fontSize: 12,
                color: "#15803d",
                lineHeight: 1.5,
              }}
            >
              {extractSuccess}
            </div>
          )}

          {extractError && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 14px",
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: 8,
                fontSize: 12,
                color: "#dc2626",
                lineHeight: 1.5,
              }}
            >
              {extractError}
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Field 1: Round name */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1713", marginBottom: 6 }}
            >
              What did they call this round?
            </label>
            <input
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              placeholder="e.g. Panel interview, Presentation round..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1.5px solid #E8E4DF",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>

          {/* Field 2: Date */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1713", marginBottom: 6 }}
            >
              When is it?
            </label>
            <input
              type="datetime-local"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1.5px solid #E8E4DF",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <p style={{ fontSize: 11, color: "#9B8E82", marginTop: 4 }}>
              We&apos;ll send you a reminder with your live cheat sheet 1 hour before.
            </p>
          </div>

          {/* Field 3: Interviewers */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1713", marginBottom: 4 }}
            >
              Who&apos;s in the room?
            </label>
            <p style={{ fontSize: 11, color: "#9B8E82", marginBottom: 10 }}>
              Add their names and we&apos;ll research them automatically. Leave blank and we&apos;ll skip it.
            </p>

            {interviewers.map((iv, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <input
                  placeholder="Name"
                  value={iv.name}
                  onChange={(e) => updateInterviewer(i, "name", e.target.value)}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1.5px solid #E8E4DF",
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
                <input
                  placeholder="Title (optional)"
                  value={iv.title}
                  onChange={(e) => updateInterviewer(i, "title", e.target.value)}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1.5px solid #E8E4DF",
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
                {interviewers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInterviewer(i)}
                    style={{
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 6,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "#C5BDB5",
                      flexShrink: 0,
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {interviewers.length < 6 && (
              <button
                type="button"
                onClick={addInterviewer}
                className="flex items-center gap-1.5 text-xs text-[#9B8E82] hover:text-[#E8735A] transition-colors mt-1"
              >
                <Plus className="w-3 h-3" />
                Add another person
              </button>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "12px 20px",
              background: submitting ? "#C5BDB5" : "#E8735A",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? "wait" : "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Setting up..." : "Build my panel prep kit →"}
          </button>
        </form>
      </div>
    </main>
  );
}

// ─── Page wrapper ────────────────────────────────────────────────────────────

export default function PanelSetupPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F0F7FF] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#E8735A] border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <PanelSetupInner />
    </Suspense>
  );
}
