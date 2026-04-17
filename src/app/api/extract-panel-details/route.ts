import { NextRequest, NextResponse } from "next/server";
import { anthropic, HAIKU } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { apiLimiter, checkRateLimit } from "@/lib/security/rate-limit";

/**
 * POST /api/extract-panel-details
 * Extracts panel interview details from a recruiter email.
 * Body: { email_text: string }
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
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: rlHeaders }
      );
    }

    const body = await req.json();
    const emailText = typeof body?.email_text === "string" ? body.email_text.trim() : "";

    if (!emailText || emailText.length < 20) {
      return NextResponse.json({ error: "Email text too short" }, { status: 400 });
    }

    if (emailText.length > 10000) {
      return NextResponse.json({ error: "Email text too long (max 10,000 chars)" }, { status: 400 });
    }

    const result = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Extract panel interview details from this recruiter email.
Return ONLY valid JSON with no markdown fencing:
{
  "round_name": "what they called it, e.g. Panel Interview",
  "duration_minutes": number or null,
  "interviewers": [
    { "name": "first last", "title": "their title if mentioned" }
  ],
  "format_notes": "any notes about format or agenda",
  "date_hint": "any date or time mentioned, as a string"
}

If a field cannot be determined from the email, use null.
For interviewers, only include people explicitly named as attending the interview.

EMAIL:
${emailText}`,
        },
      ],
    });

    const textBlock = result.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Could not parse email" }, { status: 422 });
    }

    try {
      const cleaned = textBlock.text
        .replace(/^```(?:json)?\s*/gi, "")
        .replace(/\s*```\s*$/gi, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: "Could not parse email" }, { status: 422 });
    }
  } catch (err) {
    console.error("[extract-panel-details] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to extract details" }, { status: 500 });
  }
}
