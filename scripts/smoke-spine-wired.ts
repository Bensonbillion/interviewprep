/**
 * Smoke test: confirm the narrative spine reaches every positioning-
 * relevant answer prompt. No Claude calls — just calls each builder
 * with a fake spine in ctx and asserts the spine block appears in the
 * built user prompt.
 *
 * Catches the "wired but not interpolated" failure mode where the type
 * change goes in but a builder forgets to actually use ctx.spine.
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

try {
  const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  for (const line of envContent.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1).replace(/^["']|["']$/g, "");
  }
} catch { /* tests don't need env */ }

async function main() {
  const promptsMod = await import("@/lib/ai/prompts");
  const { buildPromptForAnswerType } = promptsMod;

  const fakeSpine = {
    id: "00000000-0000-0000-0000-000000000000",
    session_id: "00000000-0000-0000-0000-000000000000",
    core_thesis: "TEST_THESIS — three years closing fleet deals against Samsara at Motive, here to bring that competitive fluency to the other side.",
    signature_proof_points: [
      {
        label: "TEST_PROOF_COMPLETE — Hill & Sons displacement",
        situation: "A 120-truck construction fleet evaluating both vendors.",
        task: "Retain the account against a Samsara preference.",
        action: "Pulled in SE for integration story + lined up reference call.",
        result: "Closed $42k ARR.",
        star_complete: true,
        source: "captured_insight" as const,
        gaps: [],
      },
      {
        label: "TEST_PROOF_INCOMPLETE — $1.2M ARR career total",
        situation: "Three-year tenure as Mid-Market AE.",
        task: "Build a book.",
        action: "Ran full-cycle motion.",
        result: "$1.2M ARR closed.",
        star_complete: false,
        source: "resume" as const,
        gaps: ["situation is a tenure not a specific moment"],
      },
    ],
    competitive_truths: [
      {
        truth: "TEST_TRUTH_SUPPORTED — Samsara's platform breadth is a real, often decisive advantage.",
        use_in: ["tell_me_about_yourself", "why_this_company", "behavioral_star", "objection_response"] as const,
        candidate_phrasing: "TEST_PHRASING — they didn't want two vendors and the site-visibility module covered their yard.",
        star_proof_ref: 0,
      },
      {
        truth: "TEST_TRUTH_UNSUPPORTED — Samsara's public-company status gives brand credibility.",
        use_in: ["why_this_company", "questions_to_ask"] as const,
        candidate_phrasing: "TEST_UNSUPPORTED_PHRASING.",
        star_proof_ref: null,
      },
    ],
    company_hook: "TEST_HOOK — three years closing mid-market fleet deals at Motive; want to sell from the integration side I've watched win.",
    positioning_frame: {
      type: "direct_competitor" as const,
      frame_statement: "TEST_FRAME — lean on lived competitive fluency.",
    },
    narrative_risks: [
      "TEST_RISK_ONE — no enterprise-deal experience; do not overreach.",
      "TEST_RISK_TWO — $1.2M ARR is track-record only, not a STAR spine.",
    ],
    built_from: {
      has_positioning_brief: true,
      captured_insight_count: 3,
      positioning_type: "direct_competitor" as const,
      insight_interview_status: "completed",
    },
    generated_at: new Date().toISOString(),
  };

  const fakeCtx = {
    resume: {
      rawText: "(test)",
      personalInfo: { name: "Test", email: "t@t.com" },
      roles: [{
        company: "Motive", title: "AE", startDate: "2022-03", endDate: "present", durationMonths: 38,
        bullets: [{ originalText: "Closed $1.2M ARR", category: "metric" as const, salesRelevanceScore: 9, quantified: true, extractedMetrics: ["$1.2M"] }],
      }],
      skills: [], education: [],
      backgroundType: "experienced_sales" as const,
      narrativeSummary: "AE with fleet telematics experience.",
    },
    company: {
      name: "Samsara",
      productDescription: "Connected Operations Cloud.",
      icp: { companySizes: ["Mid-Market"], industries: ["Transportation"], buyerPersonas: ["Safety Director"] },
      salesMotion: "outbound" as const,
      competitors: ["Motive"],
      techStack: [],
      stage: "public" as const,
      recentNews: [],
      cultureSignals: [],
    },
    relevanceMap: { strongMatches: [], gaps: [], leadStories: [] },
    jobDescription: "AE at Samsara.",
    targetRole: "Account Executive",
    roleType: "account_executive" as const,
    stage: "hiring_manager" as const,
    seniority: "mid" as const,
    spine: fakeSpine,
  };

  // Test cases — each pair is [answer type, sentinel strings the spine block must include].
  const cases: { type: string; mustInclude: string[]; mustNotInclude?: string[] }[] = [
    { type: "tell_me_about_yourself", mustInclude: ["NARRATIVE SPINE", "TEST_THESIS", "TEST_PROOF_COMPLETE", "TEST_TRUTH_SUPPORTED", "TEST_RISK_ONE"] },
    { type: "why_sales", mustInclude: ["NARRATIVE SPINE", "TEST_THESIS"] },
    { type: "why_this_company", mustInclude: ["NARRATIVE SPINE", "TEST_THESIS", "TEST_HOOK", "TEST_RISK_ONE"] },
    { type: "behavioral_star", mustInclude: ["NARRATIVE SPINE", "TEST_PROOF_COMPLETE", "anchor EVERY behavioral answer"], mustNotInclude: ["TEST_PROOF_INCOMPLETE"] },
    { type: "objection_response", mustInclude: ["NARRATIVE SPINE", "TEST_TRUTH_SUPPORTED"] },
    { type: "questions_to_ask", mustInclude: ["NARRATIVE SPINE", "TEST_RISK_ONE", "TEST_TRUTH_UNSUPPORTED"] },
    { type: "career_switcher_bridge", mustInclude: ["NARRATIVE SPINE", "TEST_THESIS"] },
  ];

  let failures = 0;
  console.log("━━━ Spine wiring smoke test ━━━\n");

  for (const c of cases) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = buildPromptForAnswerType(c.type as any, fakeCtx as any);
    const fullPrompt = result.system + "\n\n" + result.user;
    const missing = c.mustInclude.filter((s) => !fullPrompt.includes(s));
    const wronglyIncluded = (c.mustNotInclude ?? []).filter((s) => fullPrompt.includes(s));
    if (missing.length === 0 && wronglyIncluded.length === 0) {
      console.log(`✓ ${c.type}`);
    } else {
      failures++;
      console.log(`✗ ${c.type}`);
      if (missing.length > 0) console.log(`   MISSING: ${missing.join(", ")}`);
      if (wronglyIncluded.length > 0) console.log(`   WRONGLY INCLUDED: ${wronglyIncluded.join(", ")}`);
    }
  }

  // Negative case — confirm absent spine = no spine block (today's behavior preserved).
  const ctxNoSpine = { ...fakeCtx, spine: undefined };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noSpineResult = buildPromptForAnswerType("tell_me_about_yourself" as any, ctxNoSpine as any);
  const noSpinePrompt = noSpineResult.system + "\n\n" + noSpineResult.user;
  if (noSpinePrompt.includes("NARRATIVE SPINE")) {
    failures++;
    console.log("✗ negative case: spine block appears when ctx.spine is undefined");
  } else {
    console.log("✓ negative case (no spine) — spine block correctly absent");
  }

  console.log(`\n${failures === 0 ? "✓" : "✗"} ${cases.length + 1 - failures}/${cases.length + 1} smoke checks passed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
