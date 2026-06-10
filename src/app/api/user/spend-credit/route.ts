import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { auditLog } from "@/lib/security/audit";
import { checkAccess, resolveAnswerIdScope } from "@/lib/entitlements";

/**
 * POST /api/user/spend-credit
 *
 * Legacy route. Kept as the SINGLE choke point that every existing
 * client-side credit-spending call site (kit generation, per-answer
 * unlock, refinement) lands on, so the entitlement-first / credit-
 * fallback logic only has to live in one place for those clients.
 *
 * Behavior:
 *   1. Resolve answer_id → kit → (company, round) entirely server-side
 *      from prep_sessions. NEVER trust client-supplied company/round.
 *   2. Call checkAccess(action, scope).
 *      • allowed via entitlement → return ok WITHOUT calling spend_credit
 *      • allowed via credit       → fall through to spend_credit (legacy)
 *      • denied                   → return 402
 *   3. The action is derived from the answer_id prefix:
 *      - "unlock-<sid>-<type>"    → 'unlock'
 *      - "regen-<sid>-<type>-<t>" → 'refine'
 *      - "<sid>"                  → 'kit'
 *
 * Body: { sessionId: string } — but the field is interpreted as the
 * descriptive reference_id passed to spend_credit (the existing call
 * sites already send the full unlock-/regen- string).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const reference = typeof body?.sessionId === "string" ? body.sessionId : null;

    if (!reference) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Server-side scope resolution. The route resolves the kit and
    //    round from the prep_sessions row keyed by the UUID embedded in
    //    the reference string. Client cannot influence this scope.
    const { sessionId, company, round } = await resolveAnswerIdScope(auth.userId, reference);
    const action = inferAction(reference);

    // 2. Entitlement-first check, credit fallback.
    const access = await checkAccess(auth.userId, action, { company, round });

    if (access.source === "denied") {
      auditLog({
        eventType: "credit_consumed",
        userId: auth.userId,
        severity: "warning",
        details: { sessionId, action, result: "insufficient" },
      });
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    if (access.source === "entitlement") {
      auditLog({
        eventType: "credit_consumed",
        userId: auth.userId,
        details: {
          sessionId,
          action,
          result: "entitlement",
          entitlement_id: access.entitlement?.id,
          entitlement_type: access.entitlement?.type,
        },
      });
      return NextResponse.json({ ok: true, source: "entitlement" });
    }

    // 3. Legacy credit path. The reference string is what the original
    //    callers sent — keep passing it verbatim so credit_transactions
    //    rows match historical shapes.
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("spend_credit", {
      p_user_id: auth.userId,
      p_answer_id: reference,
      p_description: descriptionFor(action),
    });
    if (error) {
      console.error("[spend-credit] RPC error:", error.message, error.code);
      return NextResponse.json({ error: "Failed to process credit." }, { status: 500 });
    }
    if (data === false) {
      auditLog({
        eventType: "credit_consumed",
        userId: auth.userId,
        severity: "warning",
        details: { sessionId, action, result: "insufficient" },
      });
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    auditLog({
      eventType: "credit_consumed",
      userId: auth.userId,
      details: { sessionId, action, result: "credit" },
    });
    return NextResponse.json({ ok: true, source: "credit" });
  } catch (err) {
    console.error("[spend-credit] ERROR:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to process credit." }, { status: 500 });
  }
}

function inferAction(reference: string): "kit" | "unlock" | "refine" {
  if (reference.startsWith("regen-")) return "refine";
  if (reference.startsWith("unlock-")) return "unlock";
  return "kit";
}

function descriptionFor(action: "kit" | "unlock" | "refine"): string {
  switch (action) {
    case "kit":    return "Prep kit generation";
    case "unlock": return "Answer unlock";
    case "refine": return "Answer refinement";
  }
}
