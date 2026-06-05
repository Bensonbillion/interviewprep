/**
 * One-off live verification of synthesizeSwitcherBrief — the function the
 * universal-Insight-Interview build extended to produce interrogation
 * lines for switcher / early_career sessions.
 *
 * Hits Anthropic Haiku (~$0.01). Does NOT write to Supabase — we're
 * checking that the prompt + schema produce a valid brief with
 * interrogation_lines, independent of whether migration 045 is applied.
 *
 * Fixture is the exact shape that failed live on June 4: a car-rental
 * operations manager → Gong SDR (industry_switcher).
 *
 * Usage:
 *   npx tsx scripts/verify-switcher-synthesis.ts
 */

import { readFileSync } from "fs";
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

for (const k of ["ANTHROPIC_API_KEY"]) {
  if (!process.env[k]) {
    console.error(`Missing required env var: ${k}`);
    process.exit(1);
  }
}

import type {
  CompanyProfile,
  ParsedResume,
  PositioningClassification,
} from "../src/types";

const carRentalResume: ParsedResume = {
  rawText: "(omitted — fixture)",
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
          originalText:
            "Ran a 14-person branch in metro Chicago — full P&L, $4.8M annual revenue, top-quartile on customer satisfaction across the region.",
          category: "metric",
          salesRelevanceScore: 7,
          quantified: true,
          extractedMetrics: ["14 reports", "$4.8M revenue"],
        },
        {
          originalText:
            "Built and ran the upsell program for the branch — protection packages, vehicle upgrades, fuel options. Quarterly attach rate climbed from 31% to 47% over 18 months.",
          category: "metric",
          salesRelevanceScore: 9,
          quantified: true,
          extractedMetrics: ["31% → 47% attach rate"],
        },
        {
          originalText:
            "Recovered six corporate accounts that had churned to competitors after specific service incidents — direct calls with procurement leads, custom rate cards, follow-through on the resolution.",
          category: "responsibility",
          salesRelevanceScore: 9,
          quantified: false,
          extractedMetrics: ["6 accounts recovered"],
        },
      ],
    },
    {
      company: "Enterprise Rent-A-Car",
      title: "Management Trainee → Assistant Manager",
      startDate: "2020-06",
      endDate: "2022-03",
      durationMonths: 22,
      bullets: [
        {
          originalText:
            "Promoted twice through the management training program — sales, ops, customer service rotations.",
          category: "leadership",
          salesRelevanceScore: 6,
          quantified: false,
          extractedMetrics: [],
        },
      ],
    },
  ],
  skills: [
    { name: "Salesforce", category: "tool", salesRelevance: 7 },
    { name: "P&L management", category: "methodology", salesRelevance: 5 },
    { name: "Coaching", category: "soft_skill", salesRelevance: 6 },
  ],
  education: [
    { institution: "Indiana University Kelley School of Business", degree: "BS Marketing", year: "2020" },
  ],
  backgroundType: "career_switcher",
  narrativeSummary:
    "Five-year operator at Enterprise Rent-A-Car — branch P&L, upsell-program turnaround, account recovery — moving into SaaS sales after building real B2B muscle on the corporate side of the business.",
  suggestedRoleType: "sdr_bdr",
};

const gongCompany: CompanyProfile = {
  name: "Gong",
  productDescription:
    "Revenue intelligence platform — captures and analyzes customer-facing conversations (calls, emails, meetings) to surface deal risk, coach reps, and roll up forecast accuracy for sales leaders.",
  icp: {
    companySizes: ["mid-market", "enterprise"],
    industries: ["B2B SaaS", "tech-enabled services"],
    buyerPersonas: ["VP Sales", "RevOps", "Chief Revenue Officer", "Sales Enablement"],
  },
  salesMotion: "outbound",
  competitors: ["Chorus (ZoomInfo)", "Clari", "Salesloft Cadence", "Outreach"],
  techStack: ["Salesforce", "HubSpot", "Microsoft Dynamics", "Slack", "Zoom"],
  stage: "scale_up",
  recentNews: [
    "Expanded Gong Engage (multi-channel sequencing) GA",
    "Added native forecast workflows in Gong Forecast",
  ],
  cultureSignals: [
    "Heavy investment in SDR training infra (internal academy)",
    "Public commitments to data-backed coaching practices",
  ],
};

const classification: PositioningClassification = {
  positioning_type: "industry_switcher",
  anchor_employer: "Enterprise Rent-A-Car",
  anchor_employer_role: "Operations Manager",
  classification_reasoning:
    "Candidate has 5 years of B2B-adjacent operator + upsell experience at a national car-rental brand — quota-style behaviors and corporate account ownership, but not in SaaS. Closest fit is industry_switcher: real customer-facing motion in a non-software industry.",
  classification_confidence: 0.78,
  classification_signal: "haiku_classification",
};

async function main() {
  // Dynamic imports — these need to run AFTER the server-only shim is
  // installed at the top of the file. Static `import` would be hoisted
  // before the shim and fail with "module cannot be imported from a
  // Client Component module" on switcher.ts:1.
  const { synthesizeSwitcherBrief } = await import("../src/lib/positioning/switcher");
  const { SwitcherBriefSchema } = await import("../src/lib/types/schemas");

  console.log("━━━ Switcher synthesis verification ━━━");
  console.log(`Candidate: ${carRentalResume.personalInfo.name}`);
  console.log(`Background: ${carRentalResume.narrativeSummary}`);
  console.log(`Target: ${gongCompany.name} (${classification.positioning_type})`);
  console.log("");

  const t0 = Date.now();
  const brief = await synthesizeSwitcherBrief(
    classification,
    carRentalResume,
    gongCompany,
    "sdr_bdr",
    "hiring_manager"
  );
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Synthesis returned in ${elapsed}s. used_fallback=${brief.used_fallback}`);
  console.log("");

  // Schema only applies to real synthesis output (not the static-fallback
  // brief, which has transferable_bridges: [] by design).
  if (!brief.used_fallback) {
    const { used_fallback: _uf, ...briefForSchema } = brief;
    void _uf;
    const parsed = SwitcherBriefSchema.safeParse(briefForSchema);
    if (!parsed.success) {
      console.error("✗ Brief failed SwitcherBriefSchema validation:");
      console.error(JSON.stringify(parsed.error.issues, null, 2));
      process.exit(1);
    }
    console.log("✓ Brief passes SwitcherBriefSchema");
  } else {
    console.log("⚠  Brief is the static-fallback shape (synthesis failed).");
    console.log(`   transferable_bridges count: ${brief.transferable_bridges.length} (expected 0 for fallback)`);
    console.log(`   interrogation_lines count:  ${brief.interrogation_lines.length} (expected 5 for fallback)`);
  }
  console.log("");

  console.log("━━━ transferable_bridges ━━━");
  brief.transferable_bridges.forEach((b, i) => {
    console.log(`[${i + 1}] from: ${b.from}`);
    console.log(`    to: ${b.to}`);
    console.log(`    why_it_maps: ${b.why_it_maps}`);
  });
  console.log("");
  console.log("━━━ domain_gap_to_close ━━━");
  console.log(brief.domain_gap_to_close);
  console.log("");
  console.log("━━━ company_hook ━━━");
  console.log(brief.company_hook);
  console.log("");
  console.log(`━━━ interrogation_lines (${brief.interrogation_lines.length}) ━━━`);
  brief.interrogation_lines.forEach((l, i) => {
    console.log(`\n[${i + 1}] Q: ${l.question}`);
    console.log(`    why_it_matters: ${l.why_it_matters}`);
    console.log(`    targets: ${l.targets.join(", ")}`);
    console.log(`    star_slot_hint: ${l.star_slot_hint}`);
    if (l.hypothesis) console.log(`    hypothesis: ${l.hypothesis}`);
    console.log(`    directionality_note: ${l.directionality_note}`);
  });
}

main().catch((err) => {
  console.error("\n✗ Verification threw:", err);
  process.exit(1);
});
