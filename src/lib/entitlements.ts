import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Entitlement access check.
 *
 * Replaces the credit-metering path for NEW code per Session 2A. Credits
 * remain as a legacy READ fallback so grandfathered accounts continue to
 * work; no new code WRITES credits.
 *
 * The brief's rule, enforced here:
 *   1. Active search_pass → allow all actions until expiry
 *   2. Active full_interview at company → allow all actions at that company,
 *      including live_mode
 *   3. Active single_round at company AND round → allow non-live_mode
 *      actions for that (company, round) tuple ONLY
 *   4. Otherwise → fall back to legacy users.credit_balance > 0
 *   5. Otherwise → denied
 *
 * IMPORTANT SCOPE-RESOLUTION RULE:
 *   Callers MUST resolve company/round entirely server-side from
 *   prep_sessions before invoking checkAccess. Never accept
 *   client-supplied company/kit/round on any access check. The legacy
 *   spend-credit route demonstrates the resolve-from-DB pattern.
 *
 * Session 3 wires Stripe checkout to actually INSERT entitlements rows.
 * Until then the legacy credit-fallback branch is the path users hit.
 */

export type EntitlementType = "single_round" | "full_interview" | "search_pass";

export type AccessAction =
  | "kit"        // kit generation
  | "unlock"     // per-answer unlock
  | "refine"     // regen past FREE_REGENS
  | "custom"     // custom question
  | "live_mode"; // Live Mode (transcript analysis, teleprompter unlock, etc.)

export interface AccessScope {
  /** Canonical company name from prep_sessions.session_data.companyName. */
  company?: string | null;
  /** InterviewStage value (recruiter / hiring_manager / role_play / panel / take_home). */
  round?: string | null;
}

export type AccessSource = "entitlement" | "credit" | "denied";

export interface AccessResult {
  allowed: boolean;
  source: AccessSource;
  /** Present when source === 'entitlement'. */
  entitlement?: {
    id: string;
    type: EntitlementType;
    expires_at: string | null;
  };
  /** Present when source === 'credit'. The remaining balance after the (future) deduction would happen. */
  credit_balance?: number;
}

/**
 * Server-side entitlement-first access check with a legacy credit
 * fallback.
 *
 * Entitlement check goes through the SQL has_entitlement() function so
 * the matching logic is identical between TypeScript callers and any
 * pgTAP / direct-SQL caller. The credit fallback is purely a TypeScript
 * concern — we deliberately keep it out of has_entitlement() so the
 * legacy grandfather path is greppable here.
 */
export async function checkAccess(
  userId: string,
  action: AccessAction,
  scope: AccessScope = {}
): Promise<AccessResult> {
  const db = createAdminClient();

  // ── 1. Entitlement check (pass → full_interview → single_round). ────
  const { data: entRow, error: entErr } = await db.rpc("has_entitlement", {
    p_user_id: userId,
    p_action: action,
    p_company: scope.company ?? null,
    p_round: scope.round ?? null,
  });
  if (entErr) {
    // Don't fall through to credits if the RPC itself is broken — that
    // would silently grandfather everyone past a real access gate.
    console.error("[checkAccess] has_entitlement RPC failed:", entErr.message);
    return { allowed: false, source: "denied" };
  }
  if (entRow === true) {
    // Resolve which entitlement covered the action so callers can show
    // honest UI ("Covered by your Full Interview at Samsara"). Pass
    // takes precedence; then full_interview at the company; then
    // single_round at (company, round).
    const ent = await resolveCoveringEntitlement(db, userId, action, scope);
    return ent
      ? { allowed: true, source: "entitlement", entitlement: ent }
      : { allowed: true, source: "entitlement" };
  }

  // ── 2. Legacy credit fallback. ──────────────────────────────────────
  // Read users.credit_balance directly. We intentionally do NOT count
  // pending-but-not-yet-deducted credits — the caller will invoke
  // spend_credit() (which uses FOR UPDATE locking) to actually deduct.
  const { data: userRow, error: userErr } = await db
    .from("users")
    .select("credit_balance")
    .eq("id", userId)
    .maybeSingle();
  if (userErr) {
    console.error("[checkAccess] users.credit_balance lookup failed:", userErr.message);
    return { allowed: false, source: "denied" };
  }
  const balance = (userRow?.credit_balance ?? 0) as number;
  if (balance > 0) {
    return { allowed: true, source: "credit", credit_balance: balance };
  }

  return { allowed: false, source: "denied", credit_balance: 0 };
}

async function resolveCoveringEntitlement(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  action: AccessAction,
  scope: AccessScope
): Promise<AccessResult["entitlement"] | undefined> {
  const nowIso = new Date().toISOString();

  // search_pass first (covers everything until expiry).
  const { data: pass } = await db
    .from("entitlements")
    .select("id, type, expires_at")
    .eq("user_id", userId)
    .eq("type", "search_pass")
    .eq("status", "active")
    .gt("expires_at", nowIso)
    .maybeSingle();
  if (pass) return pass as AccessResult["entitlement"];

  if (!scope.company) return undefined;

  // full_interview at company.
  const { data: full } = await db
    .from("entitlements")
    .select("id, type, expires_at")
    .eq("user_id", userId)
    .eq("type", "full_interview")
    .eq("status", "active")
    .eq("company_scope", scope.company)
    .maybeSingle();
  if (full) return full as AccessResult["entitlement"];

  // single_round at (company, round) — not for live_mode.
  if (action === "live_mode" || !scope.round) return undefined;
  const { data: round } = await db
    .from("entitlements")
    .select("id, type, expires_at")
    .eq("user_id", userId)
    .eq("type", "single_round")
    .eq("status", "active")
    .eq("company_scope", scope.company)
    .eq("round_scope", scope.round)
    .maybeSingle();
  if (round) return round as AccessResult["entitlement"];

  return undefined;
}

/**
 * Resolve a prep_sessions row to its (company, round) scope without
 * trusting any client input. Used by every server-side access-check site
 * — never accept company/round from the request body.
 *
 * Returns null when the session row doesn't exist OR the caller isn't
 * the owner. Callers must treat null as a denial.
 */
export async function resolveSessionScope(
  userId: string,
  sessionId: string
): Promise<{ company: string | null; round: string | null } | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("prep_sessions")
    .select("user_id, stage, session_data")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data) return null;
  if (data.user_id !== userId) return null;

  // company name lives inside session_data per migration 030's convention.
  // Fall back to null if the field is missing.
  const sessionData = (data.session_data ?? {}) as { companyName?: string; company?: { name?: string } };
  const company =
    sessionData.companyName ??
    sessionData.company?.name ??
    null;
  const round = (data.stage as string | null) ?? null;

  return { company, round };
}

/**
 * Resolve an answer_id (the descriptive reference passed into
 * spend_credit) back to its session, then to its (company, round). The
 * spend-credit route accepts answer_id strings like:
 *   "unlock-<sessionId>-<type>"
 *   "regen-<sessionId>-<type>-<timestamp>"
 *   "<sessionId>"                       (kit generation)
 * Parses the sessionId out and resolves from there.
 */
export async function resolveAnswerIdScope(
  userId: string,
  answerId: string
): Promise<{ sessionId: string | null; company: string | null; round: string | null }> {
  const sessionId = extractSessionIdFromAnswerId(answerId);
  if (!sessionId) return { sessionId: null, company: null, round: null };
  const scope = await resolveSessionScope(userId, sessionId);
  if (!scope) return { sessionId, company: null, round: null };
  return { sessionId, company: scope.company, round: scope.round };
}

const SESSION_ID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function extractSessionIdFromAnswerId(answerId: string): string | null {
  // Pure UUID — kit generation passes the sessionId directly.
  if (SESSION_ID_RE.test(answerId) && answerId.length === 36) return answerId;
  // Otherwise pull the first UUID-shaped substring (unlock-<sid>-<type>, regen-<sid>-<type>-<ts>, etc.).
  const m = answerId.match(SESSION_ID_RE);
  return m ? m[0] : null;
}
