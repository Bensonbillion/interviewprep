import { NextRequest, NextResponse } from "next/server";
import { anthropic, SONNET } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { auditLog } from "@/lib/security/audit";
import { SPOKEN_VOICE_PROFILE } from "@/lib/ai/prompts";
import { styleLint } from "@/lib/ai/style-lint";
import type { PrepSession } from "@/types";

const STAGE_LABELS: Record<string, string> = {
  recruiter: "recruiter phone screen",
  hiring_manager: "hiring manager interview",
  role_play: "role-play / mock cold call",
  panel: "panel interview",
  take_home: "take-home assignment discussion",
};

const STAGE_LENGTHS: Record<string, string> = {
  recruiter: "130-200 words",
  hiring_manager: "200-350 words",
  role_play: "150-250 words",
  panel: "150-300 words",
  take_home: "150-250 words",
};

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, headers: rlHeaders } = await checkRateLimit(aiLimiter, auth.userId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: rlHeaders }
      );
    }

    const body = await req.json();
    const { sessionId, questionText, interviewStage, session } = body as {
      sessionId: string;
      questionText: string;
      interviewStage: string;
      session: PrepSession;
    };

    if (!sessionId || !questionText?.trim() || !session) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (questionText.length > 500) {
      return NextResponse.json({ error: "Question too long (max 500 characters)" }, { status: 400 });
    }

    // Spend 1 credit
    const admin = createAdminClient();
    const { data: creditOk, error: creditErr } = await admin.rpc("spend_credit", {
      p_user_id: auth.userId,
      p_answer_id: `custom-${sessionId}-${Date.now()}`,
      p_description: "Custom question answer",
    });

    if (creditErr) {
      console.error("[custom-answer] Credit error:", creditErr.message);
      return NextResponse.json({ error: "Failed to process credit." }, { status: 500 });
    }

    if (creditOk === false) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    // Build context from session
    const topBullets = (session.resume?.roles ?? [])
      .flatMap((r) => (r.bullets ?? []).map((b) => `[${r.title} at ${r.company}] ${b.originalText}`))
      .slice(0, 10)
      .join("\n");

    const stageLabel = STAGE_LABELS[interviewStage] || interviewStage;
    const targetLength = STAGE_LENGTHS[interviewStage] || "150-250 words";

    const systemPrompt = `YOU ARE GENERATING TEXT THAT A REAL PERSON WILL SAY OUT LOUD IN A LIVE INTERVIEW. It must sound like natural speech.

You are an expert sales interview coach. Generate a conversational, SPOKEN interview answer for a custom question the candidate wants to practice.

STRUCTURE:
If the question is behavioral (about past experience), use this four-layer structure:
1. HEADLINE — One-sentence answer to the question (5-10 words)
2. CONTEXT — Set the scene briefly (company, role, situation)
3. ACTIONS — Specific things you did (with metrics where possible)
4. REFLECTION — What you learned or the impact

If the question is situational or opinion-based, use:
1. Direct answer first
2. Supporting evidence from experience
3. Brief example or anecdote
4. Forward-looking connection to this role

LENGTH: ${targetLength} — concise enough for a ${stageLabel}.
${SPOKEN_VOICE_PROFILE}`;

    const userPrompt = `QUESTION TO ANSWER: "${questionText}"

INTERVIEW CONTEXT:
- Role: ${session.targetRole} at ${session.companyName}
- Round: ${stageLabel}
- Role Type: ${session.roleType}

CANDIDATE RESUME (top experience):
${topBullets}

${session.resume.narrativeSummary ? `CANDIDATE SUMMARY: ${session.resume.narrativeSummary}` : ""}

${session.company?.productDescription ? `COMPANY PRODUCT: ${session.company.productDescription}` : ""}
${session.company?.icp ? `COMPANY ICP: ${JSON.stringify(session.company.icp)}` : ""}

${session.relevanceMap?.strongMatches?.length ? `STRONG MATCHES TO ROLE:\n${session.relevanceMap.strongMatches.map((m) => `- ${m.resumeItem}: ${m.relevance}`).join("\n")}` : ""}

${session.personalContext ? `PERSONAL CONTEXT (weave in ONLY if it naturally fits — max one mention):\n${session.personalContext}` : ""}

Generate the answer as plain spoken text. No formatting, no bullet points, no markdown. Just natural speech.`;

    const response = await anthropic.messages.create({
      model: SONNET,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
    }

    // Deterministic style cleanup — custom answers are always spoken
    const answer = styleLint(textBlock.text.trim(), true);

    // Store in database (best-effort, fire-and-forget)
    const questionId = crypto.randomUUID();
    Promise.resolve(
      admin.from("custom_prep_questions").insert({
        id: questionId,
        session_id: sessionId,
        user_id: auth.userId,
        question_text: questionText,
        interview_stage: interviewStage,
        generated_answer: answer,
      })
    ).catch((err) => console.error("[custom-answer] DB insert error:", err));

    // Log to interview_questions_reported (knowledge bank signal, best-effort)
    Promise.resolve(
      admin.from("interview_questions_reported").insert({
        question_text: questionText,
        interview_stage: interviewStage,
        company_name_normalized: session.companyName?.toLowerCase().trim(),
        role_type: session.roleType,
        user_id: auth.userId,
        was_expected: true,
        verification_count: 1,
      })
    ).catch(() => {});

    auditLog({
      eventType: "generation_completed",
      userId: auth.userId,
      resourceType: "custom_answer",
      resourceId: questionId,
      details: { question: questionText.slice(0, 100), stage: interviewStage },
    });

    return NextResponse.json({
      id: questionId,
      questionText,
      answer,
    });
  } catch (err) {
    console.error("[custom-answer] ERROR:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to generate answer. Please try again." },
      { status: 500 }
    );
  }
}
