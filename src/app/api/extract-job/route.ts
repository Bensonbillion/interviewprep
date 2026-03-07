import { NextRequest, NextResponse } from "next/server";
import { anthropic, HAIKU, FIRECRAWL_API_KEY } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { aiLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { extractJobSchema } from "@/lib/validation/schemas";
import { validateExternalUrl } from "@/lib/security/validate-url";

interface JobExtraction {
  company_name: string | null;
  role_title: string | null;
  job_description: string | null;
  company_website: string | null;
  source: "greenhouse_api" | "lever_api" | "jsonld" | "firecrawl" | "fallback";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractJsonLd(html: string, type: string): Record<string, unknown> | null {
  const regex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]) as Record<string, unknown>;
      if (data["@type"] === type) return data;
      if (Array.isArray(data["@graph"])) {
        const found = (data["@graph"] as Record<string, unknown>[]).find(
          (item) => item["@type"] === type
        );
        if (found) return found;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Last-resort extraction: parse company name from hostname and role title
 * from URL path (kebab-case slug → Title Case).
 * e.g. careers.riverside.com/careers/agency-account-executive-e0cbb
 *   → { company_name: "Riverside", role_title: "Agency Account Executive" }
 */
function extractFromUrl(rawUrl: string): { company_name: string | null; role_title: string | null } {
  try {
    const parsed = new URL(rawUrl);
    const SKIP_PARTS = new Set(["careers", "jobs", "work", "apply", "recruiting", "www", "com", "io", "co", "net", "org"]);
    const hostParts = parsed.hostname.split(".");
    const companyPart = hostParts.find((p) => p.length > 1 && !SKIP_PARTS.has(p));
    const company_name = companyPart
      ? companyPart.charAt(0).toUpperCase() + companyPart.slice(1)
      : null;

    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const SKIP_PATHS = new Set(["careers", "jobs", "openings", "positions", "apply", "job"]);
    const rolePart = [...pathParts].reverse().find((p) => !SKIP_PATHS.has(p.toLowerCase()));
    const cleaned = rolePart?.replace(/-[a-f0-9]{4,8}$/i, "").replace(/-\d{5,}$/, "") ?? null;
    const role_title = cleaned
      ? cleaned.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
      : null;

    return { company_name, role_title };
  } catch {
    return { company_name: null, role_title: null };
  }
}

/**
 * Shared Claude Haiku extraction: takes any text content (HTML-stripped or markdown)
 * and returns structured job fields. Used by both Tier 3 and Tier 4.
 */
async function extractWithClaude(
  textContent: string
): Promise<Omit<JobExtraction, "source" | "company_website"> | null> {
  try {
    const aiRes = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Extract job details from this page content. Return ONLY valid JSON, no markdown fences.

Schema: {"company_name": string|null, "role_title": string|null, "job_description": string|null}

Rules:
- company_name: the hiring company's name (not a recruiter or staffing firm)
- role_title: the exact job title being posted
- job_description: ALL text about the role — responsibilities, requirements, and qualifications. Include everything relevant, aim for at least 100 words if the content is present.
- Return null for any field you cannot determine with confidence.

Page content:
${textContent}`,
        },
      ],
    });

    const textBlock = aiRes.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;
    const jsonText = textBlock.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as {
      company_name?: string | null;
      role_title?: string | null;
      job_description?: string | null;
    };
    if (!parsed.company_name && !parsed.role_title) return null;
    return {
      company_name: parsed.company_name || null,
      role_title: parsed.role_title || null,
      job_description: parsed.job_description || null,
    };
  } catch {
    return null;
  }
}

/**
 * Tier 4: Firecrawl headless scrape → markdown → Claude extraction.
 * Handles JS-rendered pages (Webflow, Workday, LinkedIn).
 */
async function scrapeWithFirecrawl(url: string): Promise<JobExtraction | null> {
  if (!FIRECRAWL_API_KEY) return null;
  try {
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      signal: AbortSignal.timeout(10000),
    });
    if (!scrapeRes.ok) return null;
    const scrapeData = await scrapeRes.json();
    const markdown = (scrapeData.data?.markdown as string | undefined)?.trim();
    if (!markdown || markdown.length < 50) return null;

    const extracted = await extractWithClaude(markdown.slice(0, 5000));
    if (!extracted) return null;

    return { ...extracted, company_website: null, source: "firecrawl" };
  } catch {
    return null;
  }
}

type JinaResult =
  | { ok: true; data: JobExtraction }
  | { ok: false; expired: true }  // URL is a confirmed 404
  | { ok: false; expired: false }; // scrape failed for another reason

/**
 * Tier 4a: Jina Reader (free, no API key, handles JS-rendered pages via headless browser).
 * Usage: GET https://r.jina.ai/{url} → returns clean markdown of the rendered page.
 */
async function scrapeWithJina(url: string): Promise<JinaResult> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: "text/plain", "X-Return-Format": "markdown" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, expired: false };
    const markdown = (await res.text()).trim();
    if (!markdown || markdown.length < 100) return { ok: false, expired: false };

    // Jina surfaces 404s explicitly in the first few lines
    if (/error 404|404: not found/i.test(markdown.slice(0, 500))) {
      console.log("[extract-job] Jina: URL is a 404");
      return { ok: false, expired: true };
    }

    console.log("[extract-job] Jina markdown chars:", markdown.length);
    const extracted = await extractWithClaude(markdown.slice(0, 5000));
    if (!extracted) return { ok: false, expired: false };

    return { ok: true, data: { ...extracted, company_website: null, source: "fallback" } };
  } catch {
    return { ok: false, expired: false };
  }
}

/**
 * LinkedIn guest jobs API — public, no auth required.
 * Returns an HTML fragment with structured job data.
 */
async function scrapeLinkedIn(url: string): Promise<JobExtraction | null> {
  const jobIdMatch = url.match(/\/jobs\/view\/(\d+)/);
  if (!jobIdMatch) return null;
  const jobId = jobIdMatch[1];

  try {
    const res = await fetch(
      `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const html = await res.text();
    if (html.length < 100) return null;

    // JSON-LD first (LinkedIn embeds JobPosting schema)
    const jsonLd = extractJsonLd(html, "JobPosting");
    if (jsonLd) {
      const org = jsonLd.hiringOrganization as Record<string, string> | undefined;
      console.log("[extract-job] LinkedIn guest API — JSON-LD hit");
      return {
        company_name: org?.name ?? null,
        role_title: (jsonLd.title as string) ?? null,
        job_description: jsonLd.description
          ? stripHtml(jsonLd.description as string)
          : null,
        company_website: org?.sameAs ?? null,
        source: "jsonld",
      };
    }

    // Fallback: strip HTML and let Claude parse the fragment
    const plain = stripHtml(html);
    if (plain.length < 100) return null;
    console.log("[extract-job] LinkedIn guest API — Claude fallback, chars:", plain.length);
    const extracted = await extractWithClaude(plain.slice(0, 5000));
    if (!extracted) return null;
    return { ...extracted, company_website: null, source: "fallback" };
  } catch {
    return null;
  }
}

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
    const parsed = extractJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const { url } = parsed.data;

    const urlCheck = await validateExternalUrl(url);
    if (!urlCheck.valid) {
      return NextResponse.json({ error: `Invalid URL: ${urlCheck.reason}` }, { status: 400 });
    }

    const isLinkedIn = url.includes("linkedin.com");

    // LinkedIn: dedicated guest API tier (no login required)
    if (isLinkedIn) {
      console.log("[extract-job] LinkedIn URL — trying guest API");
      const linkedInResult = await scrapeLinkedIn(url);
      if (linkedInResult) {
        console.log("[extract-job] LinkedIn guest API success");
        return NextResponse.json(linkedInResult);
      }
      console.log("[extract-job] LinkedIn guest API failed — falling through to Jina");
    }

    if (!isLinkedIn) {
      // Tier 1: Greenhouse public API
      const greenhouse = url.match(/boards\.greenhouse\.io\/(\w+)\/jobs\/(\d+)/);
      if (greenhouse) {
        const [, board, jobId] = greenhouse;
        try {
          const res = await fetch(
            `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${jobId}`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (res.ok) {
            const data = await res.json();
            console.log("[extract-job] Tier 1 Greenhouse success");
            return NextResponse.json({
              company_name: (data.company?.name as string) || board,
              role_title: (data.title as string) || null,
              job_description: data.content ? stripHtml(data.content as string) : null,
              company_website: null,
              source: "greenhouse_api",
            } satisfies JobExtraction);
          }
        } catch { /* fall through */ }
      }

      // Tier 2: Lever public API
      const lever = url.match(/jobs\.lever\.co\/([^/]+)\/([a-f0-9-]+)/);
      if (lever) {
        const [, company, jobId] = lever;
        try {
          const res = await fetch(
            `https://api.lever.co/v0/postings/${company}/${jobId}?mode=json`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (res.ok) {
            const data = await res.json();
            console.log("[extract-job] Tier 2 Lever success");
            return NextResponse.json({
              company_name: (data.categories?.team as string) || company,
              role_title: (data.text as string) || null,
              job_description:
                (data.descriptionPlain as string) ||
                (data.description ? stripHtml(data.description as string) : null),
              company_website: (data.hostedUrl as string) || null,
              source: "lever_api",
            } satisfies JobExtraction);
          }
        } catch { /* fall through */ }
      }

      // Tier 3: Raw fetch → JSON-LD → Claude text extraction
      // Works for SSR pages (Next.js, Rails, plain HTML) without Firecrawl
      try {
        const htmlRes = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; SalesPrepBot/1.0)" },
          signal: AbortSignal.timeout(5000),
        });
        if (htmlRes.ok) {
          const html = await htmlRes.text();

          // 3a: JSON-LD structured data (fastest, free)
          const jsonLd = extractJsonLd(html, "JobPosting");
          if (jsonLd) {
            const org = jsonLd.hiringOrganization as Record<string, string> | undefined;
            console.log("[extract-job] Tier 3a JSON-LD success");
            return NextResponse.json({
              company_name: org?.name ?? null,
              role_title: (jsonLd.title as string) ?? null,
              job_description: (jsonLd.description as string) ?? null,
              company_website: org?.sameAs ?? null,
              source: "jsonld",
            } satisfies JobExtraction);
          }

          // 3b: Strip HTML tags, send plain text to Claude Haiku
          // Covers career pages that don't use JSON-LD schema markup
          const plainText = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          if (plainText.length > 300) {
            console.log("[extract-job] Tier 3b Claude HTML extraction, chars:", plainText.length);
            const extracted = await extractWithClaude(plainText.slice(0, 5000));
            if (extracted) {
              console.log("[extract-job] Tier 3b success");
              return NextResponse.json({
                ...extracted,
                company_website: null,
                source: "fallback",
              } satisfies JobExtraction);
            }
          }
        }
      } catch { /* fall through */ }
    }

    // Tier 4a: Jina Reader (free, no key — headless JS rendering for Webflow, SPAs, etc.)
    console.log("[extract-job] Tier 4a Jina Reader");
    const jinaResult = await scrapeWithJina(url);
    if (jinaResult.ok) {
      console.log("[extract-job] Tier 4a Jina success");
      return NextResponse.json(jinaResult.data);
    }
    if (jinaResult.expired) {
      // URL is confirmed dead — tell the user rather than silently partial-filling
      return NextResponse.json(
        { error: "This job listing appears to have been removed or expired. Try a fresh URL from the company's careers page, or enter the details below." },
        { status: 422 }
      );
    }
    console.log("[extract-job] Tier 4a Jina failed");

    // Tier 4b: Firecrawl + Claude (JS-rendered pages: Webflow, Workday, LinkedIn, Greenhouse SPA)
    console.log(`[extract-job] Tier 4b Firecrawl — key set: ${!!FIRECRAWL_API_KEY}`);
    const firecrawlResult = await scrapeWithFirecrawl(url);
    if (firecrawlResult) {
      console.log("[extract-job] Tier 4b Firecrawl success");
      return NextResponse.json(firecrawlResult);
    }

    // LinkedIn-specific failure message
    if (isLinkedIn) {
      return NextResponse.json(
        {
          error:
            "LinkedIn requires login to access job listings. Try the company's careers page URL, or enter the details below.",
          linkedin: true,
        },
        { status: 422 }
      );
    }

    // Tier 5: URL-based fallback — company from hostname, role from path slug
    const urlFallback = extractFromUrl(url);
    if (urlFallback.company_name || urlFallback.role_title) {
      console.log("[extract-job] Tier 5 URL fallback:", urlFallback);
      return NextResponse.json({
        ...urlFallback,
        job_description: null,
        company_website: null,
        source: "fallback",
      } satisfies JobExtraction);
    }

    return NextResponse.json(
      { error: "We couldn't extract this listing — enter the details below, or paste the job description directly." },
      { status: 422 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
