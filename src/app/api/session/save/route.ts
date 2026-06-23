import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessionSaveSchema } from "@/lib/validation/schemas";
import { apiLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { checkAccess } from "@/lib/entitlements";

/**
 * POST /api/session/save
 * Upserts a PrepSession blob into prep_sessions.
 *
 * Two call sites today (verified during Session 3 audit):
 *   • GenerationScreen.tsx:218 — initial kit creation
 *   • PrepSessionView.tsx:425  — debounced 2s update on slot changes
 *
 * Access gate (closes the gap noted at the end of Session 2A):
 *   1. Auth + rate limit + Zod (existing).
 *   2. Reject if top-level companyName mismatches sessionData.companyName.
 *   3. If the prep_sessions row already exists AND is owned by this
 *      user → bypass checkAccess. Updates to an owned kit are free; the
 *      entitlement (or credit) was consumed at creation time.
 *   4. Otherwise (first save) → checkAccess(userId, 'kit', { company, round }).
 *      Allow on 'entitlement' or 'credit' (legacy grandfather path);
 *      403 on 'denied'.
 *
 * Scope used by checkAccess comes from the validated request body, not
 * from any client-trusted source. The body is already Zod-validated;
 * Session 2A's resolveSessionScope would return the SAME values once the
 * row existed, so first-save-from-body is consistent with later checks.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, headers: rlHeaders } = await checkRateLimit(apiLimiter, auth.userId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: rlHeaders }
      );
    }

    const body = await req.json();
    const validation = sessionSaveSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { sessionId, sessionData, companyName: topCompanyName } = validation.data;
    const sd = sessionData as Record<string, unknown>;
    const innerCompanyName = (sd.companyName as string | undefined) ?? "";
    const stage = (sd.stage as string | undefined) ?? "recruiter";

    // ── companyName parity check ──────────────────────────────────────
    // The body has two places that name the company. They MUST match —
    // a mismatch usually means a client trying to slip a different scope
    // past the gate by putting one company at the top and another inside.
    // Treat as malformed request.
    if (innerCompanyName && topCompanyName && innerCompanyName !== topCompanyName) {
      return NextResponse.json(
        { error: "companyName mismatch between sessionData and top-level field" },
        { status: 400 }
      );
    }
    const validatedCompany = topCompanyName || innerCompanyName || null;

    const supabase = createAdminClient();

    // ── Skip the gate when this is an UPDATE to a kit the caller owns. ──
    // Look up the row by id. If it exists and the user is the owner, we
    // treat the request as an idempotent update — the entitlement was
    // consumed at creation, and PrepSessionView issues these every 2s
    // during answer edits. The check itself is cheap (PK lookup).
    const { data: existing, error: existingErr } = await supabase
      .from("prep_sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (existingErr) {
      console.error("[session/save] Existence check failed:", existingErr.message);
      return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
    }

    if (existing) {
      // If the row exists but belongs to a different user, refuse — never
      // let one user write over another's kit even though the upsert PK
      // would overwrite without RLS on the service-role client.
      if (existing.user_id !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Otherwise, owned-update path: skip checkAccess.
    } else {
      // ── First save — gate on access ─────────────────────────────────
      const access = await checkAccess(auth.userId, "kit", {
        company: validatedCompany,
        round: stage,
      });
      if (access.source === "denied") {
        return NextResponse.json(
          {
            error: "out_of_credits",
            message:
              "You're out of credits and don't have an entitlement that covers this kit. " +
              "Visit /pricing to unlock more.",
          },
          { status: 403 }
        );
      }
      // access.source === 'entitlement' or 'credit' → allow.
      // The entitlement isn't "consumed" in any state-mutating way; the
      // legacy credit grandfather is also non-deducting at this gate —
      // the existing client-side spend-credit fire-and-forget call does
      // the actual users.credit_balance decrement, preserving existing
      // accounting for legacy accounts.
    }

    const { error } = await supabase
      .from("prep_sessions")
      .upsert(
        {
          id: sessionId,
          user_id: auth.userId,
          session_data: sessionData,
          job_description: (sd.jobDescription as string) ?? "",
          target_role: (sd.targetRole as string) ?? "",
          role_type: (sd.roleType as string) ?? "sdr_bdr",
          stage,
          relevance_map: sd.relevanceMap ?? {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) {
      console.error("[session/save] Supabase upsert error:", error);
      return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[session/save] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
