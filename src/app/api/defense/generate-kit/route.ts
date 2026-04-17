import { NextRequest, NextResponse } from "next/server";
import { anthropic, SONNET } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { auditLog } from "@/lib/security/audit";
import type Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

/**
 * POST /api/defense/generate-kit
 * Generates a full panel defense kit from a take-home submission.
 * Body: { session_id, parent_session_id }
 */
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
    const { session_id, parent_session_id } = body as {
      session_id: string;
      parent_session_id: string;
    };

    if (!session_id || !parent_session_id) {
      return NextResponse.json({ error: "session_id and parent_session_id required" }, { status: 400 });
    }

    const db = createAdminClient();

    // Fetch parent session (take-home), defense session, and interviewers in parallel
    const [parentResult, defenseResult, interviewersResult] = await Promise.all([
      db.from("prep_sessions")
        .select("session_data, take_home_content, job_description")
        .eq("id", parent_session_id)
        .eq("user_id", auth.userId)
        .single(),
      db.from("prep_sessions")
        .select("id, user_id, session_data")
        .eq("id", session_id)
        .eq("user_id", auth.userId)
        .single(),
      db.from("session_interviewers")
        .select("*")
        .eq("session_id", session_id),
    ]);

    if (!parentResult.data || !defenseResult.data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const parentSession = parentResult.data;
    const defenseSession = defenseResult.data;
    const interviewerProfiles = interviewersResult.data ?? [];

    // Extract data from sessions
    const takeHomeContent = (parentSession.take_home_content ?? parentSession.session_data?.takeHomeContent ?? {}) as Record<string, unknown>;
    const sessionData = (defenseSession.session_data ?? {}) as Record<string, unknown>;
    const companyName = (sessionData.companyName ?? "the company") as string;

    // Build interviewer context for prompts
    const interviewerContext = interviewerProfiles.map((i) => {
      const pd = (i.profile_data ?? {}) as Record<string, unknown>;
      const priorities = Array.isArray(pd.likely_priorities) ? (pd.likely_priorities as string[]).join(", ") : "";
      return `${i.name} (${i.title ?? "unknown title"}):
${pd.career_summary ?? "No background available"}
Likely priorities: ${priorities}
How to talk to them: ${pd.how_to_talk_to_them ?? "Be professional and specific"}
Watch out: ${pd.watch_outs ?? "None identified"}`;
    }).join("\n\n");

    const submissionSummary = buildSubmissionSummary(takeHomeContent);

    if (!submissionSummary.trim() || submissionSummary.length < 50) {
      return NextResponse.json(
        { error: "Parent session has no take-home content to defend" },
        { status: 422 }
      );
    }

    // Run all 5 generations in parallel
    const [weaknessAudit, hardQuestions, timingGuide, roleplayScript, cheatSheet] =
      await Promise.all([

        // 1. Weakness audit
        anthropic.messages.create({
          model: SONNET,
          max_tokens: 2000,
          system: `You are a senior sales leader who has just read a BDR candidate's take-home submission. You know the interviewers personally. Your job: find the 3 spots most likely to be challenged. Be specific. Quote their actual work. Give strong model answers. Return ONLY valid JSON — no markdown fencing.`,
          messages: [{
            role: "user",
            content: `Find the 3 weakest spots in this submission for ${companyName}.

SUBMISSION:
${submissionSummary}

INTERVIEWERS:
${interviewerContext}

For each weak spot return:
{
  "area": "which part of the submission",
  "severity": "high|medium|low",
  "what_they_said": "exact quote or close paraphrase from the submission",
  "why_its_vulnerable": "specific reason a panelist would challenge this",
  "likely_question": "exact words they'd use to challenge it",
  "model_answer": "strong response that holds a position while staying open to feedback",
  "who_asks": "which interviewer is more likely to raise this"
}

Return as a JSON array of 3 objects.`,
          }],
        }),

        // 2. Hard questions — grounded in submission
        anthropic.messages.create({
          model: SONNET,
          max_tokens: 3000,
          system: `You are preparing a BDR candidate for their panel interview. Every question must reference their actual submitted work. No generic interview questions. Return ONLY valid JSON — no markdown fencing.`,
          messages: [{
            role: "user",
            content: `Generate 6 hard panel questions for this ${companyName} interview.

SUBMISSION:
${submissionSummary}

INTERVIEWERS AND THEIR LIKELY ANGLES:
${interviewerContext}

Generate questions across:
- 2 on ICP rationale + prospect selection
- 1 on cold email decisions
- 1 on research methodology (for the ops-minded interviewer)
- 1 on discovery question sequencing
- 1 closing ("if you joined tomorrow, what would you do differently")

For each: {
  "question": "exact words",
  "asked_by": "which interviewer persona",
  "what_theyre_testing": "the underlying evaluation",
  "model_answer": "strong specific answer using their submission as evidence",
  "trap_to_avoid": "wrong direction candidates often go",
  "coachability_note": "if they push back on your answer, how to respond"
}

Return as a JSON array.`,
          }],
        }),

        // 3. Slide timing guide
        anthropic.messages.create({
          model: SONNET,
          max_tokens: 1500,
          system: "Return ONLY valid JSON — no markdown fencing.",
          messages: [{
            role: "user",
            content: `Write a slide-by-slide timing guide for an 8-minute presentation of this submission.

SUBMISSION SECTIONS:
${submissionSummary}

INTERVIEWERS:
${interviewerContext}

For each section of the submission, create a slide: {
  "slide": "slide name",
  "time_range": "e.g. 0:45–2:15",
  "key_move": "the one thing to nail on this slide",
  "coaching_note": "tactical advice specific to this panel",
  "risk": "what could go wrong here",
  "tip": "quick tip to land it"
}

Be specific about which interviewer is watching most carefully on each slide. Return as a JSON array of 6-8 objects.`,
          }],
        }),

        // 4. Discovery roleplay — using their actual questions
        anthropic.messages.create({
          model: SONNET,
          max_tokens: 1500,
          system: "Return ONLY valid JSON — no markdown fencing.",
          messages: [{
            role: "user",
            content: `Write a 2-minute discovery roleplay script for a BDR candidate.

The panelists will roleplay as a decision-maker at one of the candidate's prospects. The candidate has 2 minutes to run a discovery call.

Their actual discovery questions from submission:
${JSON.stringify((takeHomeContent.discovery_questions as unknown[])?.slice(0, 6) ?? [], null, 2)}

Their prospects:
${JSON.stringify((takeHomeContent.prospects as unknown[])?.slice(0, 3) ?? [], null, 2)}

Write the script as back-and-forth dialogue: {
  "lines": [
    { "speaker": "you|them", "text": "what to say", "coaching": "optional tactical note" }
  ],
  "golden_rule": "the one rule for the whole 2 minutes"
}

Tone: curious, professional, not pitchy until the very end. The candidate should use their actual discovery questions from the submission.`,
          }],
        }),

        // 5. Cheat sheet
        anthropic.messages.create({
          model: SONNET,
          max_tokens: 1000,
          system: "Return ONLY valid JSON — no markdown fencing.",
          messages: [{
            role: "user",
            content: `Write a 6-point cheat sheet for this panel interview at ${companyName}.

INTERVIEWERS:
${interviewerContext}

SUBMISSION STRENGTHS:
${submissionSummary.slice(0, 500)}

Each point: {
  "point": "short imperative sentence",
  "detail": "2 sentences of specific context",
  "who_its_for": "name of interviewer or 'both'"
}

End with a "permission to stop" message — one paragraph telling the candidate they're ready and to stop studying.

Return as JSON: { "points": [...], "permission_to_stop": "..." }`,
          }],
        }),
      ]);

    // Parse all results
    const parse = (msg: Anthropic.Message): unknown => {
      const text = msg.content
        .filter((b) => b.type === "text")
        .map((b) => ("text" in b ? (b as { text: string }).text : ""))
        .join("");
      try {
        const cleaned = text
          .replace(/^```(?:json)?\s*/gi, "")
          .replace(/\s*```\s*$/gi, "")
          .trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return { raw: text };
      } catch {
        return { raw: text };
      }
    };

    const kit = {
      weakness_audit: parse(weaknessAudit),
      hard_questions: parse(hardQuestions),
      timing_guide: parse(timingGuide),
      roleplay_script: parse(roleplayScript),
      cheat_sheet: parse(cheatSheet),
      interviewers: interviewerProfiles.map((i) => ({
        name: i.name,
        title: i.title,
        profile: i.profile_data,
      })),
      generated_at: new Date().toISOString(),
    };

    // Save all sections as generated_answers (fire-and-forget)
    const saves = [
      { type: "weakness_audit", content: kit.weakness_audit },
      { type: "defense_questions", content: kit.hard_questions },
      { type: "presentation_structure", content: kit.timing_guide },
      { type: "role_play_script", content: kit.roleplay_script },
      { type: "cheat_sheet", content: kit.cheat_sheet },
    ];

    for (const save of saves) {
      db.from("generated_answers")
        .upsert(
          {
            id: crypto.randomUUID(),
            session_id,
            user_id: auth.userId,
            answer_type: save.type,
            content: JSON.stringify(save.content),
            status: "completed",
            metadata: { has_interviewer_context: interviewerProfiles.length > 0 },
          },
          { onConflict: "id" }
        )
        .then(({ error: dbErr }) => {
          if (dbErr) console.error(`[defense-kit] DB save error for ${save.type}:`, dbErr.message);
        });
    }

    auditLog({
      eventType: "generation_completed",
      userId: auth.userId,
      resourceType: "defense_kit",
      resourceId: session_id,
      details: {
        company: companyName,
        parentSessionId: parent_session_id,
        interviewerCount: interviewerProfiles.length,
        sections: saves.map((s) => s.type),
      },
    });

    return NextResponse.json(kit);
  } catch (err) {
    console.error("[defense-kit] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to generate defense kit" },
      { status: 500 }
    );
  }
}

function buildSubmissionSummary(content: Record<string, unknown>): string {
  const icp = (content?.icp ?? {}) as Record<string, unknown>;
  const prospects = (content?.prospects ?? []) as Array<Record<string, unknown>>;
  const email = (content?.cold_email ?? {}) as Record<string, unknown>;
  const dqs = (content?.discovery_questions ?? []) as Array<Record<string, unknown>>;

  const parts: string[] = [];

  if (Object.keys(icp).length > 0) {
    parts.push(`ICP: ${JSON.stringify(icp)}`);
  }

  if (prospects.length > 0) {
    parts.push(
      `PROSPECTS:\n${prospects.map((p, i) => `${i + 1}. ${p.company_name}: ${p.why_they_fit}. Trigger: ${p.trigger_signal}. Contact: ${p.target_contact ?? p.target_title}`).join("\n")}`
    );
  }

  if (email.subject || email.body) {
    parts.push(`COLD EMAIL:\nSubject: ${email.subject}\n${email.body}`);
  }

  if (dqs.length > 0) {
    parts.push(
      `DISCOVERY QUESTIONS:\n${dqs.map((q, i) => `${i + 1}. ${q.question} [${q.category}]`).join("\n")}`
    );
  }

  // Include raw submission text if available
  if (content?.raw_content && typeof content.raw_content === "string") {
    parts.push(`RAW SUBMISSION:\n${(content.raw_content as string).slice(0, 3000)}`);
  }

  return parts.join("\n\n");
}
