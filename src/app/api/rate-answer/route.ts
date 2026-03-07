import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { RateAnswerInputSchema } from "@/lib/types/schemas";

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = RateAnswerInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { answerId, rating } = parsed.data;

    // In v1.0 (no Supabase auth), ratings are stored client-side in sessionStorage.
    // When Supabase is connected, this route will persist to generated_answers.rating.
    // For now, just echo back the rating to confirm receipt.

    return NextResponse.json({ answerId, rating, success: true });
  } catch (err) {
    console.error("Rate answer error:", err);
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }
}
