import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { aiLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { ResearchCompanyInputSchema } from "@/lib/types/schemas";
import { scrapeCompanyContent, buildCompanyProfile } from "@/lib/company-research";

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
    const parsed = ResearchCompanyInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { companyName, companyUrl, jobDescription } = parsed.data;

    const websiteContent = companyUrl ? await scrapeCompanyContent(companyUrl) : "";

    const company = await buildCompanyProfile({
      companyName,
      websiteContent,
      jobDescription,
    });

    return NextResponse.json({ company });
  } catch (err) {
    console.error("Company research error:", err);
    return NextResponse.json(
      { error: "Failed to generate company profile" },
      { status: 500 }
    );
  }
}
