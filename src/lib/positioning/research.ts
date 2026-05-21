import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCompanyName } from "@/lib/privacy/normalizer";
import { SONNET } from "@/lib/ai";
import { callClaudeForJson } from "@/lib/ai/json-call";
import { scrapeCompanyContent } from "@/lib/company-research";
import {
  buildCompetitiveSynthesisPrompt,
  type CompetitiveSynthesisContext,
} from "@/lib/ai/positioning-prompts";
import { CompetitiveSynthesisSchema } from "@/lib/types/schemas";
import type { z } from "zod";
import { checkAnswerQuality } from "@/lib/ai/quality-check";
import type {
  CompanyProfile,
  CompetitiveDynamic,
  CompetitivePoint,
  CompetitiveSourceType,
  InterrogationLine,
  PositioningType,
  SubstantiatedFact,
} from "@/types";

// ─── Section 7B — competitive dynamic research ────────────────────────────
//
// Runs only for direct_competitor, adjacent_player, ecosystem types.
// Returns a CompetitiveDynamic by way of: split-TTL cache check →
// (optional) source-mix research → Sonnet synthesis (v4 output:
// substantiated_facts + interrogation_lines) → quality-check pass →
// upsert. Never throws — degrades to research_depth='minimal' with empty
// arrays on any failure path.
// ─────────────────────────────────────────────────────────────────────────

const INTEL_TTL_DAYS = 90;
const TRUTHS_TTL_DAYS = 30;
const FETCH_CAP = 8;

export interface ResearchRequest {
  anchorCompanyId: string;
  targetCompanyId: string;
  anchorProfile: CompanyProfile;
  targetProfile: CompanyProfile;
  positioningType: PositioningType;
  /** Optional URL for the target company's marketing pages. */
  targetCompanyUrl?: string;
  /** Pre-built intel summary (from columns key_test, unique_element, common_questions, red_flags). */
  targetInterviewIntelSummary?: string;
  /** Force full re-run regardless of TTLs. */
  refresh?: boolean;
}

interface DynamicRow {
  id: string;
  anchor_company_id: string;
  target_company_id: string;
  competitive_relationship: string | null;
  target_company_wedge: string | null;
  anchor_company_wedge: string | null;
  where_target_wins: CompetitivePoint[] | null;
  where_anchor_wins: CompetitivePoint[] | null;
  shared_buyers: string[] | null;
  substantiated_facts: SubstantiatedFact[] | null;
  interrogation_lines: InterrogationLine[] | null;
  research_depth: CompetitiveDynamic["research_depth"];
  sources: CompetitiveDynamic["sources"] | null;
  intel_refreshed_at: string;
  truths_refreshed_at: string;
}

export async function researchCompetitiveDynamic(
  req: ResearchRequest
): Promise<CompetitiveDynamic> {
  const db = createAdminClient();

  // ── 1. Cache check + split-TTL logic ──────────────────────────────
  const { data: cached } = await db
    .from("competitive_dynamics")
    .select("*")
    .eq("anchor_company_id", req.anchorCompanyId)
    .eq("target_company_id", req.targetCompanyId)
    .maybeSingle<DynamicRow>();

  const now = Date.now();
  const intelFresh = cached
    ? now - new Date(cached.intel_refreshed_at).getTime() < INTEL_TTL_DAYS * 86_400_000
    : false;
  const truthsFresh = cached
    ? now - new Date(cached.truths_refreshed_at).getTime() < TRUTHS_TTL_DAYS * 86_400_000
    : false;

  if (cached && !req.refresh && intelFresh && truthsFresh) {
    return rowToDynamic(cached);
  }

  // Truths-only refresh: intel still good, truths stale. Re-synthesize
  // off the same scraped corpus (since synthesis is the output gate, not
  // the scrape itself) but with the existing company-level fields kept.
  const truthsOnlyRefresh = !!cached && !req.refresh && intelFresh && !truthsFresh;

  // ── 2. Research sources ───────────────────────────────────────────
  const { researchContent, sources } = await gatherResearch({
    anchorName: req.anchorProfile.name,
    targetName: req.targetProfile.name,
    targetUrl: req.targetCompanyUrl,
  });

  // ── 3. Sonnet synthesis (validated; retries once via json-call) ───
  const promptCtx: CompetitiveSynthesisContext = {
    anchorProfile: serializeProfile(req.anchorProfile),
    targetProfile: serializeProfile(req.targetProfile),
    positioningType: req.positioningType,
    researchContent,
    interviewIntelSummary: req.targetInterviewIntelSummary ?? "",
  };
  const { system, user, maxTokens } = buildCompetitiveSynthesisPrompt(promptCtx);

  let synth: Synth;
  try {
    const { data } = await callClaudeForJson({
      model: SONNET,
      system,
      user,
      maxTokens,
      schema: CompetitiveSynthesisSchema,
      label: "researchCompetitiveDynamic",
    });
    synth = data;
  } catch (err) {
    console.error("[positioning_engine] synthesis failed; degrading", {
      anchor: req.anchorProfile.name,
      target: req.targetProfile.name,
      err: err instanceof Error ? err.message : String(err),
    });
    synth = toMinimalSynth();
  }

  // ── 4. Quality-check pass over generated text ─────────────────────
  // Caller-orchestrated regen, per the existing pipeline pattern. On a
  // critical hit we re-run synthesis once with the correction prompt
  // appended; if it still trips, we ship the cleaner of the two.
  synth = await applyQualityCheckPass(synth, promptCtx);

  // ── 5. Upsert ────────────────────────────────────────────────────
  const upsertPayload = buildUpsertPayload({
    cached,
    truthsOnlyRefresh,
    anchorCompanyId: req.anchorCompanyId,
    targetCompanyId: req.targetCompanyId,
    synth,
    sources,
  });

  const { data: upserted, error } = await db
    .from("competitive_dynamics")
    .upsert(upsertPayload, { onConflict: "anchor_company_id,target_company_id" })
    .select("*")
    .single<DynamicRow>();

  if (error || !upserted) {
    console.error("[positioning_engine] competitive_dynamics upsert failed", {
      err: error?.message,
    });
    // Synthesize an in-memory row so the orchestrator can still assemble
    // a brief. The id will be unusable as an FK — caller checks for this.
    return {
      id: "",
      anchor_company_id: req.anchorCompanyId,
      target_company_id: req.targetCompanyId,
      competitive_relationship: synth.competitive_relationship,
      target_company_wedge: synth.target_company_wedge,
      anchor_company_wedge: synth.anchor_company_wedge,
      where_target_wins: synth.where_target_wins,
      where_anchor_wins: synth.where_anchor_wins,
      shared_buyers: synth.shared_buyers,
      substantiated_facts: synth.substantiated_facts,
      interrogation_lines: synth.interrogation_lines,
      research_depth: synth.research_depth,
      sources,
      intel_refreshed_at: new Date().toISOString(),
      truths_refreshed_at: new Date().toISOString(),
    };
  }

  return rowToDynamic(upserted);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function rowToDynamic(row: DynamicRow): CompetitiveDynamic {
  return {
    id: row.id,
    anchor_company_id: row.anchor_company_id,
    target_company_id: row.target_company_id,
    competitive_relationship: row.competitive_relationship,
    target_company_wedge: row.target_company_wedge,
    anchor_company_wedge: row.anchor_company_wedge,
    where_target_wins: row.where_target_wins ?? [],
    where_anchor_wins: row.where_anchor_wins ?? [],
    shared_buyers: row.shared_buyers ?? [],
    substantiated_facts: row.substantiated_facts ?? [],
    interrogation_lines: row.interrogation_lines ?? [],
    research_depth: row.research_depth,
    sources: row.sources ?? [],
    intel_refreshed_at: row.intel_refreshed_at,
    truths_refreshed_at: row.truths_refreshed_at,
  };
}

function serializeProfile(p: CompanyProfile): string {
  return [
    `Name: ${p.name}`,
    `Product: ${p.productDescription}`,
    `Sales motion: ${p.salesMotion}`,
    `Stage: ${p.stage}`,
    `ICP industries: ${(p.icp?.industries ?? []).join(", ") || "unknown"}`,
    `Buyer personas: ${(p.icp?.buyerPersonas ?? []).join(", ") || "unknown"}`,
    `Competitors (auto): ${(p.competitors ?? []).join(", ") || "unknown"}`,
    `Recent news: ${(p.recentNews ?? []).slice(0, 3).join("; ") || "none"}`,
  ].join("\n");
}

type Synth = z.infer<typeof CompetitiveSynthesisSchema>;

function toMinimalSynth(): Synth {
  return {
    competitive_relationship: "",
    target_company_wedge: "",
    anchor_company_wedge: "",
    where_target_wins: [],
    where_anchor_wins: [],
    shared_buyers: [],
    substantiated_facts: [],
    interrogation_lines: [],
    research_depth: "minimal",
  };
}

// ─── Research source mix ─────────────────────────────────────────────────
//
// Reality check per v3.1 §7B: marketing pages + Reddit are the baseline
// that reliably returns content. G2 / RepVue / Bravado / Glassdoor are
// best-effort and frequently return nothing. We attempt the ones with
// canonical URL patterns (G2 compare, Reddit search) plus the target's
// marketing pages if a URL is known. Expect ~half to return empty.

interface GatherOpts {
  anchorName: string;
  targetName: string;
  targetUrl?: string;
}

interface Source {
  url: string;
  title: string;
  source_type: CompetitiveSourceType | string;
}

async function gatherResearch(
  opts: GatherOpts
): Promise<{ researchContent: string; sources: Source[] }> {
  const anchorSlug = slug(opts.anchorName);
  const targetSlug = slug(opts.targetName);

  // Build candidate fetch list. Ordered: marketing → reddit → g2.
  // Cap to FETCH_CAP. Each entry tagged with its source_type so synthesis
  // can weight confidence honestly.
  const candidates: { url: string; source_type: CompetitiveSourceType; title: string }[] = [];

  if (opts.targetUrl) {
    const base = opts.targetUrl.replace(/\/+$/, "");
    candidates.push(
      { url: base, source_type: "marketing", title: `${opts.targetName} — home` },
      { url: `${base}/products`, source_type: "marketing", title: `${opts.targetName} — products` },
      {
        url: `${base}/compare/${anchorSlug}`,
        source_type: "marketing",
        title: `${opts.targetName} — vs ${opts.anchorName}`,
      }
    );
  }
  candidates.push({
    url: `https://www.reddit.com/r/sales/search.json?q=${encodeURIComponent(`${opts.anchorName} vs ${opts.targetName}`)}&restrict_sr=1&sort=relevance&limit=10`,
    source_type: "reddit",
    title: `r/sales — ${opts.anchorName} vs ${opts.targetName}`,
  });
  candidates.push({
    url: `https://www.g2.com/compare/${anchorSlug}-vs-${targetSlug}`,
    source_type: "g2",
    title: `G2 compare — ${opts.anchorName} vs ${opts.targetName}`,
  });

  // Truncate to cap.
  const toFetch = candidates.slice(0, FETCH_CAP);

  // Concurrent best-effort fetches.
  const results = await Promise.all(
    toFetch.map(async (c) => {
      const text =
        c.source_type === "reddit"
          ? await fetchRedditJson(c.url).catch(() => "")
          : await scrapeCompanyContent(c.url);
      return { ...c, text };
    })
  );

  const successful = results.filter((r) => r.text.trim().length > 0);

  const researchContent = successful
    .map((r) => `[source: ${r.source_type}] ${r.title}\n${r.text}\n`)
    .join("\n---\n");

  const sources: Source[] = successful.map(({ url, title, source_type }) => ({
    url,
    title,
    source_type,
  }));

  return { researchContent, sources };
}

async function fetchRedditJson(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SalesPrepBot/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { data?: { children?: { data?: { title?: string; selftext?: string; permalink?: string } }[] } };
    const posts = data.data?.children ?? [];
    if (posts.length === 0) return "";
    return posts
      .slice(0, 6)
      .map((p) => {
        const title = p.data?.title ?? "";
        const body = (p.data?.selftext ?? "").slice(0, 400);
        return `Thread: ${title}\n${body}`;
      })
      .join("\n\n")
      .slice(0, 3000);
  } catch {
    return "";
  }
}

function slug(name: string): string {
  return normalizeCompanyName(name).replace(/\s+/g, "-");
}

// ─── Quality-check pass ─────────────────────────────────────────────────
//
// Reuses the existing checkAnswerQuality scanner (banned-phrase regexes).
// Runs over every generated text field. If any critical issue fires, we
// re-run synthesis once with the correction prompt appended. On a second
// failure we keep the run with fewer critical hits — never block the
// session on a banned phrase.

async function applyQualityCheckPass(
  synth: Synth,
  promptCtx: CompetitiveSynthesisContext
): Promise<Synth> {
  const corrections = await collectCriticalIssues(synth);
  if (corrections.length === 0) return synth;

  const { system, user, maxTokens } = buildCompetitiveSynthesisPrompt(promptCtx);
  const correctionPrompt = `\n\nYour previous response tripped these banned-phrase rules; rewrite the affected fields:\n${corrections
    .slice(0, 6)
    .map((c) => `- "${c.pattern}" in ${c.location}: ${c.fix}`)
    .join("\n")}\nReturn the full JSON object again with the offending phrasing removed.`;

  try {
    const { data: retry } = await callClaudeForJson({
      model: SONNET,
      system,
      user: user + correctionPrompt,
      maxTokens,
      schema: CompetitiveSynthesisSchema,
      label: "researchCompetitiveDynamic.qualityCheckRetry",
    });
    const retryCorrections = await collectCriticalIssues(retry);
    return retryCorrections.length < corrections.length ? retry : synth;
  } catch {
    return synth;
  }
}

/**
 * Run every generated text field through the existing checkAnswerQuality
 * scanner. Returns the list of critical issues with their location and
 * the suggested fix — used to build the correction prompt for one retry.
 */
async function collectCriticalIssues(synth: Synth) {
  const fields: { text: string; location: string }[] = [];
  if (synth.competitive_relationship) {
    fields.push({ text: synth.competitive_relationship, location: "competitive_relationship" });
  }
  if (synth.target_company_wedge) {
    fields.push({ text: synth.target_company_wedge, location: "target_company_wedge" });
  }
  if (synth.anchor_company_wedge) {
    fields.push({ text: synth.anchor_company_wedge, location: "anchor_company_wedge" });
  }
  synth.where_target_wins.forEach((p, i) =>
    fields.push({ text: p.detail, location: `where_target_wins[${i}].detail` })
  );
  synth.where_anchor_wins.forEach((p, i) =>
    fields.push({ text: p.detail, location: `where_anchor_wins[${i}].detail` })
  );
  synth.substantiated_facts.forEach((f, i) =>
    fields.push({ text: f.fact, location: `substantiated_facts[${i}].fact` })
  );
  synth.interrogation_lines.forEach((l, i) => {
    fields.push({ text: l.question, location: `interrogation_lines[${i}].question` });
    fields.push({ text: l.why_it_matters, location: `interrogation_lines[${i}].why_it_matters` });
  });

  const all = await Promise.all(
    fields.map(async (f) => {
      const r = await checkAnswerQuality(f.text, "company_brief");
      return r.issues
        .filter((i) => i.severity === "critical")
        .map((i) => ({ pattern: i.pattern, location: f.location, fix: i.fix }));
    })
  );
  return all.flat();
}

interface UpsertOpts {
  cached: DynamicRow | null;
  truthsOnlyRefresh: boolean;
  anchorCompanyId: string;
  targetCompanyId: string;
  synth: Synth;
  sources: Source[];
}

function buildUpsertPayload(opts: UpsertOpts) {
  const nowIso = new Date().toISOString();

  // Truths-only refresh: keep cached company-level intel; replace only
  // the output arrays + bump truths_refreshed_at. Sources merged.
  if (opts.truthsOnlyRefresh && opts.cached) {
    return {
      anchor_company_id: opts.anchorCompanyId,
      target_company_id: opts.targetCompanyId,
      competitive_relationship: opts.cached.competitive_relationship,
      target_company_wedge: opts.cached.target_company_wedge,
      anchor_company_wedge: opts.cached.anchor_company_wedge,
      where_target_wins: opts.cached.where_target_wins ?? [],
      where_anchor_wins: opts.cached.where_anchor_wins ?? [],
      shared_buyers: opts.cached.shared_buyers ?? [],
      substantiated_facts: opts.synth.substantiated_facts,
      interrogation_lines: opts.synth.interrogation_lines,
      research_depth: opts.synth.research_depth,
      sources: dedupSources([...(opts.cached.sources ?? []), ...opts.sources]),
      intel_refreshed_at: opts.cached.intel_refreshed_at,
      truths_refreshed_at: nowIso,
    };
  }

  // Full refresh / first write: everything new.
  return {
    anchor_company_id: opts.anchorCompanyId,
    target_company_id: opts.targetCompanyId,
    competitive_relationship: opts.synth.competitive_relationship,
    target_company_wedge: opts.synth.target_company_wedge,
    anchor_company_wedge: opts.synth.anchor_company_wedge,
    where_target_wins: opts.synth.where_target_wins,
    where_anchor_wins: opts.synth.where_anchor_wins,
    shared_buyers: opts.synth.shared_buyers,
    substantiated_facts: opts.synth.substantiated_facts,
    interrogation_lines: opts.synth.interrogation_lines,
    research_depth: opts.synth.research_depth,
    sources: opts.sources,
    intel_refreshed_at: nowIso,
    truths_refreshed_at: nowIso,
  };
}

function dedupSources(list: Source[]): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const s of list) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
  }
  return out;
}
