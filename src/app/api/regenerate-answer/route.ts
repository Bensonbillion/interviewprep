import { NextRequest, NextResponse } from "next/server";
import { anthropic, SONNET, HAIKU } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { aiLimiter, checkRateLimit, buildRateLimitResponse } from "@/lib/security/rate-limit";
import { regenerateAnswerSchema } from "@/lib/validation/schemas";
import { buildPromptForAnswerType } from "@/lib/ai/prompts";
import { detectRoleSeniority, getSeniorityInstructions } from "@/lib/ai/seniority";
import { parseJobListing, buildJobListingContext } from "@/lib/ai/job-listing";
import { fetchRagContext, assembleSystemPrompt, logAnswerVersion } from "@/lib/ai/rag-context";
import { shouldHumanize } from "@/lib/ai/humanize-answer";
import { styleLint } from "@/lib/ai/style-lint";
import { isStreamingAnswerType, type AnswerStreamEvent } from "@/lib/ai/streaming";
import type { AnswerType, PrepSession } from "@/types";
import { loadNarrativeSpine } from "@/lib/spine/load";

export const maxDuration = 60;

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
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(aiLimiter, auth.userId);
  if (!rl.allowed) return buildRateLimitResponse("answer regeneration", rl);

  try {
    const body = await req.json();
    const parsed = regenerateAnswerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const answerType = parsed.data.answerType as AnswerType;
    const session = parsed.data.session as unknown as PrepSession;
    const quickAction = parsed.data.quickAction;
    const customInstruction = parsed.data.customInstructions;
    const sessionId = body.sessionId ?? "anon";

    // Compute seniority and job listing context at route level (items 2–3 in assembly order)
    const seniority = detectRoleSeniority(session.targetRole, session.jobDescription);
    const jobListingSignals = session.jobDescription ? parseJobListing(session.jobDescription) : undefined;
    const seniorityText = getSeniorityInstructions(seniority);
    const jobListingContext = buildJobListingContext(jobListingSignals);

    // Load the narrative spine for the same reasons as /generate-answer:
    // regenerated answers must rebuild context with the spine so a regen
    // doesn't strip the candidate's lived truth from the answer.
    // (Note: this route's ctx is otherwise a strict subset of /generate-
    // answer's — see tracked item 0D.5. Not fixed here; just ensuring
    // spine reaches both.)
    const spine = sessionId !== "anon"
      ? await loadNarrativeSpine(sessionId).catch(() => null)
      : null;

    // Build base prompt — structural instructions + resume + company (items 7, 9, 10)
    const { system: baseSystem, user, maxTokens } = buildPromptForAnswerType(
      answerType,
      {
        resume: session.resume,
        extractedResume: session.extractedResume,
        company: session.company,
        relevanceMap: session.relevanceMap,
        jobDescription: session.jobDescription,
        targetRole: session.targetRole,
        roleType: session.roleType,
        stage: session.stage,
        seniority,
        jobListingSignals,
        spine: spine ?? undefined,
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
    const isSpoken = shouldHumanize(answerType);

    // ── STREAMING BRANCH (spoken narrative types only) ───────────────────────
    if (isStreamingAnswerType(answerType)) {
      const answerId = crypto.randomUUID();
      const claudeStream = await anthropic.messages.stream({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userContent }],
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          let clientGone = false;
          let accumulated = "";

          const send = (event: AnswerStreamEvent) => {
            if (clientGone) return;
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            } catch {
              clientGone = true;
            }
          };

          try {
            for await (const event of claudeStream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                accumulated += event.delta.text;
                send({ type: "text", text: event.delta.text });
              }
            }

            const finalContent = styleLint(accumulated, isSpoken);

            logAnswerVersion({
              sessionId,
              answerType,
              content: finalContent,
              generationType: "regen",
              quickAction: quickAction ?? null,
              promptVersionId: rag.activePromptVersionId,
              knowledgeChunkIds: rag.knowledgeChunkIds,
              goldenExampleIds: rag.goldenExampleIds,
            });

            send({ type: "done", answerId, model });
          } catch (err) {
            console.error("[regenerate-answer] stream error:", err);
            send({
              type: "error",
              message: "Failed to regenerate. Please try again.",
            });
          } finally {
            try {
              controller.close();
            } catch {
              /* already closed */
            }
          }
        },
        cancel() {
          // Client aborted — let upstream + post-processing finish.
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // ── NON-STREAMING BRANCH (existing path, unchanged) ──────────────────────
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

    const finalContent = styleLint(rawContent, isSpoken);

    // Log regen with both raw and humanized versions (fire-and-forget)
    logAnswerVersion({
      sessionId,
      answerType,
      content: finalContent,
      generationType: "regen",
      quickAction: quickAction ?? null,
      promptVersionId: rag.activePromptVersionId,
      knowledgeChunkIds: rag.knowledgeChunkIds,
      goldenExampleIds: rag.goldenExampleIds,
    });

    return NextResponse.json({
      content: finalContent,
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
