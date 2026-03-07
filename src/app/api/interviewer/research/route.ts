import { NextRequest, NextResponse } from "next/server";
import { anthropic, SONNET, FIRECRAWL_API_KEY } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { interviewerResearchSchema } from "@/lib/validation/schemas";
import type { InterviewerDossier } from "@/types";

async function scrapeLinkedIn(url: string): Promise<string> {
  if (!FIRECRAWL_API_KEY) return "";
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return (data.data?.markdown ?? "").slice(0, 3000);
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = interviewerResearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { name, linkedinUrl, roleTitle, companyName, sessionId } = parsed.data;

    // Scrape LinkedIn profile if URL provided
    let profileContent = "";
    if (linkedinUrl) {
      profileContent = await scrapeLinkedIn(linkedinUrl);
    }

    // Synthesize dossier with Claude
    const response = await anthropic.messages.create({
      model: SONNET,
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `You are a sales interview coach helping a candidate prepare to meet a specific interviewer.

Interviewer: ${name}
Role/Title: ${roleTitle || "unknown"}
Company: ${companyName}

${profileContent ? `LinkedIn / Profile Content:\n${profileContent}\n\n` : ""}
Based on this person's role, title, and any available profile information, generate a practical interview intelligence dossier.

If you have limited information, make reasonable inferences based on their role/title at ${companyName}. A VP of Sales at a SaaS company has predictable patterns — use your knowledge of what people in that role typically care about.

Return ONLY valid JSON (no markdown):
{
  "name": "${name}",
  "roleTitle": "${roleTitle || ""}",
  "background": "2-3 sentences about their professional background and what they care about based on their role",
  "likelyFocusAreas": ["What they assess: 4-5 specific focus areas based on their role (e.g. VP Sales focuses on quota history, deal size, multi-threading)"],
  "suggestedTopicsToReference": ["3-4 things that would resonate with this person specifically (their role, company stage, what they've built)"],
  "likelyQuestions": ["4-5 questions this specific person is likely to ask based on their role and background"],
  "conversationalStyle": "Brief description of how someone in this role typically interviews (e.g. 'Direct, numbers-focused — will ask for specific metrics immediately')"
}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    const jsonText = content.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const dossier = JSON.parse(jsonText) as InterviewerDossier;

    // Store in Supabase (fire-and-forget)
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const db = createAdminClient();
      await db.from("interviewer_profiles").insert({
        session_id: sessionId,
        name,
        linkedin_url: linkedinUrl || null,
        role_title: roleTitle || null,
        company_name: companyName,
        raw_scraped: profileContent || null,
        dossier,
      });
    } catch {
      // Non-fatal — don't block response
    }

    return NextResponse.json({ dossier });
  } catch (err) {
    console.error("Interviewer research error:", err);
    return NextResponse.json(
      { error: "Failed to research interviewer" },
      { status: 500 }
    );
  }
}
