import { NextRequest, NextResponse } from "next/server";
import { anthropic, SONNET, FIRECRAWL_API_KEY } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { isUrlSafe } from "@/lib/security/validate-url";
import { CompanyProfile } from "@/types";

interface RequestBody {
  companyName: string;
  companyUrl?: string;
  jobDescription: string;
  targetRole: string;
}

async function scrapeWithFirecrawl(url: string): Promise<string> {
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

  if (!res.ok) throw new Error(`Firecrawl error: ${res.status}`);
  const data = await res.json();
  return (data.data?.markdown ?? "").slice(0, 4000);
}

async function scrapeWithFetch(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)" },
    signal: AbortSignal.timeout(5000),
  });
  const html = await res.text();
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: RequestBody = await req.json();
    const { companyName, companyUrl, jobDescription, targetRole } = body;

    let websiteContent = "";
    if (companyUrl && isUrlSafe(companyUrl)) {
      try {
        if (FIRECRAWL_API_KEY) {
          websiteContent = await scrapeWithFirecrawl(companyUrl);
        } else {
          websiteContent = await scrapeWithFetch(companyUrl);
        }
      } catch {
        // Non-fatal — continue with partial data
      }
    }

    const response = await anthropic.messages.create({
      model: SONNET,
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Research ${companyName} and generate a structured company profile for a ${targetRole} interview candidate.

${websiteContent ? `Website content:\n${websiteContent}\n\n` : ""}Job Description:\n${jobDescription.slice(0, 2000)}

IMPORTANT: Only include facts you can infer from the provided website content and job description. For anything uncertain, use "unknown" or an empty array. Do NOT hallucinate company facts.

Return ONLY valid JSON (no markdown):
{
  "name": "${companyName}",
  "productDescription": "What they sell in plain language — 2-3 sentences",
  "icp": {
    "companySizes": ["e.g. SMB", "Mid-market", "Enterprise"],
    "industries": ["relevant industries"],
    "buyerPersonas": ["e.g. VP of Sales", "RevOps Manager"]
  },
  "salesMotion": "inbound"|"outbound"|"plg"|"hybrid"|"channel"|"unknown",
  "competitors": ["competitor names"],
  "techStack": ["CRM tools, outreach tools mentioned in JD"],
  "stage": "startup"|"scale_up"|"public"|"enterprise"|"unknown",
  "recentNews": ["2-3 recent relevant items — funding, product launches, partnerships"],
  "cultureSignals": ["3-4 signals from careers page or JD about culture, values, team"]
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

    const company = JSON.parse(jsonText) as CompanyProfile;

    return NextResponse.json({ company });
  } catch (err) {
    console.error("Company research error:", err);
    return NextResponse.json(
      { error: "Failed to generate company profile" },
      { status: 500 }
    );
  }
}
