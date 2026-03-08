/**
 * Lightweight session summaries stored in localStorage.
 * Used by the sidebar and dashboard to list preps without loading full sessionStorage data.
 */

export interface SessionSummary {
  id: string;
  companyName: string;
  targetRole: string;
  roleType: string;
  stage: string;
  createdAt: number;
  interviewDate?: string; // ISO date string, e.g. "2025-03-06"
}

const SESSION_LIST_KEY = "sp_session_list";
const MAX_SESSIONS = 50;

export function getSessionList(): SessionSummary[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SESSION_LIST_KEY) ?? "[]") as SessionSummary[];
  } catch {
    return [];
  }
}

export function addToSessionList(summary: SessionSummary): void {
  if (typeof window === "undefined") return;
  const existing = getSessionList();
  const updated = [summary, ...existing.filter((s) => s.id !== summary.id)].slice(0, MAX_SESSIONS);
  localStorage.setItem(SESSION_LIST_KEY, JSON.stringify(updated));
}

/** Group sessions by company name (preserves creation order within groups) */
export function groupByCompany(sessions: SessionSummary[]): Array<{
  companyName: string;
  sessions: SessionSummary[];
}> {
  const map = new Map<string, SessionSummary[]>();
  for (const s of sessions) {
    const key = s.companyName;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries()).map(([companyName, sessions]) => ({
    companyName,
    sessions,
  }));
}
