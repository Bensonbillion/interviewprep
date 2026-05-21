import "server-only";
import { anthropic, SONNET } from "@/lib/ai";
import type { CompanyProfile } from "@/types";

interface BuildOpts {
  companyName: string;
  /** Scraped website content; pass empty string if none. */
  websiteContent?: string;
  /** Optional JD context — improves ICP/tech-stack accuracy. */
  jobDescription?: string;
  /** Optional target role — biases the profile toward the candidate's seat. */
  targetRole?: string;
}

/**
 * Generate a structured CompanyProfile via Claude Sonnet.
 *
 * Extracted from /api/company-research and /api/research-company so the
 * Positioning Engine can call it directly (anchor-company resolution on
 * cache miss) without duplicating prompt text. Both routes also delegate
 * here.
 */
export async function buildCompanyProfile(opts: BuildOpts): Promise<CompanyProfile> {
  const { companyName, websiteContent = "", jobDescription = "", targetRole } = opts;

  const roleLine = targetRole
    ? ` for a ${targetRole} interview candidate`
    : ` for a sales interview candidate`;
  const websiteBlock = websiteContent ? `Website content:\n${websiteContent}\n\n` : "";
  const jdBlock = jobDescription ? `Job Description:\n${jobDescription.slice(0, 2000)}\n\n` : "";

  const prompt = `Research ${companyName} and generate a structured company profile${roleLine}.

${websiteBlock}${jdBlock}IMPORTANT: Only include facts you can infer from the provided content. For anything uncertain, use "unknown" or an empty array. Do NOT hallucinate company facts.

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
  "techStack": ["CRM/outreach tools mentioned in JD"],
  "stage": "startup"|"scale_up"|"public"|"enterprise"|"unknown",
  "recentNews": ["2-3 recent items — funding, launches, partnerships"],
  "cultureSignals": ["3-4 culture signals from careers page or JD"]
}`;

  const response = await anthropic.messages.create({
    model: SONNET,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Unexpected response type from company profile build");
  }

  const cleaned = block.text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in company research response");

  return JSON.parse(match[0]) as CompanyProfile;
}
