"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Phone,
  Users,
  Mic,
  Star,
  Check,
  ArrowRight,
  Loader2,
  Target,
  Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { getSessionList, groupByCompany, type SessionSummary } from "@/lib/session/session-list";
import { useCredits } from "@/hooks/useCredits";
import { OutcomeUpdateCard, type PendingReport } from "@/components/dashboard/OutcomeUpdateCard";

// ─── Round config ──────────────────────────────────────────────────────────────

const ALL_ROUNDS = [
  { key: "recruiter", label: "Recruiter Screen", icon: Phone },
  { key: "hiring_manager", label: "Hiring Manager", icon: Users },
  { key: "role_play", label: "Cold Call / Roleplay", icon: Mic },
  { key: "panel", label: "Panel / Final", icon: Star },
] as const;

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ number, label }: { number: number | null; label: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[var(--shadow-card)]">
      <p className="text-2xl font-bold text-ink">
        {number === null ? <span className="text-ink-muted text-lg">—</span> : number}
      </p>
      <p className="text-xs text-ink-muted mt-0.5">{label}</p>
    </div>
  );
}

// ─── Date countdown helper ─────────────────────────────────────────────────────

function getCountdownInfo(interviewDate: string | undefined): { label: string; urgent: boolean } | null {
  if (!interviewDate) return null;
  const d = new Date(interviewDate + "T12:00:00");
  const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null; // Past
  if (diff === 0) return { label: "Today!", urgent: true };
  if (diff === 1) return { label: "Tomorrow", urgent: true };
  if (diff <= 3) return { label: `In ${diff} days`, urgent: true };
  if (diff <= 7) return { label: `In ${diff} days`, urgent: false };
  const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { label: formatted, urgent: false };
}

// ─── Prep Card ────────────────────────────────────────────────────────────────

function PrepCard({
  companyName,
  sessions,
}: {
  companyName: string;
  sessions: SessionSummary[];
}) {
  const latestSession = sessions[0];
  const doneRoundKeys = new Set(sessions.map((s) => s.stage));
  // Find the earliest upcoming interview date across all sessions for this company
  const upcomingDate = sessions
    .map((s) => s.interviewDate)
    .filter(Boolean)
    .sort()[0];
  const countdown = getCountdownInfo(upcomingDate);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-gray-200 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-ink">{companyName}</h3>
          <p className="text-sm text-ink-light mt-0.5">{latestSession.targetRole}</p>
        </div>
        {countdown && (
          <span
            className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              countdown.urgent
                ? "bg-orange-50 text-orange-600 border border-orange-200"
                : "bg-blue-50 text-blue-600 border border-blue-100"
            }`}
          >
            <Calendar className="w-3 h-3" />
            {countdown.label}
          </span>
        )}
      </div>

      {/* Round progress */}
      <div className="mt-4 space-y-1.5">
        {ALL_ROUNDS.map((round) => {
          const session = sessions.find((s) => s.stage === round.key);
          const isDone = doneRoundKeys.has(round.key);
          return (
            <div key={round.key} className="flex items-center gap-2 text-sm">
              <round.icon
                className={`w-3.5 h-3.5 flex-shrink-0 ${isDone ? "text-ink-light" : "text-ink-muted opacity-40"}`}
              />
              <span className={isDone ? "text-ink font-medium" : "text-ink-muted"}>
                {round.label}
              </span>
              {isDone ? (
                <Check className="w-3.5 h-3.5 text-green-500 ml-auto flex-shrink-0" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-gray-200 ml-auto flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      {latestSession && (
        <Link
          href={`/prep/${latestSession.id}`}
          className="mt-4 block text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
        >
          Open prep →
        </Link>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ firstName }: { firstName: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <Target className="w-12 h-12 text-ink-muted mb-4 opacity-60" />
      <h2 className="text-lg font-semibold text-ink mb-1">You&apos;re all set to start prepping.</h2>
      <p className="text-sm text-ink-muted mb-6 max-w-xs">
        Let&apos;s build your first interview prep kit, {firstName}.
      </p>
      <Link
        href="/get-started"
        className="max-w-xs w-full py-3.5 px-6 bg-[#FF6B4A] hover:bg-[#E85D3A] text-white font-bold rounded-xl text-base transition-colors shadow-md"
      >
        Start my first prep →
      </Link>
      <p className="text-xs text-ink-muted mt-3">Takes about 2 minutes · 3 free prep kits</p>
    </div>
  );
}

// ─── Dashboard Page ────────────────────────────────────────────────────────────

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  return "evening";
}

function getFirstName(user: User): string {
  const full =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined);
  if (full) return full.trim().split(/\s+/)[0];
  return user.email?.split("@")[0] ?? "there";
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionGroups, setSessionGroups] = useState<
    Array<{ companyName: string; sessions: SessionSummary[] }>
  >([]);
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const { balance: creditsRemaining } = useCredits();

  const filterDismissed = useCallback((reports: PendingReport[]) => {
    const DISMISS_COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000; // 5 days
    return reports.filter((r) => {
      const dismissedAt = localStorage.getItem(`sp_outcome_dismiss_${r.id}`);
      if (!dismissedAt) return true;
      return Date.now() - Number(dismissedAt) > DISMISS_COOLDOWN_MS;
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/login?redirectTo=/dashboard");
        return;
      }
      setUser(user);
      setSessionGroups(groupByCompany(getSessionList()));
      setLoading(false);

      // Fetch pending outcome reports
      fetch("/api/report/outcome")
        .then((res) => res.json())
        .then((json) => {
          if (json.reports?.length) {
            setPendingReports(filterDismissed(json.reports));
          }
        })
        .catch(() => {});
    });
  }, [router, filterDismissed]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-7 h-7 animate-spin text-primary-500" />
      </div>
    );
  }

  const firstName = getFirstName(user);
  const totalRounds = sessionGroups.reduce((acc, g) => acc + g.sessions.length, 0);

  return (
    <div className="space-y-0">
      {/* Greeting */}
      <h1 className="text-2xl font-bold text-ink">
        Good {getTimeOfDay()}, {firstName} 👋
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <StatCard number={sessionGroups.length} label="Active Preps" />
        <StatCard number={creditsRemaining} label="Credits Left" />
        <StatCard number={totalRounds} label="Rounds Prepped" />
      </div>

      {/* Outcome nudge cards */}
      {pendingReports.length > 0 && (
        <div className="mt-6 space-y-3">
          {pendingReports.map((report) => (
            <OutcomeUpdateCard
              key={report.id}
              report={report}
              onDismiss={(id) => setPendingReports((prev) => prev.filter((r) => r.id !== id))}
              onUpdated={(id) => setPendingReports((prev) => prev.filter((r) => r.id !== id))}
            />
          ))}
        </div>
      )}

      {/* Prep grid */}
      {sessionGroups.length === 0 ? (
        <EmptyState firstName={firstName} />
      ) : (
        <>
          <div className="flex items-center justify-between mt-8 mb-4">
            <h2 className="text-lg font-bold text-ink">Your Preps</h2>
            <Link
              href="/get-started"
              className="text-sm font-medium text-primary-500 hover:text-primary-600 flex items-center gap-1 transition-colors"
            >
              + New Prep <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessionGroups.map((group) => (
              <PrepCard
                key={group.companyName}
                companyName={group.companyName}
                sessions={group.sessions}
              />
            ))}

            {/* New prep card (always last) */}
            <Link
              href="/get-started"
              className="bg-cream-dark border-2 border-dashed border-gray-200 rounded-2xl p-5 hover:border-primary-500 hover:bg-primary-50/30 transition-all flex flex-col items-center justify-center text-center min-h-[160px]"
            >
              <Plus className="w-8 h-8 text-ink-muted mb-2" />
              <p className="text-sm font-medium text-ink">Start a new prep</p>
              <p className="text-xs text-ink-muted mt-1">Different company or role</p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
