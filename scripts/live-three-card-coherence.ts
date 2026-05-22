/**
 * Live three-card coherence runner.
 *
 * Generates tell_me_about_yourself + why_this_company + behavioral_star
 * for a real Motive→Samsara session (with spine built from the same
 * mixed-quality fixtures as the checkpoint). All three Sonnet calls run
 * with the SAME spine, then prints the three answers side by side so a
 * human can judge:
 *   1) Is there one thesis, or three?
 *   2) Does TMAY set up what why_this_company pays off?
 *   3) Does behavioral_star integrate a proof point the other two reference?
 *   4) Repetition trap — do all three cards monotone the same proof point?
 *
 * The smoke test proves the spine sentinels appear in the prompts; this
 * proves what Sonnet does with them. Both are necessary.
 *
 * Usage: npx tsx scripts/live-three-card-coherence.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { Module } from "module";

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

const envPath = resolve(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
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

// Same fixtures as scripts/checkpoint-spine.ts so the spine is identical.
const SUBSTANTIVE_ANSWER_1 = `Last September I worked a 120-truck construction fleet in Texas — Hill & Sons, a regional. They were on Motive ELD and evaluating both of us for the dashcam + telematics expansion. About four weeks in, the safety director told me on a call point-blank that they were leaning Samsara because they didn't want to manage two vendor relationships and Samsara's site-visibility module covered their equipment yard, which we didn't have parity on yet.

I pulled in our SE to walk through how our open API let them integrate equipment telemetry from their existing yard system, and I lined up a 30-minute reference call with a similar-sized concrete carrier who'd kept us when Samsara pitched them. The reference call landed — the safety director called me afterward and said "you took my objection seriously." We closed the expansion at $42k ARR, signed mid-October.`;

const SUBSTANTIVE_ANSWER_2 = `A buyer at a 60-truck logistics company in Phoenix explicitly brought up the IDC safety report Samsara cites — the 73% crash reduction number — as the reason their COO wanted Samsara. I said, "that's a real number, and the methodology is fleets that fully deployed the AI dashcam program. What it doesn't tell you is the deployment friction — getting drivers to accept the cameras." I then walked them through how we structured our deployment to get driver buy-in in the first 90 days and how that affected adoption rates. They told me on the next call that no other rep had reframed the proof point that way. We closed at $18k ARR, six weeks later.`;

const THIN_SLOGAN_ANSWER = `We lost some deals to Samsara because they had better brand recognition with VP-level buyers and they're public so they had more credibility.`;

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const { buildNarrativeSpine } = await import("@/lib/spine/build");
  const { loadNarrativeSpine } = await import("@/lib/spine/load");
  const { buildPromptForAnswerType } = await import("@/lib/ai/prompts");
  const { anthropic, SONNET } = await import("@/lib/ai");
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
    console.error("No cached competitive_dynamics — run the engine runner first.");
    process.exit(1);
  }
  const interrogationLines = dyn.interrogation_lines as { question: string; star_slot_hint: string }[];
  console.log(`✓ Cached competitive_dynamics located (${interrogationLines.length} interrogation_lines)`);

  // ── Stage prep_sessions + brief + captured_insights ───────────────
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
    classification_reasoning: "Test fixture",
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

  // ── Generate the three cards ──────────────────────────────────────
  const seniority = detectRoleSeniority(fullSession.targetRole, fullSession.jobDescription);
  const jobListingSignals = parseJobListing(fullSession.jobDescription);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx: any = {
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

  const cardTypes = ["tell_me_about_yourself", "why_this_company", "behavioral_star"] as const;
  const results: { type: string; content: string; latency: number }[] = [];

  for (const type of cardTypes) {
    console.log(`\n── Generating ${type} ──`);
    const t1 = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { system, user, maxTokens } = buildPromptForAnswerType(type as any, ctx);
    const response = await anthropic.messages.create({
      model: SONNET,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = response.content[0];
    if (block.type !== "text") throw new Error(`Unexpected response type for ${type}`);
    let raw = block.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    raw = styleLint(raw, shouldHumanize(type as any));
    const latency = ((Date.now() - t1) / 1000);
    results.push({ type, content: raw, latency });
    console.log(`✓ ${type} in ${latency.toFixed(1)}s (${raw.length} chars)`);
  }

  // ── Print three cards side by side ────────────────────────────────
  console.log("\n\n");
  console.log("═════════════════════════════════════════════════════════════════════════");
  console.log("THE SPINE (for reference — read the three cards against this)");
  console.log("═════════════════════════════════════════════════════════════════════════");
  console.log(`core_thesis: ${spine.core_thesis}`);
  console.log(`\ncompany_hook: ${spine.company_hook}`);
  console.log(`\nproof points:`);
  for (let i = 0; i < spine.signature_proof_points.length; i++) {
    const p = spine.signature_proof_points[i];
    console.log(`  [${i}] (${p.star_complete ? "complete" : "incomplete"}) ${p.label}`);
  }

  for (const r of results) {
    console.log("\n\n═════════════════════════════════════════════════════════════════════════");
    console.log(`${r.type.toUpperCase()}`);
    console.log("═════════════════════════════════════════════════════════════════════════");
    console.log(r.content);
  }

  console.log("\n\n═════════════════════════════════════════════════════════════════════════");
  console.log("READ AGAINST THESE FOUR CHECKS");
  console.log("═════════════════════════════════════════════════════════════════════════");
  console.log("1. Is there ONE thesis, or three? State the candidate's core narrative in");
  console.log("   one sentence — is it visible in all three answers?");
  console.log("2. Does TMAY set up what why_this_company pays off? (TMAY plants competitive");
  console.log("   observation → why-this-company harvests it.)");
  console.log("3. Does behavioral_star use a proof point the other two reference?");
  console.log("   (A shared deal/moment that threads through, not three disconnected stories.)");
  console.log("4. REPETITION TRAP: do all three cards lean on the same proof point in the");
  console.log("   same words? If they all open with Hill & Sons in near-identical phrasing,");
  console.log("   the spine over-corrected — consistency by monotony is a defect.");

  await cleanup(db, sessionId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cleanup(db: any, sessionId: string) {
  console.log("\n── Cleanup ──");
  await db.from("prep_sessions").delete().eq("id", sessionId);
  console.log("Test session deleted (cascades).");
}

main().catch((e) => { console.error(e); process.exit(1); });

// ─── Fixtures (mirror checkpoint-spine.ts) ──────────────────────────────

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
