import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sessionId: string;
      confidenceBefore?: number;
      confidenceAfter?: number;
      mostHelpfulCard?: string;
      leastHelpfulCard?: string;
      wouldRecommend?: boolean;
      disappointmentWithout?: string;
      whatElseWouldHelp?: string;
    };

    const { sessionId } = body;
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const db = adminDb();
    await db.from("session_feedback").insert({
      session_id: sessionId,
      confidence_before: body.confidenceBefore ?? null,
      confidence_after: body.confidenceAfter ?? null,
      most_helpful_card: body.mostHelpfulCard ?? null,
      least_helpful_card: body.leastHelpfulCard ?? null,
      would_recommend: body.wouldRecommend ?? null,
      disappointment_without: body.disappointmentWithout ?? null,
      what_else_would_help: body.whatElseWouldHelp ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("Session feedback insert failed:", err);
    return NextResponse.json({ ok: true });
  }
}
