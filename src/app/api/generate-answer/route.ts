import { NextRequest, NextResponse } from "next/server";
import { anthropic, SONNET, HAIKU } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { aiLimiter, checkRateLimit, buildRateLimitResponse } from "@/lib/security/rate-limit";
import { GenerateAnswerInputSchema } from "@/lib/types/schemas";
import { buildPromptForAnswerType } from "@/lib/ai/prompts";
import { detectRoleSeniority, getSeniorityInstructions } from "@/lib/ai/seniority";
import { parseJobListing, buildJobListingContext } from "@/lib/ai/job-listing";
import { fetchRagContext, assembleSystemPrompt, logAnswerVersion } from "@/lib/ai/rag-context";
import { checkAnswerQuality, logQualityCheck } from "@/lib/ai/quality-check";
import { shouldHumanize } from "@/lib/ai/humanize-answer";
import { styleLint } from "@/lib/ai/style-lint";
import { isStreamingAnswerType, type AnswerStreamEvent } from "@/lib/ai/streaming";
import type { AnswerType, PrepSession } from "@/types";
import { STAGE_TYPE_METADATA, type StageType } from "@/lib/types/stages";
import { auditLog } from "@/lib/security/audit";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Pro plan — give the route enough headroom for streamed Sonnet generations.
export const maxDuration = 60;

// Answer types that use Haiku (lighter/cheaper tasks)
const HAIKU_ANSWER_TYPES: AnswerType[] = [
  "company_brief",
  "cheat_sheet",
  "comp_expectations",
];

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(aiLimiter, auth.userId);
    if (!rl.allowed) {
      auditLog({
        eventType: "api_rate_limited",
        userId: auth.userId,
        severity: "warning",
        details: { endpoint: "/api/generate-answer", limiterType: "ai" },
      });
      return buildRateLimitResponse("answer generation", rl);
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
        extractedResume: session.extractedResume,
        company: session.company,
        relevanceMap: session.relevanceMap,
        jobDescription: session.jobDescription,
        targetRole: session.targetRole,
        roleType: session.roleType,
        stage: session.stage,
        seniority,
        jobListingSignals,
        personalContext: session.personalContext,
        mockCallPersona: session.mockCallPersona,
        interviewerName: session.interviewerName,
        interviewContext: session.interviewContext,
        mockAccountName: session.mockAccountName,
        mockAccountContext: session.mockAccountContext,
        previousRoundContext: session.previousRoundContext,
      },
      {
        question: body.question,
        objection: body.objection,
      }
    );

    // Fetch RAG context + user voice profile in parallel (non-blocking fallback if either fails)
    const db = createAdminClient();
    const queryText = `${answerType} ${session.targetRole} ${session.company?.name ?? ""} ${session.roleType ?? ""}`;
    const [rag, voiceProfileResult] = await Promise.all([
      fetchRagContext(
        answerType as AnswerType,
        queryText,
        session.roleType,
        session.stage,
        session.company?.name
      ),
      Promise.resolve(
        db.from("user_voice_profiles")
          .select("voice_summary")
          .eq("user_id", auth.userId)
          .maybeSingle()
      ).then((r) => r.data?.voice_summary as string | null ?? null)
        .catch(() => null),
    ]);

    // Build stage context from new StageType metadata or legacy stage
    const stageContext = session.stageType
      ? STAGE_TYPE_METADATA[session.stageType as StageType]?.cheat_sheet_framing ?? null
      : null;

    // Assemble system prompt in correct order (items 1–6, 8) + voice profile + stage context
    const system = assembleSystemPrompt(
      rag.activePromptText ?? baseSystem,
      rag,
      {
        seniorityText,
        jobListingContext: jobListingContext || null,
        userVoiceSummary: voiceProfileResult,
        stageContext,
      }
    );

    const userContent = customInstructions
      ? `${user}\n\nAdditional instructions: ${customInstructions}`
      : user;

    // Route to appropriate model
    const model = HAIKU_ANSWER_TYPES.includes(answerType as AnswerType)
      ? HAIKU
      : SONNET;

    // ── STREAMING BRANCH ──────────────────────────────────────────────────────
    // For the spoken-narrative answer types (TMAY, why_sales, etc.) the
    // FormattedTextContent renderer accepts incremental string updates, so we
    // pipe Claude's tokens to the client live for ~<2s TTFT instead of ~25s.
    // Tradeoff: skips the post-Claude QC + auto-regenerate step. See
    // src/lib/ai/streaming.ts for the rationale.
    if (isStreamingAnswerType(answerType as AnswerType)) {
      const answerId = crypto.randomUUID();
      const isSpoken = shouldHumanize(answerType as AnswerType);
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
              // Controller closed (likely client disconnect). Stop trying to
              // write but keep the upstream Anthropic loop running so the
              // server-side post-processing still completes.
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

            // Stream complete — apply deterministic style cleanup on the full
            // text. styleLint operates on the final string, not per-chunk, so
            // there's no way to feed cleaned text incrementally to the client.
            // The visible streamed text and the persisted finalContent may
            // therefore differ slightly in punctuation/spacing — acceptable.
            const finalContent = styleLint(accumulated, isSpoken);

            // Fire-and-forget logging + persistence (matches non-streaming path).
            logAnswerVersion({
              sessionId,
              answerType: answerType as AnswerType,
              content: finalContent,
              generationType: "initial",
              promptVersionId: rag.activePromptVersionId,
              knowledgeChunkIds: rag.knowledgeChunkIds,
              goldenExampleIds: rag.goldenExampleIds,
            });

            auditLog({
              eventType: "generation_completed",
              userId: auth.userId,
              resourceType: "answer",
              resourceId: answerId,
              details: {
                answerType,
                model,
                company: session.company?.name,
                streamed: true,
              },
            });

            if (sessionId !== "anon") {
              db.from("generated_answers")
                .upsert(
                  {
                    id: answerId,
                    session_id: sessionId,
                    user_id: auth.userId,
                    answer_type: answerType,
                    content: finalContent,
                    metadata: { model, streamed: true },
                    status: "completed",
                  },
                  { onConflict: "id" }
                )
                .then(({ error: dbErr }) => {
                  if (dbErr) console.error("[generate-answer] DB upsert error:", dbErr);
                });
            }

            send({ type: "done", answerId, model });
          } catch (err) {
            console.error("[generate-answer] stream error:", err);
            send({
              type: "error",
              message: "Generation failed. Please try again.",
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
          // Client aborted. Don't tear down the upstream Anthropic loop —
          // post-processing continues in `start()` and writes the answer to
          // the DB even though the client won't see it.
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

    // Strip markdown wrapping if present
    let rawContent = content.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // ── Empty content safety net ───────────────────────────────────────────
    if (!rawContent || rawContent.length < 80) {
      console.error("[generate-answer] Empty or too-short content:", rawContent?.length, "chars for", answerType);
      return NextResponse.json(
        { error: "generation_empty", message: "Generation produced empty content.", retryFree: true },
        { status: 422 }
      );
    }

    const answerId = crypto.randomUUID();

    // ── Quality check ────────────────────────────────────────────────────────
    const qc = checkAnswerQuality(rawContent, answerType, seniority);
    let wasRegenerated = false;

    // Auto-regenerate once if critical issues found
    if (qc.shouldRegenerate && qc.correctionPrompt) {
      try {
        const regenResponse = await anthropic.messages.create({
          model,
          max_tokens: maxTokens,
          system,
          messages: [
            { role: "user", content: userContent },
            { role: "assistant", content: rawContent },
            { role: "user", content: qc.correctionPrompt },
          ],
        });

        const regenBlock = regenResponse.content[0];
        if (regenBlock.type === "text") {
          rawContent = regenBlock.text
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
          wasRegenerated = true;
        }
      } catch (regenErr) {
        // Regeneration failed — use original answer with coaching tips
        console.warn("Quality regen failed (non-fatal):", regenErr);
      }
    }

    // Re-check after regeneration for coaching tips
    const finalQc = wasRegenerated
      ? checkAnswerQuality(rawContent, answerType, seniority)
      : qc;

    // Deterministic style cleanup — contractions for spoken, banned words for all
    const isSpoken = shouldHumanize(answerType as AnswerType);
    const finalContent = styleLint(rawContent, isSpoken);

    // Log quality check (fire-and-forget)
    logQualityCheck({
      answerId,
      answerType,
      issues: qc.issues,
      criticalCount: qc.criticalCount,
      warningCount: qc.warningCount,
      wasRegenerated,
    });

    // Log generation with both raw and humanized versions (fire-and-forget)
    logAnswerVersion({
      sessionId,
      answerType: answerType as AnswerType,
      content: finalContent,
      generationType: wasRegenerated ? "regen" : "initial",
      promptVersionId: rag.activePromptVersionId,
      knowledgeChunkIds: rag.knowledgeChunkIds,
      goldenExampleIds: rag.goldenExampleIds,
    });

    auditLog({
      eventType: "generation_completed",
      userId: auth.userId,
      resourceType: "answer",
      resourceId: answerId,
      details: {
        answerType,
        model,
        company: session.company?.name,
        qualityIssues: qc.criticalCount + qc.warningCount,
        wasRegenerated,
      },
    });

    // Persist generated answer to Supabase (fire-and-forget)
    if (sessionId !== "anon") {
      db.from("generated_answers")
        .upsert(
          {
            id: answerId,
            session_id: sessionId,
            user_id: auth.userId,
            answer_type: answerType,
            content: finalContent,
            metadata: {
              model,
              wasRegenerated,
              qualityIssues: qc.criticalCount + qc.warningCount,
            },
            status: "completed",
          },
          { onConflict: "id" }
        )
        .then(({ error: dbErr }) => {
          if (dbErr) console.error("[generate-answer] DB upsert error:", dbErr);
        });
    }

    return NextResponse.json({
      answerId,
      answerType,
      content: finalContent,
      model,
      ...(finalQc.coachingTips.length > 0 && { coachingTips: finalQc.coachingTips }),
    });
  } catch (err) {
    console.error("Generate answer error:", err);
    return NextResponse.json(
      { error: "generation_failed", message: "Failed to generate answer. Please try again.", retryFree: true },
      { status: 500 }
    );
  }
}
