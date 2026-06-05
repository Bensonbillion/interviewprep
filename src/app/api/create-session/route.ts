import { NextRequest, NextResponse } from "next/server";
import { anthropic, HAIKU } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { aiLimiter, checkRateLimit, buildRateLimitResponse } from "@/lib/security/rate-limit";
import { CreateSessionInputSchema } from "@/lib/types/schemas";
import { buildAnswerSlots, buildAnswerSlotsFromStageType } from "@/lib/session/answer-slots";
import { extractResumeForPrep } from "@/lib/ai/extract-resume";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPositioningEngine } from "@/lib/positioning/engine";
import type {
  ParsedResume,
  CompanyProfile,
  RelevanceMap,
  PrepSession,
  RoleType,
} from "@/types";
import type { StageType } from "@/lib/types/stages";
import { auditLog } from "@/lib/security/audit";

// Inline cross-reference (was /api/cross-reference)
async function buildRelevanceMap(
  resume: ParsedResume,
  company: CompanyProfile,
  jobDescription: string,
  targetRole: string
): Promise<RelevanceMap> {
  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `Cross-reference this candidate's resume against this company and role. Return ONLY valid JSON.

CANDIDATE:
Background: ${resume.backgroundType}
Roles: ${resume.roles.map((r) => `${r.title} at ${r.company}`).join(", ")}
Top bullets: ${resume.roles
          .flatMap((r) => r.bullets)
          .sort((a, b) => b.salesRelevanceScore - a.salesRelevanceScore)
          .slice(0, 8)
          .map((b) => b.originalText)
          .join(" | ")}
Skills: ${resume.skills
          .sort((a, b) => b.salesRelevance - a.salesRelevance)
          .slice(0, 10)
          .map((s) => s.name)
          .join(", ")}

TARGET: ${targetRole} at ${company.name}
Company: ${company.productDescription}
Sales motion: ${company.salesMotion}
Tech stack: ${company.techStack.join(", ")}
ICP: ${JSON.stringify(company.icp)}
JD: ${jobDescription.slice(0, 1000)}

Return:
{
  "strongMatches": [{"resumeItem": "specific bullet or skill", "relevance": "why this matters for the role"}],
  "gaps": [{"gap": "what they lack", "bridgingStrategy": "how to address it"}],
  "leadStories": ["2-3 specific bullets/achievements to lead with in interviews"],
  "careerSwitcherBridges": [{"originalExperience": "...", "salesTranslation": "..."}]
}

strongMatches: 3–5 items. gaps: 2–3 items. leadStories: 2–3 items. careerSwitcherBridges: only if backgroundType is "career_switcher", else empty array.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const cleaned = content.text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in cross-reference response");
  return JSON.parse(jsonMatch[0]) as RelevanceMap;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(aiLimiter, auth.userId);
    if (!rl.allowed) return buildRateLimitResponse("session creation", rl);

    const body = await req.json();

    // Session data comes as the full context needed
    const {
      resume,
      company,
      jobDescription,
      targetRole,
      roleType,
      stage,
      companyName,
      companyUrl,
      // New flexible stage fields
      stageName,
      stageType,
      stageOrder,
      parentSessionId,
    } = body as {
      resume: ParsedResume;
      company: CompanyProfile;
      jobDescription: string;
      targetRole: string;
      roleType: string;
      stage: string;
      companyName: string;
      companyUrl?: string;
      stageName?: string;
      stageType?: StageType;
      stageOrder?: number;
      parentSessionId?: string;
    };

    // Validate key fields
    const inputValidation = CreateSessionInputSchema.safeParse({
      resumeId: "00000000-0000-0000-0000-000000000000", // placeholder for client-side sessions
      companyId: "00000000-0000-0000-0000-000000000000",
      jobDescription,
      targetRole,
      roleType,
      stage,
      ...(stageName && { stageName }),
      ...(stageType && { stageType }),
      ...(stageOrder != null && { stageOrder }),
      ...(parentSessionId && { parentSessionId }),
    });

    if (!inputValidation.success) {
      return NextResponse.json(
        { error: inputValidation.error.message },
        { status: 400 }
      );
    }

    // ── 1. Pre-insert prep_sessions so the Positioning Engine has a
    //       valid session.id to reference (positioning_briefs.session_id
    //       FK depends on this row existing). session_data is null at
    //       this point; we patch it in the final UPDATE after Promise.all.
    //       A partial row is harmless — answer slots and session_data are
    //       written later, and a slot-less session is just an empty
    //       session a user can re-open with no answer data.
    const sessionId = crypto.randomUUID();
    const db = createAdminClient();
    const { error: insertErr } = await db
      .from("prep_sessions")
      .insert({
        id: sessionId,
        user_id: auth.userId,
        job_description: jobDescription,
        target_role: targetRole,
        role_type: roleType,
        stage,
        ...(stageType && { stage_type: stageType }),
        ...(stageName && { stage_name: stageName }),
        ...(stageOrder != null && { stage_order: stageOrder }),
        ...(parentSessionId && { parent_session_id: parentSessionId }),
      });
    if (insertErr) {
      console.error("[create-session] initial insert failed:", insertErr.message);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    // ── 2. Three independent AI steps in parallel.
    //       positioningBrief is widened to PositioningBrief | null by the
    //       .catch(); downstream consumers must handle the null branch.
    const [relevanceMap, extractedResume, positioningBrief] = await Promise.all([
      buildRelevanceMap(resume, company, jobDescription, targetRole),
      extractResumeForPrep(resume).catch((err) => {
        console.warn("Resume extraction failed (non-fatal, using fallback):", err);
        return undefined;
      }),
      runPositioningEngine(
        sessionId,
        resume,
        company,
        roleType as RoleType,
        stage as PrepSession["stage"],
        { targetCompanyUrl: companyUrl }
      ).catch((err) => {
        console.error("[create-session] positioning_engine_failed", {
          sessionId,
          err: err instanceof Error ? err.message : String(err),
        });
        return null;
      }),
    ]);

    // Build answer slots — use new StageType mapping when provided, else legacy
    const answerSlots = stageType
      ? buildAnswerSlotsFromStageType(stageType, resume.backgroundType)
      : buildAnswerSlots(stage as PrepSession["stage"], resume.backgroundType);

    const session: PrepSession = {
      id: sessionId,
      resume,
      extractedResume,
      jobDescription,
      companyName,
      companyUrl,
      targetRole,
      roleType: roleType as PrepSession["roleType"],
      stage: stage as PrepSession["stage"],
      company,
      relevanceMap,
      answerSlots,
      createdAt: Date.now(),
      // New stage fields (undefined for legacy sessions)
      ...(stageType && { stageType }),
      ...(stageName && { stageName }),
      ...(stageOrder != null && { stageOrder }),
      ...(parentSessionId && { parentSessionId }),
    };

    // ── 3. Final UPDATE to fill session_data + relevance_map.
    //       Fire-and-forget to preserve the existing response latency.
    db.from("prep_sessions")
      .update({
        session_data: session,
        relevance_map: relevanceMap,
      })
      .eq("id", sessionId)
      .then(({ error: dbErr }) => {
        if (dbErr) console.error("[create-session] DB update error:", dbErr.message);
      });

    auditLog({
      eventType: "generation_requested",
      userId: auth.userId,
      resourceType: "session",
      resourceId: sessionId,
      details: {
        company: companyName,
        targetRole,
        stage,
        stageType: stageType ?? null,
        positioning_type: positioningBrief?.positioning_type ?? null,
      },
    });

    return NextResponse.json({
      session,
      // null when the engine degraded — downstream consumers treat null
      // as "positioning unknown" and fall back to today's behavior.
      positioning_type: positioningBrief?.positioning_type ?? null,
    });
  } catch (err) {
    console.error("Create session error:", err);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
