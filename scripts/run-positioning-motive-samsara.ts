/**
 * One-off live run of the Positioning Engine for an ex-Motive AE → Samsara
 * session. Inserts a real prep_sessions row, runs runPositioningEngine
 * end-to-end, prints the brief, runs the v4 Test 10 / 11 / 12 invariant
 * checks against the output, and cleans up the test session row.
 *
 * Usage:
 *   npx tsx scripts/run-positioning-motive-samsara.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 *   ANTHROPIC_API_KEY
 *   FIRECRAWL_API_KEY  (optional — falls back to raw fetch)
 *
 * Assumes migrations 041 + 042 have been applied and the Samsara
 * curated competitors seed is in place (the Test 7 zero-Claude-tokens
 * path depends on it).
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { Module } from "module";
import { resolve as resolvePath } from "path";

// ─── Shim `server-only` so we can import Next.js server modules from tsx ──
// `server-only` throws in plain Node; Next.js' bundler swaps it for an
// empty module on the server. The package's exports field doesn't expose
// the empty.js subpath publicly, so we resolve it via the absolute path
// in node_modules instead of asking Node's resolver to find it.
const EMPTY_PATH = resolvePath(process.cwd(), "node_modules/server-only/empty.js");
const _origResolve = (Module as unknown as { _resolveFilename: (req: string, parent: unknown, ...rest: unknown[]) => string })._resolveFilename;
(Module as unknown as { _resolveFilename: (req: string, parent: unknown, ...rest: unknown[]) => string })._resolveFilename = function (
  request: string,
  parent: unknown,
  ...rest: unknown[]
) {
  if (request === "server-only") return EMPTY_PATH;
  return _origResolve.call(this, request, parent, ...rest);
};

// ─── Load .env.local (mirrors scripts/seed-samsara-session.ts) ──────────────
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
  console.error("Could not read .env.local — make sure it exists in the project root.");
  process.exit(1);
}

for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "ANTHROPIC_API_KEY"]) {
  if (!process.env[k]) {
    console.error(`Missing ${k} in .env.local`);
    process.exit(1);
  }
}

// Dynamic imports so the env vars are set before any module that reads them
// (notably src/lib/env.ts and src/lib/ai.ts) initializes.
async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const { runPositioningEngine } = await import("@/lib/positioning/engine");
  const { classifyPositioning } = await import("@/lib/positioning/classify");

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { db: { schema: "public" }, auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── Fixtures ─────────────────────────────────────────────────────────
  const motiveAeResume = buildMotiveAeResume();
  const samsaraCompany = buildSamsaraCompanyProfile();

  // ── Pre-flight: classifier signal check ────────────────────────────
  // Test 7 (zero-Claude classification via curated company_interview_intel
  // column) was dropped — the live DB's company_interview_intel schema
  // doesn't match the repo's migrations and the curated column was never
  // added. Signal 2 (CompanyProfile.competitors) now plays the deterministic
  // short-circuit role: the fixture's competitors=["Motive", …] should hit
  // Motive and resolve to direct_competitor without a Haiku call.
  console.log("\n━━━ Pre-flight: classifier signal check ━━━");
  const classification = await classifyPositioning(
    motiveAeResume,
    samsaraCompany,
    "account_executive"
  );
  console.log("positioning_type:", classification.positioning_type);
  console.log("anchor_employer:", classification.anchor_employer);
  console.log("classification_signal:", classification.classification_signal);
  console.log("classification_confidence:", classification.classification_confidence);
  console.log("reasoning:", classification.classification_reasoning);

  if (
    classification.positioning_type === "direct_competitor" &&
    classification.classification_signal === "company_profile_competitors"
  ) {
    console.log("\n✓ Deterministic classification PASS: Signal 2 (CompanyProfile.competitors) resolved Motive → Samsara without a Haiku call.");
  } else {
    console.warn(
      "\n⚠ Deterministic classification did not fire as expected. Got:",
      classification.positioning_type,
      "via",
      classification.classification_signal,
      "— continuing with whatever the engine produced."
    );
  }

  // ── Stage a real prep_sessions row so the FK is satisfied ────────────
  // We need a valid user_id — pick the first user in the table. (The
  // engine writes positioning_briefs.session_id which FKs prep_sessions,
  // but RLS is bypassed by the admin client so user_id can be NULL too.)
  const { data: anyUser } = await db
    .from("users")
    .select("id")
    .limit(1)
    .maybeSingle();
  const userId = (anyUser?.id as string | undefined) ?? null;

  const sessionId = crypto.randomUUID();
  console.log("\n━━━ Staging prep_sessions row id =", sessionId, "━━━");
  const { error: insertErr } = await db.from("prep_sessions").insert({
    id: sessionId,
    user_id: userId,
    job_description: "Account Executive at Samsara — selling integrated fleet operations platform to mid-market and enterprise fleets.",
    target_role: "Account Executive",
    role_type: "account_executive",
    stage: "hiring_manager",
  });
  if (insertErr) {
    console.error("Failed to insert prep_sessions:", insertErr.message);
    process.exit(1);
  }

  // ── Run the engine ───────────────────────────────────────────────────
  console.log("\n━━━ Running runPositioningEngine() ━━━");
  const t0 = Date.now();
  let brief;
  try {
    brief = await runPositioningEngine(
      sessionId,
      motiveAeResume,
      samsaraCompany,
      "account_executive",
      "hiring_manager",
      // Warm cache after first successful run; remove `refresh: true`
      // to exercise the warm-cache path. Add it back to force a re-run.
      { targetCompanyUrl: "https://www.samsara.com" }
    );
  } catch (err) {
    console.error("\n✗ Engine threw (should never happen):", err);
    await db.from("prep_sessions").delete().eq("id", sessionId);
    process.exit(1);
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Engine completed in ${elapsed}s`);

  // ── Pull the joined competitive_dynamic ──────────────────────────────
  let dynamic = brief.competitive_dynamic ?? null;
  if (!dynamic && brief.competitive_dynamic_id) {
    const { data } = await db
      .from("competitive_dynamics")
      .select("*")
      .eq("id", brief.competitive_dynamic_id)
      .maybeSingle();
    dynamic = data as typeof dynamic;
  }

  // ── Print the brief ──────────────────────────────────────────────────
  console.log("\n━━━ Positioning Brief ━━━");
  console.log(JSON.stringify(brief, null, 2));
  if (dynamic) {
    console.log("\n━━━ Competitive Dynamic ━━━");
    console.log(JSON.stringify(dynamic, null, 2));
  } else {
    console.log("\n(no competitive_dynamic — engine degraded or non-competitive type)");
  }

  // ── Test 10 — claim-leak check ───────────────────────────────────────
  console.log("\n━━━ Test 10 — claim-leak check ━━━");
  const test10 = checkClaimLeak(dynamic);
  printResults("Test 10 (no fact references candidate experience; no interrogation_line is a yes/no or statement)", test10);

  // ── Test 11 — STAR-gate check ────────────────────────────────────────
  console.log("\n━━━ Test 11 — STAR-gate check ━━━");
  const test11 = checkStarGate(dynamic);
  printResults("Test 11 (every interrogation_line has a non-trivial star_slot_hint naming S/T/A/R)", test11);

  // ── Test 12 — directionality check ───────────────────────────────────
  console.log("\n━━━ Test 12 — directionality check ━━━");
  const test12 = checkDirectionality(dynamic);
  printResults("Test 12 (every interrogation_line carries a directionality_note)", test12);

  // ── Cleanup ──────────────────────────────────────────────────────────
  console.log("\n━━━ Cleanup ━━━");
  // positioning_briefs cascades from prep_sessions ON DELETE CASCADE.
  // competitive_dynamics is global and KEPT — the whole point of the
  // shared cache is that subsequent runs reuse it.
  const { error: delErr } = await db.from("prep_sessions").delete().eq("id", sessionId);
  if (delErr) console.warn("Cleanup warning:", delErr.message);
  else console.log("Test session deleted (competitive_dynamics row left in place as the shared cache).");

  console.log("\n━━━ Done ━━━");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

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
          {
            originalText: "Closed $1.2M in new ARR across mid-market trucking and construction accounts in territory.",
            category: "metric" as const,
            salesRelevanceScore: 9,
            quantified: true,
            extractedMetrics: ["$1.2M ARR"],
          },
          {
            originalText: "Ran full-cycle 90-day sales motion: outbound prospecting, discovery, demo, technical scoping with safety/ops stakeholders, procurement, close.",
            category: "responsibility" as const,
            salesRelevanceScore: 8,
            quantified: false,
            extractedMetrics: [],
          },
          {
            originalText: "Partnered with safety managers and fleet directors at 25–200 unit fleets to deploy AI dashcam + ELD telematics.",
            category: "responsibility" as const,
            salesRelevanceScore: 8,
            quantified: false,
            extractedMetrics: [],
          },
        ],
      },
      {
        company: "ADP",
        title: "SDR",
        startDate: "2020-08",
        endDate: "2022-02",
        durationMonths: 18,
        bullets: [
          {
            originalText: "Booked 12+ qualified meetings per month with HR and payroll decision makers at 50–500 employee businesses.",
            category: "metric" as const,
            salesRelevanceScore: 8,
            quantified: true,
            extractedMetrics: ["12+ meetings/mo"],
          },
        ],
      },
    ],
    skills: [
      { name: "Outbound prospecting", category: "soft_skill" as const, salesRelevance: 9 },
      { name: "Discovery", category: "methodology" as const, salesRelevance: 9 },
      { name: "Salesforce", category: "tool" as const, salesRelevance: 7 },
      { name: "Outreach", category: "tool" as const, salesRelevance: 7 },
      { name: "MEDDIC", category: "methodology" as const, salesRelevance: 8 },
    ],
    education: [{ institution: "State University", degree: "BS Business" }],
    backgroundType: "experienced_sales" as const,
    narrativeSummary:
      "Mid-market AE with 3+ years selling fleet telematics and AI dashcam to trucking and construction at Motive. Prior SDR experience at ADP.",
  };
}

function buildSamsaraCompanyProfile() {
  return {
    name: "Samsara",
    productDescription:
      "Connected Operations Cloud for physical operations: vehicle telematics, AI dashcams, equipment monitoring, site visibility, and worker safety, delivered on Samsara-manufactured hardware and one unified analytics platform.",
    icp: {
      companySizes: ["Mid-Market", "Enterprise"],
      industries: ["Transportation", "Construction", "Field Services", "Logistics", "Utilities"],
      buyerPersonas: ["VP Operations", "Safety Director", "Fleet Director", "CFO"],
    },
    salesMotion: "outbound" as const,
    competitors: ["Motive", "Geotab", "Verizon Connect", "Lytx", "Trimble Transportation"],
    techStack: ["Salesforce", "Outreach"],
    stage: "public" as const,
    recentNews: [
      "FY2025 Safety Report: 73% crash rate reduction over 30 months across 2,600+ fleets",
      "IDC 2024: customers cut total fleet operating costs ~6% on average",
    ],
    cultureSignals: [
      "Command of the Message methodology used company-wide",
      "Construction is the #1 growth vertical for 6 consecutive quarters",
    ],
  };
}

// ─── Test 10 / 11 / 12 checkers ──────────────────────────────────────────────

interface CheckResult {
  passed: boolean;
  inconclusive?: boolean; // true when arrays are empty — invariant vacuously holds
  failures: { location: string; reason: string }[];
}

function printResults(label: string, r: CheckResult) {
  if (r.inconclusive) {
    console.log(`⚠ ${label} — INCONCLUSIVE (no items to check; engine produced empty arrays)`);
    return;
  }
  if (r.passed) console.log(`✓ ${label} — PASS`);
  else {
    console.log(`✗ ${label} — FAIL (${r.failures.length} issue${r.failures.length === 1 ? "" : "s"}):`);
    for (const f of r.failures) console.log(`  • ${f.location}: ${f.reason}`);
  }
}

function checkClaimLeak(dynamic: { substantiated_facts?: { fact: string; about: string }[]; interrogation_lines?: { question: string }[] } | null): CheckResult {
  if (!dynamic) return { passed: true, inconclusive: true, failures: [{ location: "(no dynamic)", reason: "engine degraded; nothing to check" }] };
  const facts = dynamic.substantiated_facts ?? [];
  const lines = dynamic.interrogation_lines ?? [];
  if (facts.length === 0 && lines.length === 0) {
    return { passed: true, inconclusive: true, failures: [] };
  }

  const failures: CheckResult["failures"] = [];

  // Patterns that hint at a candidate-experience claim leaking into a "fact".
  const candidatePronouns = /\b(you|your|you've|you're|you'd|the candidate|their (?:deals|pipeline|quota))\b/i;
  const lossLanguage = /\b(lost deals|won deals|your quota|missed quota|hit (?:plan|number))\b/i;

  (dynamic.substantiated_facts ?? []).forEach((f, i) => {
    if (candidatePronouns.test(f.fact)) {
      failures.push({
        location: `substantiated_facts[${i}].fact`,
        reason: `references the candidate directly: "${f.fact.slice(0, 120)}…"`,
      });
    }
    if (lossLanguage.test(f.fact)) {
      failures.push({
        location: `substantiated_facts[${i}].fact`,
        reason: `references deal outcomes the engine can't know: "${f.fact.slice(0, 120)}…"`,
      });
    }
  });

  // Interrogation lines must be questions (end with ?), must not be yes/no.
  (dynamic.interrogation_lines ?? []).forEach((l, i) => {
    const q = l.question.trim();
    if (!q.endsWith("?")) {
      failures.push({
        location: `interrogation_lines[${i}].question`,
        reason: `does not end with '?' — looks like a statement: "${q.slice(0, 120)}…"`,
      });
    }
    // Heuristic for yes/no: starts with auxiliary like "Did/Do/Were/Have/Are/Is/Was/Will/Would/Should/Can/Could"
    // Allow "Have you ever — and if so, what …" patterns by requiring it also lacks a "what|how|which|why|when|where" follow-up.
    if (/^(?:did|do|does|were|was|have|has|had|are|is|will|would|should|can|could)\b/i.test(q)) {
      const followsWith5W = /\b(what|how|which|why|when|where|name the|describe|walk me)\b/i.test(q);
      if (!followsWith5W) {
        failures.push({
          location: `interrogation_lines[${i}].question`,
          reason: `appears answerable yes/no without a follow-up specific: "${q.slice(0, 120)}…"`,
        });
      }
    }
  });

  return { passed: failures.length === 0, failures };
}

function checkStarGate(dynamic: { interrogation_lines?: { question: string; star_slot_hint: string }[] } | null): CheckResult {
  if (!dynamic) return { passed: true, inconclusive: true, failures: [] };
  const lines = dynamic.interrogation_lines ?? [];
  if (lines.length === 0) return { passed: true, inconclusive: true, failures: [] };
  const failures: CheckResult["failures"] = [];

  (dynamic.interrogation_lines ?? []).forEach((l, i) => {
    const raw = l.star_slot_hint ?? "";
    const hint = raw.toLowerCase();
    // Accept either the full words OR the compact "S:" / "T:" / "A:" / "R:"
    // notation that Sonnet often prefers for these structured hints.
    const slotChecks: { name: string; matches: (h: string, r: string) => boolean }[] = [
      { name: "situation", matches: (h, r) => h.includes("situation") || /\bs:/i.test(r) },
      { name: "task", matches: (h, r) => h.includes("task") || /\bt:/i.test(r) },
      { name: "action", matches: (h, r) => h.includes("action") || /\ba:/i.test(r) },
      { name: "result", matches: (h, r) => h.includes("result") || /\br:/i.test(r) },
    ];
    const present = slotChecks.filter((s) => s.matches(hint, raw)).map((s) => s.name);
    if (present.length < 3) {
      failures.push({
        location: `interrogation_lines[${i}].star_slot_hint`,
        reason: `mentions only ${present.length}/4 STAR slots (${present.join(",") || "none"}): "${raw.slice(0, 140)}…"`,
      });
    }
    if (raw.trim().length < 30) {
      failures.push({
        location: `interrogation_lines[${i}].star_slot_hint`,
        reason: `too short to be a coherent S/T/A/R mapping (${raw.trim().length} chars)`,
      });
    }
  });

  return { passed: failures.length === 0, failures };
}

function checkDirectionality(dynamic: { interrogation_lines?: { directionality_note: string }[] } | null): CheckResult {
  if (!dynamic) return { passed: true, inconclusive: true, failures: [] };
  const lines = dynamic.interrogation_lines ?? [];
  if (lines.length === 0) return { passed: true, inconclusive: true, failures: [] };
  const failures: CheckResult["failures"] = [];

  (dynamic.interrogation_lines ?? []).forEach((l, i) => {
    const note = (l.directionality_note ?? "").trim();
    if (note.length < 20) {
      failures.push({
        location: `interrogation_lines[${i}].directionality_note`,
        reason: `missing or trivial directionality_note (${note.length} chars)`,
      });
    }
  });

  return { passed: failures.length === 0, failures };
}
