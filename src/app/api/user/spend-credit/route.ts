import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use the atomic spend_credit() function with FOR UPDATE locking
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await admin.rpc("spend_credit", {
      p_user_id: user.id,
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
