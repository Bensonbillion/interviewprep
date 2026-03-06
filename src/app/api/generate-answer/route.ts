import { NextRequest, NextResponse } from "next/server";
import { anthropic, SONNET, HAIKU } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { GenerateAnswerInputSchema } from "@/lib/types/schemas";
import { buildPromptForAnswerType } from "@/lib/ai/prompts";
import { detectRoleSeniority, getSeniorityInstructions } from "@/lib/ai/seniority";
import { parseJobListing, buildJobListingContext } from "@/lib/ai/job-listing";
import { fetchRagContext, assembleSystemPrompt, logAnswerVersion } from "@/lib/ai/rag-context";
import type { AnswerType, PrepSession } from "@/types";

// Answer types that use Haiku (lighter/cheaper tasks)
const HAIKU_ANSWER_TYPES: AnswerType[] = [
  "company_brief",
  "cheat_sheet",
  "comp_expectations",
];

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate answer type and session
    const validation = GenerateAnswerInputSchema.safeParse({
      sessionId: body.sessionId ?? "00000000-0000-0000-0000-000000000000",
      answerType: body.answerType,
      customInstructions: body.customInstructions,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { answerType, customInstructions } = validation.data;
    const sessionId = body.sessionId ?? "anon";
    const session = body.session as PrepSession;

    if (!session) {
      return NextResponse.json({ error: "Session data required" }, { status: 400 });
    }

    // Compute seniority and job listing context at route level (items 2–3 in assembly order)
    const seniority = detectRoleSeniority(session.targetRole, session.jobDescription);
    const jobListingSignals = session.jobDescription ? parseJobListing(session.jobDescription) : undefined;
    const seniorityText = getSeniorityInstructions(seniority);
    const jobListingContext = buildJobListingContext(jobListingSignals);

    // Build base prompt — structural instructions + resume + company (items 7, 9, 10)
    const { system: baseSystem, user, maxTokens } = buildPromptForAnswerType(
      answerType as AnswerType,
      {
        resume: session.resume,
        company: session.company,
        relevanceMap: session.relevanceMap,
        jobDescription: session.jobDescription,
        targetRole: session.targetRole,
        roleType: session.roleType,
        stage: session.stage,
        seniority,
        jobListingSignals,
      },
      {
        question: body.question,
        objection: body.objection,
      }
    );

    // Fetch RAG context (non-blocking fallback if it fails)
    const queryText = `${answerType} ${session.targetRole} ${session.company?.name ?? ""} ${session.roleType ?? ""}`;
    const rag = await fetchRagContext(
      answerType as AnswerType,
      queryText,
      session.roleType,
      session.stage,
      session.company?.name
    );

    // Assemble system prompt in correct order (items 1–6, 8)
    const system = assembleSystemPrompt(
      rag.activePromptText ?? baseSystem,
      rag,
      { seniorityText, jobListingContext: jobListingContext || null }
    );

    const userContent = customInstructions
      ? `${user}\n\nAdditional instructions: ${customInstructions}`
      : user;

    // Route to appropriate model
    const model = HAIKU_ANSWER_TYPES.includes(answerType as AnswerType)
      ? HAIKU
      : SONNET;

    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    // Strip markdown wrapping if present
    const rawContent = content.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const answerId = crypto.randomUUID();

    // Log generation (fire-and-forget)
    logAnswerVersion({
      sessionId,
      answerType: answerType as AnswerType,
      content: rawContent,
      generationType: "initial",
      promptVersionId: rag.activePromptVersionId,
      knowledgeChunkIds: rag.knowledgeChunkIds,
      goldenExampleIds: rag.goldenExampleIds,
    });

    return NextResponse.json({
      answerId,
      answerType,
      content: rawContent,
      model,
    });
  } catch (err) {
    console.error("Generate answer error:", err);
    return NextResponse.json(
      { error: "Failed to generate answer. Please try again." },
      { status: 500 }
    );
  }
}
