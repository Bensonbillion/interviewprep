import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApiAuth } from "@/lib/auth/verify";
import { sessionFeedbackSchema } from "@/lib/validation/schemas";

function adminDb() {
  return createAdminClient();
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = sessionFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { sessionId, ...rest } = parsed.data;

    const db = adminDb();
    await db.from("session_feedback").insert({
      session_id: sessionId,
      confidence_before: rest.confidenceBefore ?? null,
      confidence_after: rest.confidenceAfter ?? null,
      most_helpful_card: rest.mostHelpfulCard ?? null,
      least_helpful_card: rest.leastHelpfulCard ?? null,
      would_recommend: rest.wouldRecommend ?? null,
      disappointment_without: rest.disappointmentWithout ?? null,
      what_else_would_help: rest.whatElseWouldHelp ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("Session feedback insert failed:", err);
    return NextResponse.json({ ok: true });
  }
}
