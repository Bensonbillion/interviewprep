"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Rocket,
  Frown,
  Clock,
  LogOut,
  Bell,
  ChevronRight,
  X,
} from "lucide-react";

export interface PendingReport {
  id: string;
  prep_session_id: string | null;
  company_name: string;
  role_title: string;
  stage: string;
  interview_date: string | null;
  created_at: string;
}

interface OutcomeUpdateCardProps {
  report: PendingReport;
  onDismiss: (reportId: string) => void;
  onUpdated: (reportId: string) => void;
}

type OutcomeChoice = "offer" | "advanced" | "rejected" | "waiting" | "withdrew";

const NEXT_STAGE_OPTIONS = [
  { value: "hiring_manager", label: "Hiring Manager" },
  { value: "role_play", label: "Roleplay / Cold Call" },
  { value: "panel", label: "Panel" },
  { value: "take_home", label: "Take Home" },
  { value: "final", label: "Final Round" },
  { value: "other", label: "Other" },
];

export function OutcomeUpdateCard({ report, onDismiss, onUpdated }: OutcomeUpdateCardProps) {
  const [choice, setChoice] = useState<OutcomeChoice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Offer fields
  const [baseSalary, setBaseSalary] = useState("");
  const [ote, setOte] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [whatMadeDifference, setWhatMadeDifference] = useState("");

  // Rejection fields
  const [rejectionFeedback, setRejectionFeedback] = useState("");
  const [whatWouldDoDifferently, setWhatWouldDoDifferently] = useState("");

  // Advanced fields
  const [nextStage, setNextStage] = useState("");

  async function submitOutcome() {
    if (!choice || choice === "waiting") return;
    setSubmitting(true);

    const outcomeMap: Record<string, string> = {
      offer: "offer",
      advanced: "advanced",
      rejected: "rejected",
      withdrew: "withdrew",
    };

    await fetch("/api/report/outcome", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: report.id,
        outcome: outcomeMap[choice],
        offerBaseSalary: baseSalary ? Number(baseSalary) : undefined,
        offerOte: ote ? Number(ote) : undefined,
        offerCurrency: currency || undefined,
        rejectionFeedback: rejectionFeedback.trim() || whatMadeDifference.trim() || undefined,
        whatWouldDoDifferently: whatWouldDoDifferently.trim() || undefined,
        nextStage: nextStage || undefined,
      }),
    }).catch(() => {});

    setSubmitted(true);
    setSubmitting(false);
    setTimeout(() => onUpdated(report.id), 2000);
  }

  function handleRemindLater() {
    // Store dismiss timestamp so we can show again in 5 days
    const key = `sp_outcome_dismiss_${report.id}`;
    localStorage.setItem(key, String(Date.now()));
    onDismiss(report.id);
  }

  if (submitted) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[var(--shadow-card)]">
        <p className="text-sm font-medium text-ink text-center">
          {choice === "offer" ? "Congrats! Thanks for sharing." : "Thanks for updating. Every data point helps."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-[var(--shadow-card)] relative">
      {/* Dismiss X */}
      <button
        onClick={handleRemindLater}
        className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-2.5 mb-4">
        <Bell className="w-4.5 h-4.5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-ink">
            How did your {report.company_name} interview go?
          </p>
          <p className="text-xs text-ink-muted mt-0.5">
            {report.role_title} &middot; {report.stage.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      {/* Choice not yet made */}
      {!choice && (
        <div className="space-y-2">
          <OutcomeButton
            icon={<Trophy className="w-4 h-4" />}
            label="Got an offer!"
            onClick={() => setChoice("offer")}
            className="text-green-700 bg-green-50 border-green-100 hover:bg-green-100"
          />
          <OutcomeButton
            icon={<Rocket className="w-4 h-4" />}
            label="Advanced to next round"
            onClick={() => setChoice("advanced")}
            className="text-blue-700 bg-blue-50 border-blue-100 hover:bg-blue-100"
          />
          <OutcomeButton
            icon={<Frown className="w-4 h-4" />}
            label="Didn't get it"
            onClick={() => setChoice("rejected")}
            className="text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100"
          />
          <OutcomeButton
            icon={<Clock className="w-4 h-4" />}
            label="Still waiting..."
            onClick={handleRemindLater}
            className="text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100"
          />
          <OutcomeButton
            icon={<LogOut className="w-4 h-4" />}
            label="I withdrew"
            onClick={() => setChoice("withdrew")}
            className="text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100"
          />
        </div>
      )}

      {/* Offer follow-up */}
      {choice === "offer" && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink">
            Congrats! Quick question — what was the offer?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Base salary"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <input
              type="number"
              placeholder="OTE"
              value={ote}
              onChange={(e) => setOte(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
            <option value="AUD">AUD</option>
          </select>
          <textarea
            placeholder="What do you think made the difference? (optional)"
            value={whatMadeDifference}
            onChange={(e) => setWhatMadeDifference(e.target.value)}
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
          <button
            onClick={submitOutcome}
            disabled={submitting}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
          <button onClick={() => setChoice(null)} className="w-full text-xs text-gray-400 hover:text-gray-600">
            Back
          </button>
        </div>
      )}

      {/* Rejection follow-up */}
      {choice === "rejected" && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink">
            That&apos;s tough. Did they give you feedback?
          </p>
          <textarea
            placeholder="Any feedback they shared (optional)"
            value={rejectionFeedback}
            onChange={(e) => setRejectionFeedback(e.target.value)}
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
          <textarea
            placeholder="What would you do differently? (optional)"
            value={whatWouldDoDifferently}
            onChange={(e) => setWhatWouldDoDifferently(e.target.value)}
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
          <button
            onClick={submitOutcome}
            disabled={submitting}
            className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
          {report.prep_session_id && (
            <Link
              href={`/get-started?from=${report.prep_session_id}`}
              className="flex items-center justify-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors mt-1"
            >
              Prep for your next one <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
          <button onClick={() => setChoice(null)} className="w-full text-xs text-gray-400 hover:text-gray-600">
            Back
          </button>
        </div>
      )}

      {/* Withdrew follow-up */}
      {choice === "withdrew" && (
        <div className="space-y-3">
          <button
            onClick={submitOutcome}
            disabled={submitting}
            className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Confirm"}
          </button>
          <button onClick={() => setChoice(null)} className="w-full text-xs text-gray-400 hover:text-gray-600">
            Back
          </button>
        </div>
      )}

      {/* Advanced follow-up */}
      {choice === "advanced" && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink">
            Which stage is next?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {NEXT_STAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setNextStage(opt.value)}
                className={`text-sm px-3 py-2 rounded-xl border transition-colors ${
                  nextStage === opt.value
                    ? "border-primary-400 bg-primary-50 text-primary-700 font-medium"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={submitOutcome}
            disabled={submitting}
            className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
          {report.prep_session_id && nextStage && (
            <Link
              href={`/get-started?company=${encodeURIComponent(report.company_name)}&role=${encodeURIComponent(report.role_title)}&stage=${nextStage}&from=${report.prep_session_id}`}
              className="flex items-center justify-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
            >
              Create prep kit for next round <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
          <button onClick={() => setChoice(null)} className="w-full text-xs text-gray-400 hover:text-gray-600">
            Back
          </button>
        </div>
      )}
    </div>
  );
}

function OutcomeButton({
  icon,
  label,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}
