/**
 * Narrative Spine checkpoint runner.
 *
 * Builds a real spine for a Motive→Samsara session using the cached
 * competitive_dynamics row from earlier engine runs, plus three
 * deliberately-mixed captured insights:
 *   1) a SUBSTANTIVE STAR-shaped answer about a specific deal
 *   2) a SUBSTANTIVE answer about a different deal/angle
 *   3) a THIN slogan answer — should produce a flagged proof point
 *      with star_complete: false
 *
 * That mix exercises every checkpoint criterion: core_thesis quality,
 * STAR-gate honesty (mixed true/false flags), no-fabrication, candid
 * narrative_risks, and competitive_truths traceable to captured answers.
 *
 * Usage:
 *   npx tsx scripts/checkpoint-spine.ts
 *
 * Cleans up the test prep_sessions row at the end (cascade-deletes the
 * captured_insights, narrative_spines, positioning_briefs rows; the
 * shared competitive_dynamics + company_profiles cache rows are kept).
 */

import { readFileSync } from "fs";
import { resolve } from "path";
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

const envPath = resolve(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1).replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  console.error("Could not read .env.local");
  process.exit(1);
}
for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "ANTHROPIC_API_KEY"]) {
  if (!process.env[k]) {
    console.error(`Missing ${k} in .env.local`);
    process.exit(1);
  }
}

// ─── Test data — the three captured-insight fixtures ────────────────
const SUBSTANTIVE_ANSWER_1 = `Last September I worked a 120-truck construction fleet in Texas — Hill & Sons, a regional. They were on Motive ELD and evaluating both of us for the dashcam + telematics expansion. About four weeks in, the safety director told me on a call point-blank that they were leaning Samsara because they didn't want to manage two vendor relationships and Samsara's site-visibility module covered their equipment yard, which we didn't have parity on yet.

I pulled in our SE to walk through how our open API let them integrate equipment telemetry from their existing yard system, and I lined up a 30-minute reference call with a similar-sized concrete carrier who'd kept us when Samsara pitched them. The reference call landed — the safety director called me afterward and said "you took my objection seriously." We closed the expansion at $42k ARR, signed mid-October.`;

const SUBSTANTIVE_ANSWER_2 = `A buyer at a 60-truck logistics company in Phoenix explicitly brought up the IDC safety report Samsara cites — the 73% crash reduction number — as the reason their COO wanted Samsara. I said, "that's a real number, and the methodology is fleets that fully deployed the AI dashcam program. What it doesn't tell you is the deployment friction — getting drivers to accept the cameras." I then walked them through how we structured our deployment to get driver buy-in in the first 90 days and how that affected adoption rates. They told me on the next call that no other rep had reframed the proof point that way. We closed at $18k ARR, six weeks later.`;

const THIN_SLOGAN_ANSWER = `We lost some deals to Samsara because they had better brand recognition with VP-level buyers and they're public so they had more credibility.`;

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const { buildNarrativeSpine } = await import("@/lib/spine/build");

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { db: { schema: "public" }, auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── 1. Locate the cached Motive→Samsara competitive_dynamics row ──
  const { data: anchor } = await db.from("company_profiles").select("id").eq("company_name", "Motive").maybeSingle();
  const { data: target } = await db.from("company_profiles").select("id").eq("company_name", "Samsara").maybeSingle();
  if (!anchor || !target) {
    console.error("No Motive/Samsara in company_profiles. Run scripts/run-positioning-motive-samsara.ts first.");
    process.exit(1);
  }
  const { data: dyn } = await db
    .from("competitive_dynamics")
    .select("id, interrogation_lines")
    .eq("anchor_company_id", anchor.id)
    .eq("target_company_id", target.id)
    .maybeSingle();
  if (!dyn) {
    console.error("No competitive_dynamics for Motive→Samsara. Run scripts/run-positioning-motive-samsara.ts first.");
    process.exit(1);
  }
  const interrogationLines = dyn.interrogation_lines as { question: string; star_slot_hint: string }[];
  console.log(`✓ Found cached competitive_dynamics (${interrogationLines.length} interrogation_lines)`);

  // ── 2. Stage a real prep_sessions row + positioning_brief ─────────
  // The brief must FK to a real prep_sessions row + the cached dynamic
  // so buildNarrativeSpine can resolve via loadPositioningBriefWithDynamic.
  const { data: anyUser } = await db.from("users").select("id").limit(1).maybeSingle();
  const userId = (anyUser?.id as string | undefined) ?? null;
  const sessionId = crypto.randomUUID();

  // ResumeMotive fixture — copied from run-positioning-motive-samsara.ts
  const motiveAeResume = buildMotiveAeResume();
  const samsaraCompany = buildSamsaraCompanyProfile();

  console.log(`\n── Staging prep_sessions ${sessionId} ──`);
  const { error: insErr } = await db.from("prep_sessions").insert({
    id: sessionId,
    user_id: userId,
    job_description: "Account Executive at Samsara — selling integrated fleet operations platform to mid-market and enterprise fleets.",
    target_role: "Account Executive",
    role_type: "account_executive",
    stage: "hiring_manager",
    insight_interview_status: "completed",
    // session_data is what buildNarrativeSpine reads for resume + company name.
    session_data: {
      id: sessionId,
      resume: motiveAeResume,
      company: samsaraCompany,
      targetRole: "Account Executive",
      roleType: "account_executive",
      stage: "hiring_manager",
      jobDescription: "Account Executive at Samsara — selling integrated fleet operations platform.",
    },
  });
  if (insErr) {
    console.error("prep_sessions insert failed:", insErr.message);
    process.exit(1);
  }

  // Insert a positioning_brief that points at the cached dynamic.
  const { error: briefErr } = await db.from("positioning_briefs").insert({
    session_id: sessionId,
    positioning_type: "direct_competitor",
    anchor_employer: "Motive",
    anchor_employer_role: "Mid-Market Account Executive",
    classification_reasoning: "Test fixture — staged for spine checkpoint.",
    classification_confidence: 0.95,
    classification_signal: "company_profile_competitors",
    competitive_dynamic_id: dyn.id,
    transferable_bridges: [],
    domain_gap_to_close: null,
    company_hook: "Three years closing mid-market fleet deals at Motive; want to sell from the side of the platform integration story I've watched win.",
  });
  if (briefErr) {
    console.error("positioning_briefs insert failed:", briefErr.message);
    await db.from("prep_sessions").delete().eq("id", sessionId);
    process.exit(1);
  }

  // ── 3. Populate captured_insights — mix of substantive + thin ─────
  // Use the first three interrogation_lines from the cached dynamic.
  const fixtures = [
    { answer: SUBSTANTIVE_ANSWER_1, quality: "substantive" as const, label: "SUBSTANTIVE #1" },
    { answer: SUBSTANTIVE_ANSWER_2, quality: "substantive" as const, label: "SUBSTANTIVE #2" },
    { answer: THIN_SLOGAN_ANSWER, quality: "thin" as const, label: "THIN SLOGAN" },
  ];

  console.log(`── Populating ${fixtures.length} captured_insights ──`);
  for (let i = 0; i < fixtures.length && i < interrogationLines.length; i++) {
    const line = interrogationLines[i];
    const f = fixtures[i];
    const { error: ciErr } = await db.from("captured_insights").insert({
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
      follow_up_question: f.quality === "thin"
        ? "Walk me through one specific deal — what did the buyer actually say, and what did you do in response?"
        : null,
      follow_up_dismissed: f.quality === "thin",
    });
    if (ciErr) {
      console.error(`captured_insights insert ${i} failed:`, ciErr.message);
    }
    console.log(`  [${i}] ${f.label} → "${line.question.slice(0, 80)}…"`);
  }

  // ── 4. Build the spine ────────────────────────────────────────────
  console.log("\n── Running buildNarrativeSpine ──");
  const t0 = Date.now();
  let spine;
  try {
    spine = await buildNarrativeSpine(sessionId);
  } catch (err) {
    console.error("buildNarrativeSpine threw:", err);
    await cleanup(db, sessionId);
    process.exit(1);
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`✓ Spine built in ${elapsed}s`);

  // ── 5. Print the spine for human review ──────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("NARRATIVE SPINE");
  console.log("═══════════════════════════════════════════════════════════════════\n");
  console.log(JSON.stringify(spine, null, 2));

  // ── 6. Automated invariant checks ────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("CHECKPOINT CRITERIA");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const checks: { name: string; pass: boolean; note: string }[] = [];

  checks.push({
    name: "core_thesis present + non-trivial",
    pass: !!spine.core_thesis && spine.core_thesis.length > 60,
    note: `${spine.core_thesis.length} chars: "${spine.core_thesis.slice(0, 100)}…"`,
  });

  const proofs = spine.signature_proof_points ?? [];
  checks.push({
    name: "signature_proof_points has at least one star_complete:true",
    pass: proofs.some((p) => p.star_complete === true),
    note: `${proofs.filter((p) => p.star_complete).length}/${proofs.length} complete`,
  });
  checks.push({
    name: "STAR gate bites: at least one star_complete:false with gaps (the thin-slogan fixture must flag)",
    pass: proofs.some((p) => p.star_complete === false && p.gaps && p.gaps.length > 0),
    note: proofs.some((p) => p.star_complete === false)
      ? `flagged: ${proofs.filter((p) => !p.star_complete).map((p) => `[${p.label}: ${p.gaps.join("; ")}]`).join(", ")}`
      : "NONE flagged — yellow flag, the gate may not be biting on the slogan",
  });

  const risks = spine.narrative_risks ?? [];
  checks.push({
    name: "narrative_risks non-empty (almost every real session has something thin)",
    pass: risks.length > 0,
    note: `${risks.length} risks: ${risks.map((r) => `"${r.slice(0, 60)}…"`).join(", ")}`,
  });

  const truths = spine.competitive_truths ?? [];
  checks.push({
    name: "competitive_truths populated (we gave 2 substantive captured answers)",
    pass: truths.length >= 1,
    note: `${truths.length} truths`,
  });
  checks.push({
    name: "no fabricated specifics in proof points (situation text mentions only what the candidate stated)",
    // Loose heuristic: if a proof point's situation/action references a number or company
    // that isn't in the fixtures, that's a fabrication candidate. We just print for human inspection.
    pass: true,
    note: "→ human-inspect the spine above; the test fixtures named: Hill & Sons (120-truck), 60-truck Phoenix logistics, $42k ARR, $18k ARR, IDC 73% report",
  });

  for (const c of checks) {
    console.log(`${c.pass ? "✓" : "✗"} ${c.name}`);
    console.log(`   ${c.note}\n`);
  }

  const passed = checks.filter((c) => c.pass).length;
  console.log(`Summary: ${passed}/${checks.length} automated checks passed.`);
  if (passed < checks.length) {
    console.log("Human review needed on the failing checks above before wiring the spine into answer builders.");
  } else {
    console.log("Automated criteria pass. Now read the spine JSON above against the human-judgment criteria from the spec checkpoint:");
    console.log("  - core_thesis sounds like a real candidate's actual story, not generic filler");
    console.log("  - narrative_risks is candid");
    console.log("  - competitive_truths are in something close to the candidate's own phrasing");
  }

  // ── 7. Cleanup ────────────────────────────────────────────────────
  await cleanup(db, sessionId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cleanup(db: any, sessionId: string) {
  console.log("\n── Cleanup ──");
  // captured_insights, positioning_briefs, narrative_spines all cascade
  // from prep_sessions ON DELETE. competitive_dynamics + company_profiles
  // are global caches and are kept.
  await db.from("prep_sessions").delete().eq("id", sessionId);
  console.log("Test prep_sessions deleted (cascades).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// ─── Fixtures (copied from scripts/run-positioning-motive-samsara.ts) ──

function buildMotiveAeResume() {
  return {
    rawText: "(synthetic test resume — Motive AE)",
    personalInfo: { name: "Test Candidate", email: "test@example.com" },
    roles: [
      {
        company: "Motive",
        title: "Mid-Market Account Executive",
        startDate: "2022-03",
        endDate: "present",
        durationMonths: 38,
        bullets: [
          { originalText: "Closed $1.2M in new ARR across mid-market trucking and construction accounts in territory.", category: "metric" as const, salesRelevanceScore: 9, quantified: true, extractedMetrics: ["$1.2M ARR"] },
          { originalText: "Ran full-cycle 90-day sales motion: outbound prospecting, discovery, demo, technical scoping with safety/ops stakeholders, procurement, close.", category: "responsibility" as const, salesRelevanceScore: 8, quantified: false, extractedMetrics: [] },
          { originalText: "Partnered with safety managers and fleet directors at 25–200 unit fleets to deploy AI dashcam + ELD telematics.", category: "responsibility" as const, salesRelevanceScore: 8, quantified: false, extractedMetrics: [] },
        ],
      },
      {
        company: "ADP",
        title: "SDR",
        startDate: "2020-08",
        endDate: "2022-02",
        durationMonths: 18,
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
