/**
 * Seed two pre-built interview prep sessions for a specific user.
 *
 * Session 1: Senior BDR — recruiter phone screen (unknown company)
 * Session 2: HubSpot Canada — Small Business AE hiring manager interview
 *
 * Usage: npx tsx scripts/seed-interview-sessions.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// ─── Load .env.local ─────────────────────────────────────────────────────────

const envPath = resolve(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex);
    const value = trimmed.slice(eqIndex + 1).replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  console.error("Could not read .env.local — ensure it exists in the project root.");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: "public" },
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Config ──────────────────────────────────────────────────────────────────

const TARGET_EMAIL = "paulhills566@gmail.com";

// ─── Session Data Builders ───────────────────────────────────────────────────

function buildSession1(sessionId: string) {
  return {
    id: sessionId,
    companyName: "Unknown Company",
    companyUrl: "",
    targetRole: "Senior Business Development Representative",
    roleType: "sdr_bdr",
    stage: "recruiter",
    createdAt: Date.now(),
    jobDescription: "Senior BDR role — recruiter phone screen. Running own discovery calls, supporting strategic AEs in midmarket segment. Evaluation focus: energy, motivation, organization, objection handling ability.",
    resume: {
      rawText: "",
      personalInfo: { name: "Benson" },
      roles: [
        {
          title: "Senior Sales Development Representative",
          company: "Samsara",
          startDate: "2024-02",
          endDate: null,
          bullets: [
            { originalText: "Hit quota consistently for 7 months, earning promotion to Senior SDR" },
            { originalText: "Support 3 account executives in midmarket segment" },
            { originalText: "Use Command of the Message framework for deep discovery qualifying" },
            { originalText: "Qualify leads using BANT — require 3 out of 4 criteria as senior BDR" },
          ],
        },
        {
          title: "Business Development Representative",
          company: "Brandwatch",
          startDate: "2022-06",
          endDate: "2024-01",
          bullets: [
            { originalText: "Full outbound BDR role booking meetings for account executives" },
            { originalText: "Promoted to Associate Account Executive running own commercial deals" },
            { originalText: "Round-robin meeting distribution process" },
          ],
        },
      ],
      skills: ["Cold calling", "Objection handling", "BANT qualification", "Command of the Message", "Gong", "SalesLoft", "ZoomInfo"],
      backgroundType: "experienced_sales",
      narrativeSummary: "Senior SDR at Samsara with 2+ years selling logistics technology to transportation and construction fleets. Previously at Brandwatch (social media management) where promoted from BDR to Associate AE. Strong outbound skills, objection handling, and deep discovery qualification.",
    },
    company: {
      name: "Unknown Company",
      productDescription: "Technology company hiring senior BDR with path to running own discovery calls.",
      icp: {
        companySizes: ["midmarket"],
        industries: [],
        buyerPersonas: [],
      },
      salesMotion: "outbound",
      competitors: [],
      techStack: [],
      stage: "growth",
      recentNews: [],
      cultureSignals: ["Values team culture and engagement", "Structured onboarding program", "Clear growth path from BDR to AE or management"],
    },
    relevanceMap: {
      strongMatches: [
        { resumeItem: "Senior SDR at Samsara — 7 months hitting quota", relevance: "Consistent performance proves readiness for senior BDR role" },
        { resumeItem: "Associate AE experience at Brandwatch", relevance: "Shows ability to run discovery and close deals independently" },
      ],
      gaps: [
        { requirement: "Running own discovery calls", gap: "Limited formal discovery ownership in current role" },
      ],
      leadStories: [
        "Promotion trajectory: BDR → Associate AE → Senior SDR across two companies",
      ],
    },
    answerSlots: [
      { type: "tell_me_about_yourself", label: "Tell Me About Yourself", description: "60-90 second intro covering your role, company, and key metrics.", status: "locked", content: "" },
      { type: "why_sales", label: "Why Sales / Why This Role", description: "Your motivation for sales and why you want this specific role.", status: "locked", content: "" },
      { type: "why_this_company", label: "Why This Company", description: "Why you want to work at this company specifically.", status: "locked", content: "" },
      { type: "behavioral_star", label: "Behavioral STAR Story", description: "A specific achievement using the STAR format.", status: "locked", content: "" },
      { type: "questions_to_ask", label: "Questions to Ask", description: "Thoughtful questions to ask the interviewer.", status: "locked", content: "" },
      { type: "cheat_sheet", label: "Stage Cheat Sheet", description: "Key points and reminders for this interview stage.", status: "locked", content: "" },
    ],
    interviewers: [],
    personalContext: "Looking for growth opportunity — wants to move from SDR to AE. Currently at Samsara but next step (midmarket) requires travel which isn't appealing. Wants somewhere with more impact and growth potential.",
  };
}

function buildSession2(sessionId: string) {
  return {
    id: sessionId,
    companyName: "HubSpot",
    companyUrl: "https://www.hubspot.com",
    targetRole: "Account Executive — Small Business",
    roleType: "account_executive",
    stage: "hiring_manager",
    createdAt: Date.now(),
    jobDescription: "Small Business Account Executive at HubSpot Canada. Full sales cycle role — prospecting to close, no BDR support. 75% self-sourced pipeline through outbound. 40 cold calls/day, 2.5-3 hours outbound, 3x pipeline coverage. Monthly quota: $5,635 MRR. ~10 deals/month, avg deal size $500 MRR, 16-day avg sales cycle. 7 products to sell. Greenfield territory across Canada, 200 targeted accounts + 100 install-base accounts for cross-sell/upsell. Comp: $83,600 base, $55,700 variable (OTE $139,300 + $17K equity). Uncapped commission.",
    resume: {
      rawText: "",
      personalInfo: { name: "Benson" },
      roles: [
        {
          title: "Commercial Account Executive",
          company: "Samsara",
          startDate: "2024-02",
          endDate: null,
          bullets: [
            { originalText: "Full cycle sales selling logistics technology to 10-40 vehicle fleets" },
            { originalText: "Average deal size $10,000 ARR, quarterly quota of $180K" },
            { originalText: "70% outbound, 30% inbound split" },
            { originalText: "Close 6-8 deals per month with 5-12 week sales cycle" },
            { originalText: "Use Command of the Message framework for discovery and qualification" },
            { originalText: "Hold book of business for 2 years with annual refresh" },
          ],
        },
        {
          title: "Associate Account Executive",
          company: "Brandwatch",
          startDate: "2023-06",
          endDate: "2024-01",
          bullets: [
            { originalText: "Promoted from BDR to Associate AE — full cycle commercial sales" },
            { originalText: "Booked own meetings and closed deals independently" },
          ],
        },
        {
          title: "Business Development Representative",
          company: "Brandwatch",
          startDate: "2022-06",
          endDate: "2023-06",
          bullets: [
            { originalText: "Full outbound BDR role in social media management space" },
          ],
        },
      ],
      skills: ["Full cycle sales", "Cold calling", "Command of the Message", "Outbound prospecting", "BANT", "Multithreading", "ZoomInfo", "LinkedIn", "Gong", "AI prospecting"],
      backgroundType: "experienced_sales",
      narrativeSummary: "Commercial AE at Samsara with full cycle sales experience selling logistics technology. $180K quarterly quota, 6-8 deals/month. Previously BDR → Associate AE at Brandwatch. Strong outbound skills with structured prospecting and Command of the Message methodology.",
    },
    company: {
      name: "HubSpot",
      productDescription: "All-in-one CRM platform with marketing, sales, service, content, operations, and commerce hubs for growing businesses.",
      icp: {
        companySizes: ["small_business"],
        industries: ["all"],
        buyerPersonas: ["Marketing Manager", "Sales Director", "Business Owner", "VP Marketing"],
      },
      salesMotion: "outbound",
      competitors: ["Salesforce", "Zoho", "Pipedrive", "Monday.com", "ActiveCampaign"],
      techStack: ["CRM", "Marketing Hub", "Sales Hub", "Service Hub", "Content Hub", "Operations Hub", "Commerce Hub"],
      stage: "public",
      recentNews: [
        "Canadian sales org launched in 2022, now 8 managers across small business and midmarket",
        "Small business team: 32 reps total, team finished 2025 at 96% attainment",
        "6 reps over 100%, 2 over 110%, 1 made President's Club Hawaii",
      ],
      cultureSignals: [
        "Growth-oriented — BDRs have moved to product, CS, implementation, AE, and leadership",
        "12-month mark for promotion discussions based on merit",
        "Small business → Direct (midmarket) promotion path in 1.5-2 years",
      ],
    },
    relevanceMap: {
      strongMatches: [
        { resumeItem: "Full cycle sales at Samsara — $180K quarterly quota", relevance: "Proves ability to run entire sales cycle independently" },
        { resumeItem: "70% outbound focus", relevance: "Matches HubSpot's 80% outbound expectation" },
        { resumeItem: "6-8 deals/month close rate", relevance: "Close to HubSpot's 10 deals/month target" },
      ],
      gaps: [
        { requirement: "OTE slightly lower than current ($139K vs $150K)", gap: "Comp decrease may need to be offset by growth opportunity" },
        { requirement: "No BDR support — 100% self-sourced", gap: "Currently has some inbound support at Samsara" },
      ],
      leadStories: [
        "Full cycle experience across two industries (social media + logistics)",
        "Consistent upward trajectory: BDR → Associate AE → Commercial AE",
        "Strong outbound discipline — 70% self-sourced pipeline",
      ],
    },
    answerSlots: [
      { type: "tell_me_about_yourself", label: "Tell Me About Yourself", description: "60-90 second intro covering your role, company, and key metrics.", status: "locked", content: "" },
      { type: "why_sales", label: "Why Sales / Career Goals", description: "What excites you about sales and your career goals.", status: "locked", content: "" },
      { type: "why_this_company", label: "Why HubSpot", description: "Why you want to work at HubSpot specifically.", status: "locked", content: "" },
      { type: "behavioral_star", label: "Behavioral STAR Story", description: "A specific achievement using the STAR format.", status: "locked", content: "" },
      { type: "comp_expectations", label: "Comp Expectations", description: "How to navigate the compensation discussion.", status: "locked", content: "" },
      { type: "questions_to_ask", label: "Questions to Ask", description: "Thoughtful questions to ask the hiring manager.", status: "locked", content: "" },
      { type: "cheat_sheet", label: "Stage Cheat Sheet", description: "Key points and reminders for this interview stage.", status: "locked", content: "" },
    ],
    interviewers: [],
    personalContext: "Currently at Samsara making ~$150K OTE. HubSpot OTE is $139K but with $17K equity. Growth is the primary motivator — wants to go upmarket eventually and into management. Current employer's next step (midmarket) requires travel to Nova Scotia/Alberta which isn't appealing. Previously competed with HubSpot at Brandwatch and has always admired their holistic product.",
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Look up user
  console.log(`Looking up user: ${TARGET_EMAIL}`);
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error("Failed to list users:", userError.message);
    process.exit(1);
  }
  const user = users.find((u) => u.email === TARGET_EMAIL);
  if (!user) {
    console.error(`User ${TARGET_EMAIL} not found in auth.users`);
    process.exit(1);
  }
  const userId = user.id;
  console.log(`Found user: ${userId}`);

  // 2. Check if sessions already exist (match by companyName)
  let existingSession1 = false;
  let existingSession2 = false;
  try {
    const { data: existing } = await supabase
      .from("prep_sessions")
      .select("id, session_data")
      .eq("user_id", userId);

    if (existing) {
      for (const row of existing as { id: string; session_data?: Record<string, unknown> | null }[]) {
        const sd = row.session_data;
        if (!sd) continue;
        if (sd.companyName === "Unknown Company" && sd.roleType === "sdr_bdr") {
          existingSession1 = true;
          console.log(`Session 1 (Senior BDR) already exists: ${row.id}`);
        }
        if (sd.companyName === "HubSpot" && sd.roleType === "account_executive") {
          existingSession2 = true;
          console.log(`Session 2 (HubSpot AE) already exists: ${row.id}`);
        }
      }
    }
  } catch {
    // session_data column may not be in schema cache — skip check
    console.log("  (Could not check existing sessions — schema cache may be stale)");
  }

  if (existingSession1 && existingSession2) {
    console.log("\nBoth sessions already exist. Nothing to do.");
    return;
  }

  // 3. Build and insert sessions
  const results: { name: string; id: string; url: string }[] = [];

  // ─── Session 1: Senior BDR ────────────────────────────────────────────────
  if (!existingSession1) {
    const sessionId1 = crypto.randomUUID();
    const sessionData1 = buildSession1(sessionId1);
    console.log(`\nInserting Session 1 (Senior BDR): ${sessionId1}`);

    const row1 = {
      id: sessionId1,
      user_id: userId,
      session_data: sessionData1,
      job_description: sessionData1.jobDescription,
      target_role: sessionData1.targetRole,
      role_type: sessionData1.roleType,
      stage: sessionData1.stage,
      relevance_map: sessionData1.relevanceMap,
    };

    const { error: insertError1 } = await supabase.from("prep_sessions").insert(row1);

    if (insertError1) {
      const isSchemaCache = insertError1.message?.includes("schema cache");
      if (isSchemaCache) {
        const escapedJson = JSON.stringify(sessionData1).replace(/'/g, "''");
        const escapedRelMap = JSON.stringify(sessionData1.relevanceMap).replace(/'/g, "''");
        const sql = `INSERT INTO prep_sessions (id, user_id, session_data, job_description, target_role, role_type, stage, relevance_map)
VALUES (
  '${sessionId1}',
  '${userId}',
  '${escapedJson}'::jsonb,
  '${sessionData1.jobDescription.replace(/'/g, "''")}',
  '${sessionData1.targetRole}',
  '${sessionData1.roleType}',
  '${sessionData1.stage}',
  '${escapedRelMap}'::jsonb
)
ON CONFLICT (id) DO NOTHING;`;

        console.log("\n⚠  PostgREST schema cache is stale (doesn't know about session_data column).");
        console.log("   Fix: Go to Supabase Dashboard → Project Settings → API → click 'Reload Schema'");
        console.log("   Then re-run this script.\n");
        console.log("   OR paste this SQL directly in the Supabase SQL Editor:\n");
        console.log("─".repeat(60));
        console.log(sql);
        console.log("─".repeat(60));
        process.exit(0);
      }
      console.error("Insert failed (Session 1):", insertError1.message);
      process.exit(1);
    }

    results.push({ name: "Senior BDR — Recruiter Screen", id: sessionId1, url: `/prep/${sessionId1}` });
  }

  // ─── Session 2: HubSpot AE ────────────────────────────────────────────────
  if (!existingSession2) {
    const sessionId2 = crypto.randomUUID();
    const sessionData2 = buildSession2(sessionId2);
    console.log(`Inserting Session 2 (HubSpot AE): ${sessionId2}`);

    const row2 = {
      id: sessionId2,
      user_id: userId,
      session_data: sessionData2,
      job_description: sessionData2.jobDescription,
      target_role: sessionData2.targetRole,
      role_type: sessionData2.roleType,
      stage: sessionData2.stage,
      relevance_map: sessionData2.relevanceMap,
    };

    const { error: insertError2 } = await supabase.from("prep_sessions").insert(row2);

    if (insertError2) {
      const isSchemaCache = insertError2.message?.includes("schema cache");
      if (isSchemaCache) {
        const escapedJson = JSON.stringify(sessionData2).replace(/'/g, "''");
        const escapedRelMap = JSON.stringify(sessionData2.relevanceMap).replace(/'/g, "''");
        const sql = `INSERT INTO prep_sessions (id, user_id, session_data, job_description, target_role, role_type, stage, relevance_map)
VALUES (
  '${sessionId2}',
  '${userId}',
  '${escapedJson}'::jsonb,
  '${sessionData2.jobDescription.replace(/'/g, "''")}',
  '${sessionData2.targetRole}',
  '${sessionData2.roleType}',
  '${sessionData2.stage}',
  '${escapedRelMap}'::jsonb
)
ON CONFLICT (id) DO NOTHING;`;

        console.log("\n⚠  PostgREST schema cache is stale (doesn't know about session_data column).");
        console.log("   Fix: Go to Supabase Dashboard → Project Settings → API → click 'Reload Schema'");
        console.log("   Then re-run this script.\n");
        console.log("   OR paste this SQL directly in the Supabase SQL Editor:\n");
        console.log("─".repeat(60));
        console.log(sql);
        console.log("─".repeat(60));
        process.exit(0);
      }
      console.error("Insert failed (Session 2):", insertError2.message);
      process.exit(1);
    }

    results.push({ name: "HubSpot — Small Business AE", id: sessionId2, url: `/prep/${sessionId2}` });
  }

  // 4. Print summary
  console.log("\n✓ Sessions created successfully!\n");
  for (const r of results) {
    console.log(`  ${r.name}`);
    console.log(`    Session ID: ${r.id}`);
    console.log(`    URL: ${r.url}`);
    console.log("");
  }
  console.log(`  Total created: ${results.length}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
