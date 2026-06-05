import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyApiAuth } from "@/lib/auth/verify";
import { aiLimiter, checkRateLimit, buildRateLimitResponse } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin-config";
import { runPositioningEngine } from "@/lib/positioning/engine";
import type { CompetitiveDynamic, PrepSession } from "@/types";

const InputSchema = z.object({
  session_id: z.string().uuid(),
  refresh: z.boolean().optional(),
});

/**
 * Re-run the Positioning Engine for an existing session — debugging,
 * admin refresh, manual recomputation. Same engine used by create-session;
 * idempotent because the brief is unique on session_id and the engine
 * upserts.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(aiLimiter, auth.userId);
    if (!rl.allowed) return buildRateLimitResponse("positioning", rl);

    const body = await req.json().catch(() => ({}));
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { session_id, refresh } = parsed.data;

    // Load the session, verify ownership (or admin override).
    const db = createAdminClient();
    const { data: sessionRow, error: sessionErr } = await db
      .from("prep_sessions")
      .select("id, user_id, session_data")
      .eq("id", session_id)
      .maybeSingle();

    if (sessionErr || !sessionRow) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const isOwner = sessionRow.user_id === auth.userId;
    const isAdmin = ADMIN_EMAILS.includes(auth.email);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const session = sessionRow.session_data as PrepSession;
    if (!session?.resume || !session?.company) {
      return NextResponse.json(
        { error: "Session is missing resume or company context required to run the engine" },
        { status: 422 }
      );
    }

    const brief = await runPositioningEngine(
      sessionRow.id as string,
      session.resume,
      session.company,
      session.roleType,
      session.stage,
      { refresh, targetCompanyUrl: session.companyUrl }
    );

    // Hydrate the competitive_dynamic on read for clients that want it
    // without a second round-trip.
    let competitive_dynamic: CompetitiveDynamic | null = brief.competitive_dynamic ?? null;
    if (!competitive_dynamic && brief.competitive_dynamic_id) {
      const { data: dyn } = await db
        .from("competitive_dynamics")
        .select("*")
        .eq("id", brief.competitive_dynamic_id)
        .maybeSingle();
      competitive_dynamic = (dyn as CompetitiveDynamic | null) ?? null;
    }

    // 045: surface the engine's degrade signal. The engine no longer
    // throws for missable failures — it falls through to a fallback
    // brief and persists interrogation_source = 'fallback'. Callers use
    // {degraded, degrade_reason} to log/track without inferring from
    // status codes. degraded === true is still a 200; the engine's job
    // is to always ship a renderable brief.
    const degraded = brief.interrogation_source === "fallback";
    const degrade_reason = degraded
      ? "engine_served_fallback_interrogation_set"
      : null;

    return NextResponse.json({
      positioning_brief: brief,
      competitive_dynamic,
      degraded,
      degrade_reason,
    });
  } catch (err) {
    // True unexpected errors only (e.g. DB outage on session lookup).
    // The engine itself is degrade-not-throw — see runPositioningEngine.
    console.error("[/api/positioning] unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to run positioning engine" },
      { status: 500 }
    );
  }
}
