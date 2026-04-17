import { NextRequest, NextResponse } from "next/server";
import { anthropic, HAIKU } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { auditLog } from "@/lib/security/audit";
import { voiceProfileSchema } from "@/lib/validation/schemas";

/**
 * GET /api/voice-profile
 * Fetch the current user's voice profile.
 */
export async function GET() {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();
    const { data, error } = await db
      .from("user_voice_profiles")
      .select("*")
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (error) {
      console.error("[voice-profile] GET error:", error.message);
      return NextResponse.json({ error: "Failed to fetch voice profile" }, { status: 500 });
    }

    return NextResponse.json({ profile: data ?? null });
  } catch (err) {
    console.error("[voice-profile] GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to fetch voice profile" }, { status: 500 });
  }
}

/**
 * POST /api/voice-profile
 * Save writing samples and generate voice_summary + style_notes via Claude Haiku.
 * Body: { samples: [{ type: 'email'|'linkedin'|'story', text: string }] }
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
    const parsed = voiceProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { samples } = parsed.data;

    // Build the sample text block for analysis
    const sampleBlock = samples
      .map((s, i) => `--- Sample ${i + 1} (${s.type}) ---\n${s.text}`)
      .join("\n\n");

    // Analyze voice with Claude Haiku
    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1000,
      system: "You analyze writing samples and return structured JSON. Return ONLY valid JSON, no markdown fencing.",
      messages: [
        {
          role: "user",
          content: `Analyze these writing samples from a sales professional. Return a JSON object with:

- formality_score (integer 1-5, where 1=very casual, 5=very formal)
- uses_contractions (boolean — do they use contractions naturally?)
- sentence_avg_words (number — average words per sentence across all samples)
- hedging_phrases (string[] — phrases they use to soften statements, e.g. "I think", "kind of", "sort of", "I guess", "basically". List only phrases that actually appear in the samples.)
- common_openers (string[] — how they tend to start sentences or paragraphs. List only openers that actually appear.)
- voice_summary (string — a 2-3 sentence paragraph describing their natural writing voice. CRITICAL: Write this as a positive instruction to an AI model, e.g.: "This person writes in short punchy sentences. They use contractions naturally. They open with context before asking. They never use em-dashes. They prefer 'find out' over 'discover' and 'use' over 'leverage'.")

The voice_summary must be specific enough that an AI model reading it could mimic this person's writing style. Do NOT be generic — cite specific patterns from the samples.

WRITING SAMPLES:
${sampleBlock}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Failed to analyze voice" }, { status: 500 });
    }

    let analysis: {
      formality_score?: number;
      uses_contractions?: boolean;
      sentence_avg_words?: number;
      hedging_phrases?: string[];
      common_openers?: string[];
      voice_summary?: string;
    };

    try {
      const cleaned = textBlock.text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      analysis = JSON.parse(cleaned);
    } catch {
      console.error("[voice-profile] Failed to parse Haiku response:", textBlock.text.slice(0, 200));
      return NextResponse.json({ error: "Failed to parse voice analysis" }, { status: 500 });
    }

    const styleNotes = {
      formality_score: analysis.formality_score,
      uses_contractions: analysis.uses_contractions,
      sentence_avg_words: analysis.sentence_avg_words,
      hedging_phrases: analysis.hedging_phrases ?? [],
      common_openers: analysis.common_openers ?? [],
    };

    const voiceSummary = analysis.voice_summary ?? null;

    // Upsert into user_voice_profiles
    const db = createAdminClient();
    const { data: profile, error: dbErr } = await db
      .from("user_voice_profiles")
      .upsert(
        {
          user_id: auth.userId,
          samples,
          style_notes: styleNotes,
          voice_summary: voiceSummary,
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (dbErr) {
      console.error("[voice-profile] DB upsert error:", dbErr.message);
      return NextResponse.json({ error: "Failed to save voice profile" }, { status: 500 });
    }

    auditLog({
      eventType: "generation_completed",
      userId: auth.userId,
      resourceType: "voice_profile",
      resourceId: profile.id,
      details: { sampleCount: samples.length, formalityScore: styleNotes.formality_score },
    });

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("[voice-profile] POST error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to process voice profile" }, { status: 500 });
  }
}
