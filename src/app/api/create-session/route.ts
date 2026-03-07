import { NextRequest, NextResponse } from "next/server";
import { anthropic, HAIKU } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { CreateSessionInputSchema } from "@/lib/types/schemas";
import { buildAnswerSlots } from "@/lib/session/answer-slots";
import type { ParsedResume, CompanyProfile, RelevanceMap, PrepSession } from "@/types";

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

  const jsonText = content.text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(jsonText) as RelevanceMap;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    } = body as {
      resume: ParsedResume;
      company: CompanyProfile;
      jobDescription: string;
      targetRole: string;
      roleType: string;
      stage: string;
      companyName: string;
      companyUrl?: string;
    };

    // Validate key fields
    const inputValidation = CreateSessionInputSchema.safeParse({
      resumeId: "00000000-0000-0000-0000-000000000000", // placeholder for client-side sessions
      companyId: "00000000-0000-0000-0000-000000000000",
      jobDescription,
      targetRole,
      roleType,
      stage,
    });

    if (!inputValidation.success) {
      return NextResponse.json(
        { error: inputValidation.error.message },
        { status: 400 }
      );
    }

    // Build relevance map
    const relevanceMap = await buildRelevanceMap(resume, company, jobDescription, targetRole);

    // Build answer slots for this stage + background type
    const answerSlots = buildAnswerSlots(
      stage as PrepSession["stage"],
      resume.backgroundType
    );

    const session: PrepSession = {
      id: crypto.randomUUID(),
      resume,
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
    };

    return NextResponse.json({ session });
  } catch (err) {
    console.error("Create session error:", err);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
