import { NextRequest, NextResponse } from "next/server";
import { anthropic, SONNET, HAIKU } from "@/lib/ai";
import { buildPromptForAnswerType } from "@/lib/ai/prompts";
import { detectRoleSeniority, getSeniorityInstructions } from "@/lib/ai/seniority";
import { parseJobListing, buildJobListingContext } from "@/lib/ai/job-listing";
import { fetchRagContext, assembleSystemPrompt, logAnswerVersion } from "@/lib/ai/rag-context";
import type { AnswerType, PrepSession } from "@/types";

const HAIKU_ANSWER_TYPES: AnswerType[] = ["company_brief", "cheat_sheet", "comp_expectations"];

const QUICK_ACTION_PREFIXES: Record<string, string> = {
  shorter:
    "Make this answer significantly shorter — keep only the most impactful points. Cut any filler.",
  more_confident:
    "Rewrite this with more confidence and conviction. Remove hedging language. Use assertive, declarative statements.",
  add_metrics:
    "Enhance this answer by adding specific metrics, percentages, or dollar amounts where plausible given the resume data. Make it more quantified.",
  star_format:
    "Reformat this as a clean STAR answer: Situation, Task, Action, Result. Use those exact labels as headers.",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      sessionId?: string;
      answerType: AnswerType;
      session: PrepSession;
      quickAction?: string;
      customInstruction?: string;
    };

    const { answerType, session, quickAction, customInstruction } = body;
    const sessionId = body.sessionId ?? "anon";

    if (!answerType || !session) {
      return NextResponse.json({ error: "answerType and session are required" }, { status: 400 });
    }

    // Compute seniority and job listing context at route level (items 2–3 in assembly order)
    const seniority = detectRoleSeniority(session.targetRole, session.jobDescription);
    const jobListingSignals = session.jobDescription ? parseJobListing(session.jobDescription) : undefined;
    const seniorityText = getSeniorityInstructions(seniority);
    const jobListingContext = buildJobListingContext(jobListingSignals);

    // Build base prompt — structural instructions + resume + company (items 7, 9, 10)
    const { system: baseSystem, user, maxTokens } = buildPromptForAnswerType(
      answerType,
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
      }
    );

    // Fetch RAG context
    const queryText = `${answerType} ${session.targetRole} ${session.company?.name ?? ""} ${session.roleType ?? ""}`;
    const rag = await fetchRagContext(
      answerType,
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

    // Build modifier instruction from quickAction or customInstruction
    let modifier = "";
    if (quickAction && QUICK_ACTION_PREFIXES[quickAction]) {
      modifier = QUICK_ACTION_PREFIXES[quickAction];
    } else if (customInstruction?.trim()) {
      modifier = customInstruction.trim();
    }

    const userContent = modifier
      ? `${user}\n\nAdditional instructions: ${modifier}`
      : user;

    const model = HAIKU_ANSWER_TYPES.includes(answerType) ? HAIKU : SONNET;

    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    const rawContent = content.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Log regen (fire-and-forget)
    logAnswerVersion({
      sessionId,
      answerType,
      content: rawContent,
      generationType: "regen",
      quickAction: quickAction ?? null,
      promptVersionId: rag.activePromptVersionId,
      knowledgeChunkIds: rag.knowledgeChunkIds,
      goldenExampleIds: rag.goldenExampleIds,
    });

    return NextResponse.json({
      content: rawContent,
      answerId: crypto.randomUUID(),
    });
  } catch (err) {
    console.error("Regenerate answer error:", err);
    return NextResponse.json(
      { error: "Failed to regenerate. Please try again." },
      { status: 500 }
    );
  }
}
