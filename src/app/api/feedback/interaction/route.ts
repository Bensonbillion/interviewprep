import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApiAuth } from "@/lib/auth/verify";
import { feedbackLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { interactionSchema } from "@/lib/validation/schemas";

function adminDb() {
  return createAdminClient();
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(feedbackLimiter, auth.userId);
  if (!allowed) {
    return NextResponse.json({ ok: true });
  }

  try {
    const body = await req.json();
    const parsed = interactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { interactions } = parsed.data;

    if (!interactions.length) {
      return NextResponse.json({ ok: true });
    }

    const db = adminDb();
    await db.from("answer_interactions").insert(interactions);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("Interaction batch insert failed:", err);
    return NextResponse.json({ ok: true });
  }
}
