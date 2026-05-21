import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCompanyName } from "@/lib/privacy/normalizer";
import type { CompanyProfile } from "@/types";
import { scrapeCompanyContent } from "./scrape";
import { buildCompanyProfile } from "./build-profile";

interface FindOrCreateOpts {
  /** Canonical company name (we normalize internally for matching). */
  name: string;
  /** Optional URL to scrape if no cached row exists. */
  url?: string;
  /**
   * Optional pre-built profile to use when we need to insert a row but
   * the caller already has the data (e.g. target company in
   * create-session — the client already ran /api/company-research and is
   * passing the profile in).
   */
  profileHint?: CompanyProfile;
  /** Optional JD context for fresh profile build. */
  jobDescription?: string;
}

export interface CompanyProfileRow {
  id: string;
  profile: CompanyProfile;
}

/**
 * Look up a company in `company_profiles`. On a cache miss, scrape +
 * synthesize a fresh profile (or use the caller's profileHint) and
 * INSERT a row, then return it.
 *
 * This function is the choke point that finally populates company_profiles —
 * prior to the Positioning Engine, the table existed in the schema but was
 * never written to. The engine's competitive_dynamics FK depends on a real
 * row existing, so any caller that wants to write a competitive_dynamics
 * row must resolve both anchor + target through this helper first.
 *
 * Best-effort: returns null when the company cannot be resolved at all
 * (scrape failure + no profileHint). The engine treats null as "skip
 * competitive research; degrade to a brief without competitive_dynamic_id".
 */
export async function findOrCreateCompanyProfile(
  opts: FindOrCreateOpts
): Promise<CompanyProfileRow | null> {
  const db = createAdminClient();
  const normalized = normalizeCompanyName(opts.name);

  // ── Cache lookup: case-insensitive match on the normalized name ──
  // company_profiles has `unique (company_name)` but does not normalize on
  // its own; match defensively using ilike on the canonical name plus a
  // raw equality check on the input string.
  const { data: existing } = await db
    .from("company_profiles")
    .select("id, profile_data, company_name")
    .or(`company_name.eq.${opts.name},company_name.ilike.${escapeIlike(normalized)}`)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id as string,
      profile: existing.profile_data as CompanyProfile,
    };
  }

  // ── Cache miss: resolve a fresh profile ─────────────────────────────
  let profile: CompanyProfile | null = opts.profileHint ?? null;

  if (!profile) {
    let websiteContent = "";
    if (opts.url) {
      websiteContent = await scrapeCompanyContent(opts.url);
    }
    try {
      profile = await buildCompanyProfile({
        companyName: opts.name,
        websiteContent,
        jobDescription: opts.jobDescription,
      });
    } catch {
      return null;
    }
  }

  // ── Insert ─────────────────────────────────────────────────────────
  // Use the canonical (input) name to preserve display formatting; rely
  // on company_profiles' `unique (company_name)` constraint to suppress
  // duplicate races (ON CONFLICT DO NOTHING + re-select).
  const { data: inserted, error } = await db
    .from("company_profiles")
    .insert({
      company_name: opts.name,
      company_url: opts.url ?? null,
      profile_data: profile,
      // Let `source` default to 'manual' (schema default). The
      // company_source enum is firecrawl|raw_fetch|manual — we don't
      // reliably know which scrape path actually returned content, so
      // 'manual' is the honest catch-all for engine-driven inserts.
    })
    .select("id, profile_data")
    .single();

  if (error) {
    // Race: another request inserted concurrently. Re-fetch.
    const { data: raced } = await db
      .from("company_profiles")
      .select("id, profile_data")
      .eq("company_name", opts.name)
      .maybeSingle();
    if (raced) {
      return {
        id: raced.id as string,
        profile: raced.profile_data as CompanyProfile,
      };
    }
    return null;
  }

  return {
    id: inserted.id as string,
    profile: inserted.profile_data as CompanyProfile,
  };
}

// PostgREST .or() with ilike requires escaping commas, parens, and the
// % wildcard from the value side. The normalized name is plain ASCII with
// no PG operators, but escape defensively.
function escapeIlike(s: string): string {
  return s.replace(/[,()]/g, "\\$&");
}
