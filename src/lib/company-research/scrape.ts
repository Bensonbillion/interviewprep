import "server-only";
import { FIRECRAWL_API_KEY } from "@/lib/ai";
import { validateExternalUrl } from "@/lib/security/validate-url";

/**
 * Scrape a single URL via Firecrawl, falling back to a raw fetch +
 * tag-strip when Firecrawl is unavailable. Returns the trimmed body
 * (markdown when available, otherwise stripped HTML), capped to a budget
 * that fits in downstream prompt context.
 *
 * Returns an empty string on any failure — callers treat scraping as
 * best-effort. Never throws.
 */
export async function scrapeCompanyContent(url: string): Promise<string> {
  const urlOk = await validateExternalUrl(url).catch(() => null);
  if (!urlOk?.valid) return "";

  try {
    if (FIRECRAWL_API_KEY) {
      return await scrapeWithFirecrawl(url);
    }
    return await scrapeWithFetch(url);
  } catch {
    return "";
  }
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
  const data = (await res.json()) as { data?: { markdown?: string } };
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
