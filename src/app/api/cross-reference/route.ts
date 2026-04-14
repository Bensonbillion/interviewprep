import { NextRequest, NextResponse } from "next/server";
import { anthropic, HAIKU } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { aiLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { crossReferenceSchema } from "@/lib/validation/schemas";
import { ParsedResume, CompanyProfile, RelevanceMap } from "@/types";

export async function POST(req: NextRequest) {
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

  try {
    const body = await req.json();
    const parsed = crossReferenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const resume = parsed.data.resume as unknown as ParsedResume;
    const company = parsed.data.company as unknown as CompanyProfile;
    const { jobDescription, targetRole } = parsed.data;

    // Build a condensed resume summary for the cross-reference prompt
    const topBullets = (resume.roles ?? [])
      .flatMap((r) => (r.bullets ?? []).map((b) => ({ ...b, role: `${r.title} at ${r.company}` })))
      .sort((a, b) => (b.salesRelevanceScore ?? 0) - (a.salesRelevanceScore ?? 0))
      .slice(0, 12)
      .map((b) => `[${b.role}] ${b.originalText} (relevance: ${b.salesRelevanceScore ?? 0}/10)`)
      .join("\n");

    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Cross-reference this candidate's resume against the target role and company to generate a relevance map.

Candidate Background Type: ${resume.backgroundType}
Candidate Narrative: ${resume.narrativeSummary}

Top Resume Bullets (by sales relevance):
${topBullets}

Target Role: ${targetRole} at ${company.name}
Company Product: ${company.productDescription}
Company ICP: ${JSON.stringify(company.icp)}
Job Description Excerpt: ${jobDescription ? jobDescription.slice(0, 1000) : "(not provided — infer from role title and company context)"}

Return ONLY valid JSON (no markdown):
{
  "strongMatches": [
    { "resumeItem": "specific bullet or experience", "relevance": "why this directly maps to the role/company" }
  ],
  "gaps": [
    { "gap": "what's missing or weak", "bridgingStrategy": "how to address or reframe this in an interview" }
  ],
  "leadStories": [
    "Top story 1 from their resume they should lead with — 1 sentence description",
    "Top story 2",
    "Top story 3"
  ],
  ${resume.backgroundType === "career_switcher" ? `"careerSwitcherBridges": [
    { "originalExperience": "what they did", "salesTranslation": "how to frame it as sales-relevant" }
  ]` : `"careerSwitcherBridges": []`}
}

Identify 3-5 strong matches, 2-3 gaps, and 2-3 lead stories. For career switchers, identify 3-4 experience bridges.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    const cleaned = content.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Extract first JSON object — Claude sometimes adds commentary after the JSON
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in cross-reference response");
    const relevanceMap = JSON.parse(jsonMatch[0]) as RelevanceMap;

    return NextResponse.json({ relevanceMap });
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    console.error("Cross-reference error:", rawMsg);
    return NextResponse.json(
      { error: "Failed to analyze your resume against this role. Please try again." },
      { status: 500 }
    );
  }
}
