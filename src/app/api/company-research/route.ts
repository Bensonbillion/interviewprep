import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth/verify";
import { aiLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { scrapeCompanyContent, buildCompanyProfile } from "@/lib/company-research";

interface RequestBody {
  companyName: string;
  companyUrl?: string;
  jobDescription: string;
  targetRole: string;
}

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

    const body: RequestBody = await req.json();
    const { companyName, companyUrl, jobDescription, targetRole } = body;

    const websiteContent = companyUrl ? await scrapeCompanyContent(companyUrl) : "";

    const company = await buildCompanyProfile({
      companyName,
      websiteContent,
      jobDescription,
      targetRole,
    });

    return NextResponse.json({ company });
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    console.error("Company research error:", rawMsg);
    return NextResponse.json(
      { error: "Failed to generate company profile" },
      { status: 500 }
    );
  }
}
