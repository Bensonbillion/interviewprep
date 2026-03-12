"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ChevronRight,
  Plus,
  Settings,
  CreditCard,
  Phone,
  Users,
  Mic,
  Star,
} from "lucide-react";
import { getSessionList, groupByCompany, type SessionSummary } from "@/lib/session/session-list";

// ─── Round config ──────────────────────────────────────────────────────────────

const ROUNDS = [
  { key: "recruiter", label: "Recruiter Screen", icon: Phone },
  { key: "hiring_manager", label: "Hiring Manager", icon: Users },
  { key: "role_play", label: "Cold Call / Roleplay", icon: Mic },
  { key: "panel", label: "Panel / Final", icon: Star },
] as const;

// ─── Company group ─────────────────────────────────────────────────────────────

function CompanyGroup({
  companyName,
  sessions,
  activeSessionId,
  defaultExpanded,
}: {
  companyName: string;
  sessions: SessionSummary[];
  activeSessionId: string | null;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const router = useRouter();

  const doneRoundKeys = new Set(sessions.map((s) => s.stage));
  const sessionByStage = Object.fromEntries(sessions.map((s) => [s.stage, s]));
  const roundCount = sessions.length;

  const handleUnpreppedRound = (roundKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    const existingSession = sessions[0];
    if (!existingSession) return;

    const fullSession = (() => {
      try {
        const raw = sessionStorage.getItem(`session-${existingSession.id}`);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

    if (fullSession?.resume) {
      localStorage.setItem("sp_gs_resume", JSON.stringify(fullSession.resume));
    }
    localStorage.setItem("sp_gs_role", existingSession.roleType);
    localStorage.setItem(
      "sp_gs_details",
      JSON.stringify({
        companyName: existingSession.companyName,
        companyUrl: fullSession?.companyUrl ?? "",
        targetRole: existingSession.targetRole,
        jobDescription: fullSession?.jobDescription ?? "",
        stage: roundKey,
      })
    );
    router.push("/get-started/building");
  };

  return (
    <div>
      {/* Company header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-stone-100/60 dark:hover:bg-white/5 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <ChevronRight
            className={`w-3.5 h-3.5 flex-shrink-0 text-[var(--text-tertiary)] transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
          />
          <span className="truncate">{companyName}</span>
        </span>
        <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0 ml-1">{roundCount}</span>
      </button>

      {/* Rounds */}
      {expanded && (
        <div className="mt-0.5 mb-1">
          {ROUNDS.map((round) => {
            const session = sessionByStage[round.key];
            const isDone = doneRoundKeys.has(round.key);
            const isActive = session?.id === activeSessionId;

            if (isDone && session) {
              return (
                <Link
                  key={round.key}
                  href={`/prep/${session.id}`}
                  className={`flex items-center gap-2 pl-8 pr-3 py-1.5 text-sm rounded-lg transition-colors ${
                    isActive
                      ? "bg-[var(--coral-bg)] text-coral-dark dark:text-[var(--coral-text)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-stone-100/60 dark:hover:bg-white/5"
                  }`}
                >
                  <round.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{round.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={round.key}
                type="button"
                onClick={(e) => handleUnpreppedRound(round.key, e)}
                className="w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-stone-100/60 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <round.icon className="w-3.5 h-3.5 flex-shrink-0 opacity-40" />
                <span className="truncate opacity-60">{round.label}</span>
                <Plus className="w-3 h-3 ml-auto flex-shrink-0 opacity-40" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const [sessionList, setSessionList] = useState<SessionSummary[]>([]);

  useEffect(() => {
    setSessionList(getSessionList());
  }, []);

  const activeSessionId = pathname.startsWith("/prep/")
    ? pathname.split("/prep/")[1]?.split("/")[0] ?? null
    : null;

  const activeSession = sessionList.find((s) => s.id === activeSessionId);
  const activeCompany = activeSession?.companyName ?? null;

  const groups = groupByCompany(sessionList);

  return (
    <aside
      className={`w-[240px] min-w-[240px] h-[calc(100vh-3.5rem)] sticky top-14 bg-white/60 dark:bg-[var(--bg-card)]/60 border-r border-stone-200/40 dark:border-white/5 flex flex-col overflow-y-auto overflow-x-hidden scrollbar-none ${className}`}
    >
      {/* Dashboard link */}
      <div className="px-2 pt-3 pb-1">
        <Link
          href="/dashboard"
          className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-all duration-150 ${
            pathname === "/dashboard"
              ? "bg-white dark:bg-white/10 text-coral-dark dark:text-[var(--coral-text)] font-semibold shadow-card"
              : "text-[var(--text-secondary)] hover:bg-stone-100/60 dark:hover:bg-white/5"
          }`}
        >
          <Home className="w-4 h-4 flex-shrink-0" />
          Dashboard
        </Link>
      </div>

      {/* My Preps section */}
      {groups.length > 0 && (
        <div className="px-2 mt-3">
          <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-3 py-1.5">
            My Preps
          </p>
          <div className="space-y-0.5">
            {groups.map((group) => (
              <CompanyGroup
                key={group.companyName}
                companyName={group.companyName}
                sessions={group.sessions}
                activeSessionId={activeSessionId}
                defaultExpanded={group.companyName === activeCompany}
              />
            ))}
          </div>
        </div>
      )}

      {/* New prep CTA */}
      <div className="px-2 mt-3">
        <Link
          href="/get-started"
          className="block py-2.5 px-3 border-2 border-dashed border-stone-200 dark:border-white/10 rounded-xl text-sm font-medium text-[var(--text-tertiary)] hover:border-coral hover:text-coral-dark dark:hover:text-[var(--coral-text)] transition-colors text-center"
        >
          + New prep
        </Link>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom links */}
      <div className="border-t border-stone-200/40 dark:border-white/5 px-2 pt-2 pb-4">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-tertiary)] hover:bg-stone-100/60 dark:hover:bg-white/5 rounded-xl transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <Link
          href="/dashboard/billing"
          className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-tertiary)] hover:bg-stone-100/60 dark:hover:bg-white/5 rounded-xl transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          Credits &amp; Billing
        </Link>
      </div>
    </aside>
  );
}
