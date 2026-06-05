/**
 * End-to-end verification of the universal Insight Interview build.
 *
 * Creates three real prep_sessions for the test user, runs
 * runPositioningEngine against each, then reads back what
 * /api/insight-interview would return for each session. Demonstrates
 * flow (d) by calling buildNarrativeSpine for the switcher session.
 *
 * Flows:
 *   (a) switcher: Jordan Reyes (Enterprise Rent-A-Car ops) → Gong SDR
 *   (b) degraded: Jordan Reyes → "Notarealcompany Inc" (forces unresolvable)
 *   (c) competitive: ex-Motive AE → Samsara AE
 *   (d) skip path on the switcher session
 *
 * Leaves sessions IN PLACE so a follow-up Playwright run can render
 * flow (a) in a browser. Run scripts/cleanup-insight-flows.ts to remove.
 *
 * Usage:
 *   npx tsx scripts/verify-insight-flows.ts
 *   # → emits a JSON manifest of the created session IDs to
 *   #   test-results/insight-flows-manifest.json so the Playwright step
 *   #   can pick them up.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { Module } from "module";
import { resolve as resolvePath } from "path";

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
  console.error("Could not read .env.local.");
  process.exit(1);
}

for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "ANTHROPIC_API_KEY"]) {
  if (!process.env[k]) {
    console.error(`Missing required env var: ${k}`);
    process.exit(1);
  }
}

import type {
  CompanyProfile,
  InterrogationLine,
  InterrogationSource,
  ParsedResume,
} from "../src/types";

// ── Fixtures ──────────────────────────────────────────────────────────────

const jordanResume: ParsedResume = {
  rawText: "(fixture)",
  personalInfo: { name: "Jordan Reyes" },
  roles: [
    {
      company: "Enterprise Rent-A-Car",
      title: "Operations Manager",
      startDate: "2022-04",
      endDate: "present",
      durationMonths: 38,
      bullets: [
        {
          originalText: "Ran a 14-person branch in metro Chicago — full P&L, $4.8M annual revenue, top-quartile on customer satisfaction across the region.",
          category: "metric",
          salesRelevanceScore: 7,
          quantified: true,
          extractedMetrics: ["14 reports", "$4.8M revenue"],
        },
        {
          originalText: "Built and ran the upsell program — protection, upgrades, fuel. Attach rate 31% → 47% over 18 months.",
          category: "metric",
          salesRelevanceScore: 9,
          quantified: true,
          extractedMetrics: ["31% → 47% attach rate"],
        },
        {
          originalText: "Recovered six corporate accounts that had churned to competitors — direct procurement calls, custom rate cards, follow-through.",
          category: "responsibility",
          salesRelevanceScore: 9,
          quantified: false,
          extractedMetrics: ["6 accounts recovered"],
        },
      ],
    },
  ],
  skills: [
    { name: "Salesforce", category: "tool", salesRelevance: 7 },
    { name: "P&L management", category: "methodology", salesRelevance: 5 },
  ],
  education: [{ institution: "IU Kelley", degree: "BS Marketing", year: "2020" }],
  backgroundType: "career_switcher",
  narrativeSummary: "Five-year Enterprise Rent-A-Car operator — branch P&L, upsell turnaround, account recovery — switching to SaaS sales.",
  suggestedRoleType: "sdr_bdr",
};

const gongCompany: CompanyProfile = {
  name: "Gong",
  productDescription: "Revenue intelligence platform — captures and analyzes customer conversations to surface deal risk and coach reps.",
  icp: { companySizes: ["mid-market", "enterprise"], industries: ["B2B SaaS"], buyerPersonas: ["VP Sales", "RevOps", "CRO"] },
  salesMotion: "outbound",
  competitors: ["Chorus", "Clari", "Salesloft", "Outreach"],
  techStack: ["Salesforce", "HubSpot", "Slack"],
  stage: "scale_up",
  recentNews: ["Gong Engage GA"],
  cultureSignals: ["SDR academy"],
};

const notarealCompany: CompanyProfile = {
  name: "Notarealcompany Inc",
  productDescription: "Fictional company used to force the engine into the degraded fallback path (findOrCreateCompanyProfile cannot resolve real intel).",
  icp: { companySizes: [], industries: [], buyerPersonas: [] },
  salesMotion: "unknown",
  competitors: [],
  techStack: [],
  stage: "unknown",
  recentNews: [],
  cultureSignals: [],
};

// Reuse the Motive→Samsara fixture from the existing script's prep_session shape.

interface FlowResult {
  label: string;
  sessionId: string;
  positioning_type: string | null;
  competitive_dynamic_id: string | null;
  interrogation_source: InterrogationSource;
  line_count: number;
  first_question: string | null;
}

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const { runPositioningEngine } = await import("../src/lib/positioning/engine");
  const { buildNarrativeSpine } = await import("../src/lib/spine/build");
  const { synthesizeMotiveResumeFixture, synthesizeSamsaraCompanyFixture } =
    (await import("../scripts/lib/motive-samsara-fixtures").catch(() => ({} as Record<string, undefined>)));

  // Inline the Motive→Samsara fixtures — copied from the existing
  // run-positioning-motive-samsara.ts script so this verification is
  // self-contained.
  const motiveResume: ParsedResume = synthesizeMotiveResumeFixture?.() ?? {
    rawText: "(fixture)",
    personalInfo: { name: "Alex Chen" },
    roles: [
      {
        company: "Motive",
        title: "Account Executive — Mid-Market",
        startDate: "2022-01",
        endDate: "present",
        durationMonths: 41,
        bullets: [
          { originalText: "Carried a $1.4M quota; finished at 112% in 2024, 128% in 2023.", category: "metric", salesRelevanceScore: 10, quantified: true, extractedMetrics: ["112%", "128%", "$1.4M"] },
          { originalText: "Ran full-cycle for 25–200 unit fleets — discovery, demo, scoping, procurement, close.", category: "responsibility", salesRelevanceScore: 9, quantified: true, extractedMetrics: ["25-200 units"] },
          { originalText: "Won 11 deals in 2024 against incumbent fleet-management vendors (Samsara, KeepTruckin legacy).", category: "metric", salesRelevanceScore: 10, quantified: true, extractedMetrics: ["11 deals"] },
        ],
      },
    ],
    skills: [
      { name: "MEDDIC", category: "methodology", salesRelevance: 9 },
      { name: "Salesforce", category: "tool", salesRelevance: 8 },
    ],
    education: [{ institution: "Penn State", degree: "BS Supply Chain", year: "2020" }],
    backgroundType: "experienced_sales",
    narrativeSummary: "3+ years as a Motive mid-market AE selling fleet management against Samsara as the primary competitor.",
    suggestedRoleType: "account_executive",
  };

  const samsaraCompany: CompanyProfile = synthesizeSamsaraCompanyFixture?.() ?? {
    name: "Samsara",
    productDescription: "Connected operations platform — IoT hardware + cloud software for fleet management, equipment monitoring, and industrial workflows.",
    icp: { companySizes: ["mid-market", "enterprise"], industries: ["Trucking", "Construction", "Field services"], buyerPersonas: ["VP Fleet", "Director of Safety", "COO"] },
    salesMotion: "outbound",
    competitors: ["Motive", "KeepTruckin", "Geotab", "Verizon Connect"],
    techStack: ["Salesforce", "Gong", "Outreach"],
    stage: "public",
    recentNews: [],
    cultureSignals: [],
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SECRET_KEY!;
  const db = createClient(supabaseUrl, serviceKey);

  // Resolve test user UUID.
  const testEmail = process.env.TEST_USER_EMAIL ?? "paulhills566@gmail.com";
  const { data: usersList } = await db.auth.admin.listUsers();
  const testUser = usersList?.users.find((u) => u.email === testEmail);
  if (!testUser) {
    console.error(`Test user ${testEmail} not found.`);
    process.exit(1);
  }
  const testUserId = testUser.id;
  console.log(`Using test user ${testEmail} (${testUserId})\n`);

  const created: string[] = [];
  const results: FlowResult[] = [];

  // Helper: insert a prep_sessions row + run engine + read back the
  // /api/insight-interview-shaped result.
  async function runFlow(
    label: string,
    resume: ParsedResume,
    company: CompanyProfile,
    roleType: "sdr_bdr" | "account_executive",
    stage: "recruiter" | "hiring_manager",
    targetCompanyUrl?: string
  ): Promise<FlowResult> {
    console.log(`━━━ ${label} ━━━`);
    const sessionId = crypto.randomUUID();
    const sessionData = {
      id: sessionId,
      resume,
      company,
      roleType,
      stage,
      targetRole: roleType === "sdr_bdr" ? "Sales Development Representative" : "Account Executive",
      companyName: company.name,
      companyUrl: targetCompanyUrl ?? "",
      jobDescription: "",
      answerSlots: [],
      createdAt: Date.now(),
    };

    const { error: insertErr } = await db.from("prep_sessions").insert({
      id: sessionId,
      user_id: testUserId,
      session_data: sessionData,
      target_role: sessionData.targetRole,
      role_type: roleType,
      stage,
      job_description: "",
    });
    if (insertErr) {
      console.error("  ✗ insert failed:", insertErr.message);
      throw new Error("flow setup failed");
    }
    created.push(sessionId);

    const t0 = Date.now();
    const brief = await runPositioningEngine(
      sessionId,
      resume,
      company,
      roleType,
      stage,
      targetCompanyUrl ? { targetCompanyUrl } : {}
    );
    const engineMs = Date.now() - t0;
    console.log(`  engine: ${(engineMs / 1000).toFixed(1)}s, positioning_type=${brief.positioning_type}, source=${brief.interrogation_source}, dynamic_id=${brief.competitive_dynamic_id ?? "null"}`);

    // Read back what /api/insight-interview GET would return.
    const { data: briefRow } = await db
      .from("positioning_briefs")
      .select("positioning_type, competitive_dynamic_id, fallback_interrogation_lines, interrogation_source")
      .eq("session_id", sessionId)
      .maybeSingle();

    let lines: InterrogationLine[] = [];
    if (briefRow?.competitive_dynamic_id) {
      const { data: dyn } = await db
        .from("competitive_dynamics")
        .select("interrogation_lines")
        .eq("id", briefRow.competitive_dynamic_id)
        .maybeSingle();
      const raw = (dyn?.interrogation_lines ?? []) as InterrogationLine[];
      lines = Array.isArray(raw) ? raw : [];
    }
    if (lines.length === 0) {
      const fb = (briefRow?.fallback_interrogation_lines ?? []) as InterrogationLine[];
      lines = Array.isArray(fb) ? fb : [];
    }

    const source = (briefRow?.interrogation_source ?? "competitive") as InterrogationSource;
    console.log(`  GET response: ${lines.length} lines, interrogation_source=${source}`);
    lines.forEach((l, i) => console.log(`    [${i + 1}] ${l.question.slice(0, 110)}${l.question.length > 110 ? "…" : ""}`));
    console.log("");

    return {
      label,
      sessionId,
      positioning_type: brief.positioning_type ?? null,
      competitive_dynamic_id: brief.competitive_dynamic_id,
      interrogation_source: source,
      line_count: lines.length,
      first_question: lines[0]?.question ?? null,
    };
  }

  try {
    // ── (a) switcher ─────────────────────────────────────────────────
    results.push(await runFlow("(a) switcher — Jordan → Gong SDR", jordanResume, gongCompany, "sdr_bdr", "hiring_manager"));

    // ── (b) degraded — synthetic fallback brief ──────────────────────
    // We can't easily force the engine's degraded branch from outside —
    // the live findOrCreateCompanyProfile resolves anything Haiku can
    // hallucinate, and the switcher path can synthesize against any
    // company shape. To honestly verify the fallback render path
    // end-to-end, seed a synthetic prep_session + positioning_brief
    // with interrogation_source='fallback' directly. This exercises:
    //   - migration 045's CHECK constraint accepts 'fallback'
    //   - /api/insight-interview returns interrogation_source='fallback'
    //   - the page's conditional fallback header renders
    {
      console.log("━━━ (b) degraded — synthetic fallback brief ━━━");
      const { getFallbackInterrogationLines } = await import("../src/lib/positioning/fallback-interrogation");
      const sessionId = crypto.randomUUID();
      const sessionData = {
        id: sessionId,
        resume: jordanResume,
        company: notarealCompany,
        roleType: "sdr_bdr",
        stage: "hiring_manager",
        targetRole: "Sales Development Representative",
        companyName: notarealCompany.name,
        companyUrl: "",
        jobDescription: "",
        answerSlots: [],
        createdAt: Date.now(),
      };
      const { error: insertErr } = await db.from("prep_sessions").insert({
        id: sessionId,
        user_id: testUserId,
        session_data: sessionData,
        target_role: sessionData.targetRole,
        role_type: "sdr_bdr",
        stage: "hiring_manager",
        job_description: "",
      });
      if (insertErr) throw new Error(`prep_sessions insert failed: ${insertErr.message}`);
      created.push(sessionId);

      const fallbackLines = getFallbackInterrogationLines("hiring_manager", "sdr_bdr");
      const { error: briefErr } = await db.from("positioning_briefs").upsert(
        {
          session_id: sessionId,
          positioning_type: "industry_switcher",
          anchor_employer: null,
          anchor_employer_role: null,
          classification_reasoning: "Forced fallback for end-to-end verification of the degraded path.",
          classification_confidence: 0,
          classification_signal: "haiku_classification",
          competitive_dynamic_id: null,
          transferable_bridges: [],
          domain_gap_to_close: null,
          company_hook: "Interest in Notarealcompany Inc grounded in the candidate's resume — to be sharpened during prep.",
          fallback_interrogation_lines: fallbackLines,
          interrogation_source: "fallback",
          generated_at: new Date().toISOString(),
        },
        { onConflict: "session_id" }
      );
      if (briefErr) throw new Error(`positioning_briefs upsert failed: ${briefErr.message}`);
      console.log(`  seeded synthetic fallback brief, ${fallbackLines.length} lines`);

      const { data: briefRow } = await db
        .from("positioning_briefs")
        .select("interrogation_source, fallback_interrogation_lines")
        .eq("session_id", sessionId)
        .maybeSingle();
      const readBackLines = (briefRow?.fallback_interrogation_lines ?? []) as InterrogationLine[];
      const readBackSource = (briefRow?.interrogation_source ?? "competitive") as InterrogationSource;
      console.log(`  GET response: ${readBackLines.length} lines, interrogation_source=${readBackSource}`);
      readBackLines.forEach((l, i) =>
        console.log(`    [${i + 1}] ${l.question.slice(0, 110)}${l.question.length > 110 ? "…" : ""}`)
      );
      console.log("");

      results.push({
        label: "(b) degraded — synthetic fallback brief (Jordan → Notarealcompany)",
        sessionId,
        positioning_type: "industry_switcher",
        competitive_dynamic_id: null,
        interrogation_source: readBackSource,
        line_count: readBackLines.length,
        first_question: readBackLines[0]?.question ?? null,
      });
    }

    // ── (c) competitive — Motive → Samsara ───────────────────────────
    results.push(await runFlow("(c) competitive — Motive AE → Samsara AE", motiveResume, samsaraCompany, "account_executive", "hiring_manager", "https://www.samsara.com"));

    // ── (d) skip flow on switcher session ────────────────────────────
    const switcherSessionId = results[0].sessionId;
    console.log("━━━ (d) skip flow — buildNarrativeSpine on switcher session ━━━");
    const sd0 = Date.now();
    try {
      await buildNarrativeSpine(switcherSessionId);
      const sdMs = Date.now() - sd0;
      console.log(`  spine built in ${(sdMs / 1000).toFixed(1)}s`);
    } catch (err) {
      console.error("  ✗ spine build threw:", err instanceof Error ? err.message : String(err));
    }
    const { error: updErr } = await db
      .from("prep_sessions")
      .update({ insight_interview_status: "skipped", updated_at: new Date().toISOString() })
      .eq("id", switcherSessionId);
    if (updErr) console.error("  ✗ status update failed:", updErr.message);
    else console.log(`  insight_interview_status=skipped for ${switcherSessionId}`);
    console.log("");

    // ── Manifest for Playwright follow-up ────────────────────────────
    mkdirSync("test-results", { recursive: true });
    writeFileSync(
      "test-results/insight-flows-manifest.json",
      JSON.stringify(
        {
          test_user_id: testUserId,
          test_user_email: testEmail,
          flows: results,
          // The switcher session was marked skipped above. For the
          // Playwright UI render we want a FRESH switcher session that
          // hasn't been auto-skipped — create one more.
        },
        null,
        2
      )
    );
    console.log("Wrote test-results/insight-flows-manifest.json");

    // Create one extra switcher session for the UI render (the original
    // got marked skipped by flow d).
    console.log("\n━━━ Extra switcher session for Playwright UI render ━━━");
    const uiResult = await runFlow("(ui) switcher — Jordan → Gong SDR (for UI render)", jordanResume, gongCompany, "sdr_bdr", "hiring_manager");
    const manifest = JSON.parse(readFileSync("test-results/insight-flows-manifest.json", "utf-8"));
    manifest.ui_session_id = uiResult.sessionId;
    writeFileSync("test-results/insight-flows-manifest.json", JSON.stringify(manifest, null, 2));

    console.log("\n━━━ Summary ━━━");
    for (const r of results) {
      console.log(`${r.label}`);
      console.log(`  positioning_type=${r.positioning_type}  source=${r.interrogation_source}  lines=${r.line_count}  dynamic=${r.competitive_dynamic_id ? "yes" : "no"}`);
    }
    console.log(`(ui) ${uiResult.sessionId} kept for UI verification`);
    console.log("\nSessions left in DB for Playwright. Run scripts/cleanup-insight-flows.ts after.");
  } catch (err) {
    console.error("\n✗ Flow run threw:", err);
    console.error("Created session ids (manual cleanup may be required):", created);
    process.exit(1);
  }
}

main();
