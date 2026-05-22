/**
 * Generate the landing-page kit fixture.
 *
 * Stages a Motive→Samsara session (same fixture as checkpoint-spine.ts),
 * builds the spine, then generates FIVE answer types live via Sonnet:
 *   - tell_me_about_yourself  (real personal-arc — NOT a competitive answer)
 *   - why_this_company         (the competitive scroll-stopper)
 *   - behavioral_star          (a "deal I lost" STAR story)
 *   - objection_response       (handles "you've never sold SaaS")
 *   - questions_to_ask         (smart interviewer questions)
 *
 * Saves each card's full content to tests/fixtures/landing-kit-samples.json.
 * The landing page hard-codes hand-picked excerpts from the saved JSON;
 * the JSON itself stays in the repo as provenance and for regeneration.
 *
 * Usage: npx tsx scripts/generate-landing-kit-fixture.ts
 *
 * Cleans up the test prep_sessions row (and its captured_insights,
 * positioning_brief, narrative_spine via cascade). The shared
 * competitive_dynamics + company_profiles cache rows are kept.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { Module } from "module";

// ─── server-only shim + .env.local ──────────────────────────────────
const EMPTY_PATH = resolve(process.cwd(), "node_modules/server-only/empty.js");
const _origResolve = (Module as unknown as { _resolveFilename: (req: string, parent: unknown, ...rest: unknown[]) => string })._resolveFilename;
(Module as unknown as { _resolveFilename: (req: string, parent: unknown, ...rest: unknown[]) => string })._resolveFilename = function (
  request: string,
  parent: unknown,
  ...rest: unknown[]
) {
  if (request === "server-only") return EMPTY_PATH;
  return _origResolve.call(this, request, parent, ...rest);
};

try {
  const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  for (const line of envContent.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1).replace(/^["']|["']$/g, "");
  }
} catch {
  console.error("Could not read .env.local");
  process.exit(1);
}
for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "ANTHROPIC_API_KEY"]) {
  if (!process.env[k]) {
    console.error(`Missing ${k}`);
    process.exit(1);
  }
}

// Fixtures — identical to checkpoint-spine.ts so the spine is identical.
const SUBSTANTIVE_ANSWER_1 = `Last September I worked a 120-truck construction fleet in Texas — Hill & Sons, a regional. They were on Motive ELD and evaluating both of us for the dashcam + telematics expansion. About four weeks in, the safety director told me on a call point-blank that they were leaning Samsara because they didn't want to manage two vendor relationships and Samsara's site-visibility module covered their equipment yard, which we didn't have parity on yet.

I pulled in our SE to walk through how our open API let them integrate equipment telemetry from their existing yard system, and I lined up a 30-minute reference call with a similar-sized concrete carrier who'd kept us when Samsara pitched them. The reference call landed — the safety director called me afterward and said "you took my objection seriously." We closed the expansion at $42k ARR, signed mid-October.`;

const SUBSTANTIVE_ANSWER_2 = `A buyer at a 60-truck logistics company in Phoenix explicitly brought up the IDC safety report Samsara cites — the 73% crash reduction number — as the reason their COO wanted Samsara. I said, "that's a real number, and the methodology is fleets that fully deployed the AI dashcam program. What it doesn't tell you is the deployment friction — getting drivers to accept the cameras." I then walked them through how we structured our deployment to get driver buy-in in the first 90 days and how that affected adoption rates. They told me on the next call that no other rep had reframed the proof point that way. We closed at $18k ARR, six weeks later.`;

const THIN_SLOGAN_ANSWER = `We lost some deals to Samsara because they had better brand recognition with VP-level buyers and they're public so they had more credibility.`;

interface CardOutput {
  answerType: string;
  label: string;
  content: string;
  generatedAt: string;
  latencySeconds: number;
  chars: number;
}

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const { buildNarrativeSpine } = await import("@/lib/spine/build");
  const { loadNarrativeSpine } = await import("@/lib/spine/load");
  const { buildPromptForAnswerType } = await import("@/lib/ai/prompts");
  const { anthropic, SONNET, HAIKU } = await import("@/lib/ai");
  const { detectRoleSeniority } = await import("@/lib/ai/seniority");
  const { parseJobListing } = await import("@/lib/ai/job-listing");
  const { styleLint } = await import("@/lib/ai/style-lint");
  const { shouldHumanize } = await import("@/lib/ai/humanize-answer");

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { db: { schema: "public" }, auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── Locate cached competitive_dynamics ────────────────────────────
  const { data: anchor } = await db.from("company_profiles").select("id").eq("company_name", "Motive").maybeSingle();
  const { data: target } = await db.from("company_profiles").select("id").eq("company_name", "Samsara").maybeSingle();
  if (!anchor || !target) {
    console.error("Motive/Samsara not in company_profiles — run scripts/run-positioning-motive-samsara.ts first.");
    process.exit(1);
  }
  const { data: dyn } = await db
    .from("competitive_dynamics")
    .select("id, interrogation_lines")
    .eq("anchor_company_id", anchor.id)
    .eq("target_company_id", target.id)
    .maybeSingle();
  if (!dyn) {
    console.error("No cached competitive_dynamics — run the engine first.");
    process.exit(1);
  }
  const interrogationLines = dyn.interrogation_lines as { question: string; star_slot_hint: string }[];
  console.log(`✓ Cached competitive_dynamics (${interrogationLines.length} lines)`);

  // ── Stage session + brief + captured_insights ─────────────────────
  const motiveAeResume = buildMotiveAeResume();
  const samsaraCompany = buildSamsaraCompanyProfile();
  const sessionId = crypto.randomUUID();
  const { data: anyUser } = await db.from("users").select("id").limit(1).maybeSingle();
  const userId = (anyUser?.id as string | undefined) ?? null;

  console.log(`── Staging prep_sessions ${sessionId} ──`);
  const fullSession = {
    id: sessionId,
    resume: motiveAeResume,
    company: samsaraCompany,
    targetRole: "Account Executive",
    roleType: "account_executive" as const,
    stage: "hiring_manager" as const,
    jobDescription: "Account Executive at Samsara — selling integrated fleet operations platform to mid-market and enterprise fleets.",
    relevanceMap: { strongMatches: [], gaps: [], leadStories: [] },
  };
  await db.from("prep_sessions").insert({
    id: sessionId,
    user_id: userId,
    job_description: fullSession.jobDescription,
    target_role: fullSession.targetRole,
    role_type: fullSession.roleType,
    stage: fullSession.stage,
    insight_interview_status: "completed",
    session_data: fullSession,
  });

  await db.from("positioning_briefs").insert({
    session_id: sessionId,
    positioning_type: "direct_competitor",
    anchor_employer: "Motive",
    anchor_employer_role: "Mid-Market Account Executive",
    classification_reasoning: "Fixture run for landing-page kit content.",
    classification_confidence: 0.95,
    classification_signal: "company_profile_competitors",
    competitive_dynamic_id: dyn.id,
    transferable_bridges: [],
    domain_gap_to_close: null,
    company_hook: "Three years closing mid-market fleet deals at Motive; want to sell from the side of the platform integration story I've watched win.",
  });

  const fixtures = [
    { answer: SUBSTANTIVE_ANSWER_1, quality: "substantive" as const },
    { answer: SUBSTANTIVE_ANSWER_2, quality: "substantive" as const },
    { answer: THIN_SLOGAN_ANSWER, quality: "thin" as const },
  ];
  for (let i = 0; i < fixtures.length; i++) {
    const line = interrogationLines[i];
    const f = fixtures[i];
    await db.from("captured_insights").insert({
      session_id: sessionId,
      interrogation_line_index: i,
      interrogation_question: line.question,
      star_slot_hint: line.star_slot_hint,
      raw_answer: f.answer,
      final_answer: f.answer,
      answer_quality: f.quality,
      star_coverage: f.quality === "substantive"
        ? { s: true, t: true, a: true, r: true }
        : { s: true, t: false, a: false, r: false },
      follow_up_question: f.quality === "thin" ? "drill placeholder" : null,
      follow_up_dismissed: f.quality === "thin",
    });
  }
  console.log("✓ Captured insights inserted (2 substantive + 1 thin)");

  // ── Build spine ───────────────────────────────────────────────────
  console.log("── Building narrative spine ──");
  const t0 = Date.now();
  await buildNarrativeSpine(sessionId);
  console.log(`✓ Spine built in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const spine = await loadNarrativeSpine(sessionId);
  if (!spine) {
    console.error("loadNarrativeSpine returned null after build");
    await cleanup(db, sessionId);
    process.exit(1);
  }

  // ── Generate all five cards ───────────────────────────────────────
  const seniority = detectRoleSeniority(fullSession.targetRole, fullSession.jobDescription);
  const jobListingSignals = parseJobListing(fullSession.jobDescription);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseCtx: any = {
    resume: fullSession.resume,
    company: fullSession.company,
    relevanceMap: fullSession.relevanceMap,
    jobDescription: fullSession.jobDescription,
    targetRole: fullSession.targetRole,
    roleType: fullSession.roleType,
    stage: fullSession.stage,
    seniority,
    jobListingSignals,
    spine,
  };

  // Haiku-routed types per src/app/api/generate-answer/route.ts:23-27.
  const HAIKU_TYPES = new Set(["company_brief", "cheat_sheet", "comp_expectations"]);

  // Each card type with optional builder options (objection text, question).
  const cardTypes: { type: string; label: string; options?: Record<string, unknown> }[] = [
    { type: "tell_me_about_yourself", label: "Tell me about yourself" },
    { type: "why_this_company", label: "Why Samsara?" },
    { type: "behavioral_star", label: "Tell me about a deal you lost" },
    { type: "objection_response", label: "You've never sold SaaS — why hire you?", options: { objection: "You've never sold SaaS — why should we hire you?" } },
    { type: "questions_to_ask", label: "Questions to ask your interviewer" },
  ];

  const results: CardOutput[] = [];

  for (const c of cardTypes) {
    console.log(`\n── ${c.type} ──`);
    const t1 = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { system, user, maxTokens } = buildPromptForAnswerType(c.type as any, baseCtx, c.options as any);
    const model = HAIKU_TYPES.has(c.type) ? HAIKU : SONNET;
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = response.content[0];
    if (block.type !== "text") throw new Error(`Unexpected response type for ${c.type}`);
    let raw = block.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    raw = styleLint(raw, shouldHumanize(c.type as any));
    const latency = (Date.now() - t1) / 1000;
    results.push({
      answerType: c.type,
      label: c.label,
      content: raw,
      generatedAt: new Date().toISOString(),
      latencySeconds: Number(latency.toFixed(1)),
      chars: raw.length,
    });
    console.log(`✓ ${c.type} in ${latency.toFixed(1)}s (${raw.length} chars)`);
  }

  // ── Save fixture ──────────────────────────────────────────────────
  const fixturePath = resolve(process.cwd(), "tests/fixtures/landing-kit-samples.json");
  mkdirSync(dirname(fixturePath), { recursive: true });

  const fixture = {
    meta: {
      source: "Motive→Samsara (synthetic fixture)",
      generatedAt: new Date().toISOString(),
      spine: {
        core_thesis: spine.core_thesis,
        company_hook: spine.company_hook,
        positioning_frame: spine.positioning_frame,
      },
      note: "This is real Sonnet output generated via the full engine→interview→spine→generate pipeline. The Motive AE candidate is a synthetic test fixture (not a real user). Excerpts may be hand-picked into the landing page; the full JSON is provenance + regeneration source.",
    },
    cards: results,
  };
  writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
  console.log(`\n✓ Fixture saved → ${fixturePath}`);
  console.log(`  ${results.length} cards, total ${results.reduce((s, r) => s + r.chars, 0)} chars`);

  await cleanup(db, sessionId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cleanup(db: any, sessionId: string) {
  console.log("\n── Cleanup ──");
  await db.from("prep_sessions").delete().eq("id", sessionId);
  console.log("Test session deleted (cascades).");
}

main().catch((e) => { console.error(e); process.exit(1); });

// ─── Fixtures ──────────────────────────────────────────────────────

function buildMotiveAeResume() {
  return {
    rawText: "(synthetic)",
    personalInfo: { name: "Test Candidate", email: "t@example.com" },
    roles: [
      {
        company: "Motive", title: "Mid-Market Account Executive",
        startDate: "2022-03", endDate: "present", durationMonths: 38,
        bullets: [
          { originalText: "Closed $1.2M in new ARR across mid-market trucking and construction accounts in territory.", category: "metric" as const, salesRelevanceScore: 9, quantified: true, extractedMetrics: ["$1.2M ARR"] },
          { originalText: "Ran full-cycle 90-day sales motion: outbound prospecting, discovery, demo, technical scoping with safety/ops stakeholders, procurement, close.", category: "responsibility" as const, salesRelevanceScore: 8, quantified: false, extractedMetrics: [] },
          { originalText: "Partnered with safety managers and fleet directors at 25–200 unit fleets to deploy AI dashcam + ELD telematics.", category: "responsibility" as const, salesRelevanceScore: 8, quantified: false, extractedMetrics: [] },
        ],
      },
      {
        company: "ADP", title: "SDR",
        startDate: "2020-08", endDate: "2022-02", durationMonths: 18,
        bullets: [
          { originalText: "Booked 12+ qualified meetings per month with HR and payroll decision makers at 50–500 employee businesses.", category: "metric" as const, salesRelevanceScore: 8, quantified: true, extractedMetrics: ["12+ meetings/mo"] },
        ],
      },
    ],
    skills: [
      { name: "Outbound prospecting", category: "soft_skill" as const, salesRelevance: 9 },
      { name: "Discovery", category: "methodology" as const, salesRelevance: 9 },
      { name: "Salesforce", category: "tool" as const, salesRelevance: 7 },
      { name: "MEDDIC", category: "methodology" as const, salesRelevance: 8 },
    ],
    education: [{ institution: "State University", degree: "BS Business" }],
    backgroundType: "experienced_sales" as const,
    narrativeSummary: "Mid-market AE with 3+ years selling fleet telematics and AI dashcam to trucking and construction at Motive. Prior SDR experience at ADP.",
  };
}

function buildSamsaraCompanyProfile() {
  return {
    name: "Samsara",
    productDescription: "Connected Operations Cloud for physical operations: vehicle telematics, AI dashcams, equipment monitoring, site visibility, and worker safety, delivered on Samsara-manufactured hardware and one unified analytics platform.",
    icp: {
      companySizes: ["Mid-Market", "Enterprise"],
      industries: ["Transportation", "Construction", "Field Services", "Logistics", "Utilities"],
      buyerPersonas: ["VP Operations", "Safety Director", "Fleet Director", "CFO"],
    },
    salesMotion: "outbound" as const,
    competitors: ["Motive", "Geotab", "Verizon Connect", "Lytx", "Trimble Transportation"],
    techStack: ["Salesforce", "Outreach"],
    stage: "public" as const,
    recentNews: ["FY2025 Safety Report: 73% crash rate reduction over 30 months across 2,600+ fleets"],
    cultureSignals: ["Command of the Message methodology", "Construction is #1 growth vertical"],
  };
}
