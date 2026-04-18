// Run with: npx tsx tests/evals/run-evals.ts
// Uses real Claude API — runs in nightly CI, not every PR

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// The 10 universal quality tests from SALESPREP_SYSTEM_QUALITY_STANDARD.md
const QUALITY_TESTS = [
  "numbers_test",
  "icp_test",
  "story_test",
  "voice_test",
  "tools_test",
  "swap_test",
  "role_type_test",
  "jd_numbers_test",
  "comp_test",
  "power_close_test",
] as const;

type QualityTest = (typeof QUALITY_TESTS)[number];
type TestResult = { test: QualityTest; pass: boolean; score: number; reason: string };

// Sample test cases — expand to 50+ for production
const TEST_CASES = [
  {
    id: "gong-sdr-recruiter",
    company: "Gong",
    role: "SDR",
    stage_type: "conversational",
    resume_summary:
      "Senior ADR at Samsara. 127% quota Q3 2023. 40+ calls/day. 18 meetings booked in one month.",
  },
  {
    id: "hubspot-ae-hm",
    company: "HubSpot",
    role: "Account Executive",
    stage_type: "deep_dive",
    resume_summary:
      "AE at Salesforce. $180K annual quota at 115% attainment. Average deal size $45K ARR. 38-day average sales cycle.",
  },
  {
    id: "salesforce-bdr-recruiter",
    company: "Salesforce",
    role: "BDR",
    stage_type: "conversational",
    resume_summary:
      "CourseCareers graduate transitioning from retail management. 3 years managing 12-person team. No B2B sales experience yet.",
  },
];

async function judgeAnswer(
  answer: string,
  testType: QualityTest,
  context: { company: string; role: string; resumeSummary: string }
): Promise<{ pass: boolean; score: number; reason: string }> {
  const rubrics: Record<QualityTest, string> = {
    numbers_test: `Does this answer contain at least 3 specific metrics or numbers from the candidate's background?
PASS: Contains real numbers (quota %, deal size, call volume, etc.)
FAIL: Vague or generic — no specific numbers`,

    icp_test: `Does the "why this company" section name who the company sells to AND connect it to the candidate's background?
PASS: Names specific buyer type AND bridges to candidate's experience with similar buyers
FAIL: Generic excitement without specific ICP connection`,

    story_test: `For behavioral questions, does the answer begin with a specific time reference and situation?
PASS: "In Q3 of last year, I had three consecutive weeks with zero meetings booked..."
FAIL: "When I struggle, I usually go back to basics..." (process, not story)`,

    voice_test: `Does this answer sound like a person talking, or like AI-generated text?
PASS: Contractions present, varied sentence length, sounds like speech
FAIL: Uniform sentence length, formal transitions like "Furthermore" or "Additionally"`,

    tools_test: `For AE roles, does the prospecting/process answer name specific tools?
PASS: Names Salesforce, Sales Nav, Gong, Outreach, ZoomInfo etc. with specific use cases
FAIL: "I leverage various sales enablement tools"`,

    swap_test: `If you swapped the company name for a competitor, would this answer still work unchanged?
PASS: Answer breaks if company name changes (references their specific ICP, methodology, product)
FAIL: Answer works for any company — no company-specific content`,

    role_type_test: `Is this answer appropriate for the stated role type (SDR vs AE vs BDR)?
PASS: Language, metrics, and situations match the role
FAIL: AE language/metrics for an SDR, or vice versa`,

    jd_numbers_test: `If a job description was provided, does the kit include a "know the role" card with extracted metrics?
PASS: Quota, deal size, call volume, cycle length extracted from JD
FAIL: No JD numbers extracted even when JD was provided`,

    comp_test: `Does the comp card include guidance on the CONVERSATION, not just a number?
PASS: Includes framing for current OTE, target range, uncapped commission question, handling if lower
FAIL: Just says "My target is $X-Y" with no coaching on the conversation`,

    power_close_test: `Is the power close question present and labeled as "ask this last"?
PASS: "Before we wrap — any concerns about my background that would give you pause about moving me forward?" with coaching on WHY it works
FAIL: Power close absent, buried, or presented without coaching`,
  };

  const judgePrompt = `You are evaluating an AI-generated interview prep answer for a ${context.role} interview at ${context.company}.

Candidate background: ${context.resumeSummary}

ANSWER TO EVALUATE:
${answer}

TEST: ${testType.replace(/_/g, " ").toUpperCase()}

RUBRIC:
${rubrics[testType]}

Respond with ONLY valid JSON:
{
  "pass": true or false,
  "score": 0.0 to 1.0,
  "reason": "one sentence explaining your judgment with specific evidence from the answer"
}`;

  const result = await client.messages.create({
    model: "claude-haiku-4-5-20251001", // Cheap judge
    max_tokens: 200,
    messages: [{ role: "user", content: judgePrompt }],
  });

  const text = result.content
    .filter((b) => b.type === "text")
    .map((b) => ("text" in b ? (b as { text: string }).text : ""))
    .join("");

  try {
    return JSON.parse(text);
  } catch {
    return { pass: false, score: 0, reason: "Judge parse error" };
  }
}

// Check for AI slop patterns
function checkSlopPatterns(answer: string): { pass: boolean; violations: string[] } {
  const SLOP_PATTERNS = [
    { pattern: /\bdelve\b/gi, label: '"delve"' },
    { pattern: /\btapestry\b/gi, label: '"tapestry"' },
    { pattern: /\bseminal\b/gi, label: '"seminal"' },
    { pattern: /\bin today's fast-paced/gi, label: "\"in today's fast-paced\"" },
    { pattern: /\bit's worth noting\b/gi, label: "\"it's worth noting\"" },
    { pattern: /\bfurthermore\b/gi, label: '"Furthermore"' },
    { pattern: /\badditionally\b/gi, label: '"Additionally"' },
    { pattern: /—[^—]/g, label: "em-dash overuse" },
    { pattern: /\bleverage synerg/gi, label: '"leverage synergies"' },
    { pattern: /\bcutting-edge\b/gi, label: '"cutting-edge"' },
    { pattern: /\bgame-changer\b/gi, label: '"game-changer"' },
    { pattern: /\brobust\b/gi, label: '"robust"' },
    { pattern: /\bseamless(ly)?\b/gi, label: '"seamless"' },
    { pattern: /\bnavigate the complex/gi, label: '"navigate the complexities"' },
  ];

  const violations = SLOP_PATTERNS.filter(({ pattern }) => pattern.test(answer)).map(
    ({ label }) => label
  );

  return { pass: violations.length === 0, violations };
}

async function runEvals() {
  console.log("Running SalesPrep AI quality evals...\n");

  const results: Array<{
    testCase: string;
    results: TestResult[];
    slopCheck: { pass: boolean; violations: string[] };
    overallPass: boolean;
    passRate: number;
  }> = [];

  for (const testCase of TEST_CASES) {
    console.log(`Testing: ${testCase.id}`);

    // Fetch the answer from the API
    const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";

    let answer = "";
    try {
      const res = await fetch(`${baseUrl}/api/test/sample-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: testCase.company,
          role: testCase.role,
          stage_type: testCase.stage_type,
          resume_summary: testCase.resume_summary,
          answer_type: "tell_me_about_yourself",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        answer = data.content ?? data.answer ?? "";
      }
    } catch {
      console.log(`  Skipping ${testCase.id} — API not available`);
      continue;
    }

    if (!answer) {
      console.log(`  Skipping ${testCase.id} — no answer generated`);
      continue;
    }

    // Run quality tests
    const testResults: TestResult[] = [];

    for (const qualityTest of QUALITY_TESTS.slice(0, 5)) {
      // Run first 5 per case to save cost
      const result = await judgeAnswer(answer, qualityTest, {
        company: testCase.company,
        role: testCase.role,
        resumeSummary: testCase.resume_summary,
      });

      testResults.push({
        test: qualityTest,
        pass: result.pass,
        score: result.score,
        reason: result.reason,
      });

      const status = result.pass ? "\u2713" : "\u2717";
      console.log(`  ${status} ${qualityTest}: ${result.reason}`);
    }

    // Slop check
    const slopResult = checkSlopPatterns(answer);
    if (!slopResult.pass) {
      console.log(`  \u2717 Slop detected: ${slopResult.violations.join(", ")}`);
    }

    const passCount = testResults.filter((r) => r.pass).length;
    const passRate = passCount / testResults.length;

    results.push({
      testCase: testCase.id,
      results: testResults,
      slopCheck: slopResult,
      overallPass: passRate >= 0.7 && slopResult.pass,
      passRate,
    });
  }

  // Summary
  console.log("\n=== EVAL SUMMARY ===");

  const totalCases = results.length;
  const passingCases = results.filter((r) => r.overallPass).length;
  const overallPassRate = totalCases > 0 ? passingCases / totalCases : 0;

  results.forEach((r) => {
    const status = r.overallPass ? "\u2713" : "\u2717";
    console.log(`${status} ${r.testCase}: ${Math.round(r.passRate * 100)}% quality score`);
  });

  console.log(
    `\nOverall: ${passingCases}/${totalCases} cases passing (${Math.round(overallPassRate * 100)}%)`
  );

  // Fail if below threshold
  if (overallPassRate < 0.7) {
    console.error("\nEVAL FAILED: Pass rate below 70% threshold");
    process.exit(1);
  }

  console.log("\nEVALS PASSED");
}

runEvals().catch((err) => {
  console.error("Eval error:", err);
  process.exit(1);
});
