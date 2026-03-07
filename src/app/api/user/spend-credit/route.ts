import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data === false) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
