import { NextRequest, NextResponse } from "next/server";
import { anthropic, HAIKU } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { aiLimiter, checkRateLimit, buildRateLimitResponse } from "@/lib/security/rate-limit";
import { CreateSessionInputSchema } from "@/lib/types/schemas";
import { buildAnswerSlots, buildAnswerSlotsFromStageType } from "@/lib/session/answer-slots";
import { extractResumeForPrep } from "@/lib/ai/extract-resume";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ParsedResume, CompanyProfile, RelevanceMap, PrepSession } from "@/types";
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

    // Build relevance map + extract grounded resume in parallel
    const [relevanceMap, extractedResume] = await Promise.all([
      buildRelevanceMap(resume, company, jobDescription, targetRole),
      extractResumeForPrep(resume).catch((err) => {
        console.warn("Resume extraction failed (non-fatal, using fallback):", err);
        return undefined;
      }),
    ]);

    // Build answer slots — use new StageType mapping when provided, else legacy
    const answerSlots = stageType
      ? buildAnswerSlotsFromStageType(stageType, resume.backgroundType)
      : buildAnswerSlots(stage as PrepSession["stage"], resume.backgroundType);

    const session: PrepSession = {
      id: crypto.randomUUID(),
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

    // Persist to Supabase (fire-and-forget — session also stored client-side)
    const db = createAdminClient();
    db.from("prep_sessions")
      .upsert(
        {
          id: session.id,
          user_id: auth.userId,
          session_data: session,
          job_description: jobDescription,
          target_role: targetRole,
          role_type: roleType,
          stage,
          relevance_map: relevanceMap,
          ...(stageType && { stage_type: stageType }),
          ...(stageName && { stage_name: stageName }),
          ...(stageOrder != null && { stage_order: stageOrder }),
          ...(parentSessionId && { parent_session_id: parentSessionId }),
        },
        { onConflict: "id" }
      )
      .then(({ error: dbErr }) => {
        if (dbErr) console.error("[create-session] DB upsert error:", dbErr.message);
      });

    auditLog({
      eventType: "generation_requested",
      userId: auth.userId,
      resourceType: "session",
      resourceId: session.id,
      details: { company: companyName, targetRole, stage, stageType: stageType ?? null },
    });

    return NextResponse.json({ session });
  } catch (err) {
    console.error("Create session error:", err);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
