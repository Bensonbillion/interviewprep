import { NextRequest, NextResponse } from "next/server";
import { anthropic, SONNET } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { auditLog } from "@/lib/security/audit";
import { analyzeTranscriptSchema } from "@/lib/validation/schemas";
import { checkAccess } from "@/lib/entitlements";

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
    const parsed = analyzeTranscriptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { transcript, roleType, interviewStage } = parsed.data;

    // Entitlement-first access check, credit fallback. transcript
    // analysis is a live_mode action. This route doesn't currently
    // receive a sessionId so we can't resolve a company scope —
    // checkAccess will only match search_pass on the entitlement side;
    // full_interview cannot be matched without knowing the company.
    //
    // TODO(Session 3): when the Live Mode UI starts calling this route
    // it should send sessionId, and we should resolveSessionScope() to
    // unlock full_interview-at-company entitlements.
    const access = await checkAccess(auth.userId, "live_mode", {});
    if (access.source === "denied") {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    const admin = createAdminClient();
    const analysisId = `transcript-analysis-${Date.now()}`;
    if (access.source === "credit") {
      const { data: creditOk, error: creditErr } = await admin.rpc("spend_credit", {
        p_user_id: auth.userId,
        p_answer_id: analysisId,
        p_description: "Transcript analysis",
      });
      if (creditErr) {
        console.error("[analyze-transcript] Credit error:", creditErr.message);
        return NextResponse.json({ error: "Failed to process credit." }, { status: 500 });
      }
      if (creditOk === false) {
        return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
      }
    }
    // access.source === "entitlement" → search_pass covers; no deduction.

    const systemPrompt = `You are an expert sales interview coach and former hiring manager with 15+ years of experience evaluating sales candidates. You analyze interview transcripts with precision and honesty.

Your task: Analyze the provided interview transcript and return a structured JSON assessment.

INSTRUCTIONS:
- Identify who is the interviewer and who is the candidate based on conversational cues (questions asked, introductions, etc.)
- Score each answer based on specificity, metrics usage, storytelling technique, and relevance to the role
- Be honest and constructive — do NOT be overly positive. If answers are weak, say so clearly
- Focus on actionable, specific feedback with examples from the transcript
- Identify patterns (e.g., candidate uses too many filler words, fails to quantify results, gives vague answers, doesn't ask enough questions, etc.)
- For strengths and improvements, cite specific examples or quotes from the transcript
- Scores should be realistic: most candidates score 2-4, not 5

Return ONLY valid JSON matching this exact structure (no markdown fencing, no extra text):

{
  "summary": "2-3 sentence overview of the interview",
  "interview_type": "e.g., Recruiter Screen, Hiring Manager Interview, Panel Interview",
  "estimated_stage": "recruiter | hiring_manager | role_play | panel",
  "role_discussed": "e.g., Senior BDR, Account Executive",

  "questions_asked": [
    {
      "question": "The question text",
      "category": "behavioral | situational | technical | roleplay | culture_fit | closing | curveball",
      "asked_by": "interviewer | candidate",
      "answer_quality": "strong | adequate | needs_improvement",
      "answer_feedback": "Specific feedback on the answer"
    }
  ],

  "scores": {
    "communication_clarity": 1-5,
    "answer_depth": 1-5,
    "use_of_metrics": 1-5,
    "storytelling": 1-5,
    "enthusiasm_and_energy": 1-5,
    "question_quality": 1-5,
    "overall": 1-5
  },

  "strengths": ["3-5 specific strengths with examples from transcript"],
  "improvements": ["3-5 specific improvements with actionable advice"],

  "strongest_moment": "Quote or paraphrase from the transcript showing the candidate at their best",
  "missed_opportunity": "Something the candidate could have said or done better, with specific advice",

  "prep_recommendations": ["3-5 things to practice before the next round"]
}`;

    const roleContext = roleType ? `\nCandidate's role type: ${roleType}` : "";
    const stageContext = interviewStage ? `\nExpected interview stage: ${interviewStage}` : "";

    const userPrompt = `Analyze the following interview transcript and return your assessment as JSON.${roleContext}${stageContext}

TRANSCRIPT:
${transcript}`;

    const response = await anthropic.messages.create({
      model: SONNET,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Failed to analyze transcript" }, { status: 500 });
    }

    let analysis;
    try {
      analysis = JSON.parse(textBlock.text.trim());
    } catch {
      console.error("[analyze-transcript] Failed to parse Claude response as JSON");
      return NextResponse.json(
        { error: "Failed to parse analysis. Please try again." },
        { status: 500 }
      );
    }

    auditLog({
      eventType: "generation_completed",
      userId: auth.userId,
      resourceType: "transcript_analysis",
      resourceId: analysisId,
      details: {
        transcriptLength: transcript.length,
        roleType: roleType ?? null,
        interviewStage: interviewStage ?? null,
      },
    });

    return NextResponse.json({
      id: analysisId,
      analysis,
    });
  } catch (err) {
    console.error("[analyze-transcript] ERROR:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to analyze transcript. Please try again." },
      { status: 500 }
    );
  }
}
