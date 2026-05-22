/**
 * Programmatic test for Gates 2, 3, and 4 of the Insight Interview live
 * test checklist. Hits evaluateInsightAnswer against the real Motive→
 * Samsara interrogation_lines (warm cache row from earlier engine runs)
 * with three deliberately-crafted answers per line:
 *
 *   - SLOGAN: a vague no-Action "we lost on brand" answer — must come
 *     back THIN, with a follow-up that asks rather than leads.
 *   - SUBSTANTIVE: a concrete S/T/A/R answer — must come back
 *     SUBSTANTIVE with no follow-up.
 *   - SHORT: a one-word answer — must come back UNANSWERED without a
 *     Claude call (short-circuit verification).
 *
 * Prints the verbatim follow-up text for every thin result so the
 * "asks vs leads" judgment in Gate 3 can be made without typing each
 * one in the browser.
 *
 * Usage:
 *   npx tsx scripts/test-insight-evaluation.ts
 *
 * Requires .env.local + the Motive→Samsara competitive_dynamics row
 * already in the DB (run scripts/run-positioning-motive-samsara.ts at
 * least once if not).
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { Module } from "module";

// ─── server-only shim + .env.local (same as the engine runner) ──────────
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

// Fixed test inputs. SLOGAN is the exact text from Gate 2.1 of the live
// test checklist — the canonical no-Action sentence the evaluator must
// catch as thin.
const SLOGAN_ANSWER =
  "We lost some deals to Samsara because they had better brand recognition in the market.";

// A deliberately substantive answer that should pass clean. Concrete in
// every STAR slot: a specific deal (S), the buyer's deciding factor (T),
// what the candidate did (A), how it ended (R).
const SUBSTANTIVE_ANSWER = `Last September I was working a 120-truck construction fleet in Texas — Hill & Sons, a regional. They were a Motive customer for ELD but evaluating both of us for the dashcam + telematics expansion. About four weeks into the cycle the safety director told me on a call, point-blank, that they were leaning Samsara because they didn't want to manage two vendor relationships and Samsara's site-visibility module covered their equipment yard, which we didn't have parity on yet.

I'd already lost two adjacent deals on the same vendor-consolidation theme that quarter, so I pulled in our SE to walk through how our open API let them integrate equipment telemetry from their existing yard system, and I lined up a 30-minute reference call with a similar-sized concrete carrier who'd kept us when Samsara pitched them. The reference call landed — the safety director called me afterward and said "you took my objection seriously." We closed the expansion at $42k ARR, signed mid-October.`;

const SHORT_ANSWER = "yes";

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const { evaluateInsightAnswer } = await import("@/lib/insight/evaluate");

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { db: { schema: "public" }, auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── Pull the cached Motive→Samsara competitive_dynamics row ─────────
  const { data: anchorRow } = await db
    .from("company_profiles")
    .select("id")
    .eq("company_name", "Motive")
    .maybeSingle();
  const { data: targetRow } = await db
    .from("company_profiles")
    .select("id")
    .eq("company_name", "Samsara")
    .maybeSingle();

  if (!anchorRow || !targetRow) {
    console.error("Could not find Motive and/or Samsara in company_profiles — run scripts/run-positioning-motive-samsara.ts first.");
    process.exit(1);
  }

  const { data: dyn } = await db
    .from("competitive_dynamics")
    .select("interrogation_lines")
    .eq("anchor_company_id", anchorRow.id)
    .eq("target_company_id", targetRow.id)
    .maybeSingle();

  if (!dyn?.interrogation_lines) {
    console.error("No competitive_dynamics row for Motive→Samsara — run the engine first.");
    process.exit(1);
  }

  const lines = dyn.interrogation_lines as { question: string; star_slot_hint: string }[];
  console.log(`\n━━━ Loaded ${lines.length} interrogation_lines from cache ━━━\n`);

  // ── Gate 4 sanity: SHORT must short-circuit to unanswered ───────────
  console.log("━━━ Pre-check: 'yes' must short-circuit to unanswered (no Claude call) ━━━");
  const shortResult = await evaluateInsightAnswer(SHORT_ANSWER, lines[0]);
  console.log(`  quality: ${shortResult.quality}`);
  console.log(`  follow_up: ${shortResult.follow_up_question ?? "null"}`);
  if (shortResult.quality === "unanswered" && shortResult.follow_up_question === null) {
    console.log("  ✓ PASS — short-circuit works\n");
  } else {
    console.log("  ✗ FAIL — short answer did not short-circuit\n");
  }

  // ── Gates 2, 3, 4 — run all three answers against each line ─────────
  type Outcome = {
    line_index: number;
    question_preview: string;
    slogan_quality: string;
    slogan_follow_up: string | null;
    substantive_quality: string;
    substantive_follow_up: string | null;
  };
  const outcomes: Outcome[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    console.log(`\n━━━ Line ${i + 1}/${lines.length} ━━━`);
    console.log(`Q: ${line.question.slice(0, 110)}…`);

    process.stdout.write("  Evaluating SLOGAN answer… ");
    const slogan = await evaluateInsightAnswer(SLOGAN_ANSWER, line);
    console.log(slogan.quality);

    process.stdout.write("  Evaluating SUBSTANTIVE answer… ");
    const subst = await evaluateInsightAnswer(SUBSTANTIVE_ANSWER, line);
    console.log(subst.quality);

    outcomes.push({
      line_index: i,
      question_preview: line.question.slice(0, 100),
      slogan_quality: slogan.quality,
      slogan_follow_up: slogan.follow_up_question,
      substantive_quality: subst.quality,
      substantive_follow_up: subst.follow_up_question,
    });
  }

  // ── Gate 2 result — slogan must come back thin on every line ────────
  console.log("\n\n═══════════════════════════════════════════════════════════════════");
  console.log("GATE 2 — Slogan-caught invariant");
  console.log("═══════════════════════════════════════════════════════════════════");
  const sloganThin = outcomes.filter((o) => o.slogan_quality === "thin").length;
  const sloganNotThin = outcomes.filter((o) => o.slogan_quality !== "thin");
  console.log(`Slogan → thin on ${sloganThin}/${outcomes.length} lines`);
  if (sloganThin === outcomes.length) {
    console.log("✓ PASS — every line caught the slogan as thin");
  } else {
    console.log(`✗ FAIL — slogan slipped through as: ${sloganNotThin.map((o) => `[line ${o.line_index + 1}] ${o.slogan_quality}`).join(", ")}`);
  }

  // ── Gate 3 result — print every follow-up for human "asks vs leads" judgment ──
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("GATE 3 — Follow-up text (read each: asks vs leads?)");
  console.log("═══════════════════════════════════════════════════════════════════");
  for (const o of outcomes) {
    console.log(`\n── Line ${o.line_index + 1} ──`);
    console.log(`Q: ${o.question_preview}…`);
    console.log(`Follow-up: ${o.slogan_follow_up ?? "(none — slogan was not flagged thin)"}`);
  }

  // ── Gate 4 result — substantive must come back substantive ──────────
  console.log("\n\n═══════════════════════════════════════════════════════════════════");
  console.log("GATE 4 — Substantive STAR answer passes clean");
  console.log("═══════════════════════════════════════════════════════════════════");
  const substSubstantive = outcomes.filter((o) => o.substantive_quality === "substantive").length;
  console.log(`Substantive answer → substantive on ${substSubstantive}/${outcomes.length} lines`);
  if (substSubstantive === outcomes.length) {
    console.log("✓ PASS — every line accepted the real STAR answer");
  } else {
    const wrong = outcomes.filter((o) => o.substantive_quality !== "substantive");
    console.log(`✗ FAIL — substantive answer was downgraded on:`);
    for (const o of wrong) {
      console.log(`  [line ${o.line_index + 1}] quality=${o.substantive_quality}  follow_up=${o.substantive_follow_up ?? "null"}`);
    }
  }

  console.log("\n━━━ Done ━━━");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
