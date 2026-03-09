import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { auditLog } from "@/lib/security/audit";

/**
 * POST /api/user/spend-credit
 * Atomically deducts 1 credit using the spend_credit() database function
 * which uses FOR UPDATE row locking to prevent race conditions.
 * Body: { sessionId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use the atomic spend_credit() function with FOR UPDATE locking
    const admin = createAdminClient();

    const { data, error } = await admin.rpc("spend_credit", {
      p_user_id: auth.userId,
      p_answer_id: sessionId,
      p_description: "Prep kit generation",
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
        details: { sessionId, result: "insufficient" },
      });
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    auditLog({
      eventType: "credit_consumed",
      userId: auth.userId,
      details: { sessionId, result: "success" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[spend-credit] ERROR:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to process credit." }, { status: 500 });
  }
}
