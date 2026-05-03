/**
 * Seed real interview questions extracted from actual interview transcripts
 * into the interview_questions_reported table.
 *
 * Usage: npx tsx scripts/seed-interview-questions.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
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
  console.error("Could not read .env.local");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Question definitions ────────────────────────────────────────────────────

interface QuestionDef {
  question_text: string;
  question_category:
    | "behavioral"
    | "situational"
    | "technical"
    | "roleplay"
    | "case_study"
    | "culture_fit"
    | "closing"
    | "curveball";
  interview_stage: string;
  was_expected: boolean;
  felt_prepared: boolean;
  company_name_normalized: string;
  role_type: string;
  is_verified: boolean;
  verification_count: number;
}

const QUESTIONS: QuestionDef[] = [
  // ─── Interview 1 — Senior BDR role, Recruiter screen, company unknown ──────
  {
    question_text:
      "Why are you looking to move on from your current role into a new role, and why this role specifically?",
    question_category: "behavioral",
    interview_stage: "recruiter",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "unknown",
    role_type: "sdr_bdr",
    is_verified: true,
    verification_count: 1,
  },
  {
    question_text:
      "How does your senior BDR role differ from a regular BDR? What's your day-to-day in the senior role?",
    question_category: "situational",
    interview_stage: "recruiter",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "unknown",
    role_type: "sdr_bdr",
    is_verified: true,
    verification_count: 1,
  },
  {
    question_text:
      "Walk me through some of the qualities that you possess that would make you a good candidate for this role.",
    question_category: "behavioral",
    interview_stage: "recruiter",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "unknown",
    role_type: "sdr_bdr",
    is_verified: true,
    verification_count: 1,
  },
  {
    question_text:
      "How do you keep yourself motivated? Obviously sales has highs and lows and not every day is a great day. So how do you keep yourself motivated through that?",
    question_category: "behavioral",
    interview_stage: "recruiter",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "unknown",
    role_type: "sdr_bdr",
    is_verified: true,
    verification_count: 1,
  },
  {
    question_text:
      "Walk me through a time that you were struggling to hit your numbers — a slow week or a slow month — and what you did to turn that around.",
    question_category: "behavioral",
    interview_stage: "recruiter",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "unknown",
    role_type: "sdr_bdr",
    is_verified: true,
    verification_count: 1,
  },
  {
    question_text:
      "How do you organize and prioritize your work on a day-to-day basis just to make sure everything's getting done, all your KPIs are being hit? Is there any tools that you use for that?",
    question_category: "situational",
    interview_stage: "recruiter",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "unknown",
    role_type: "sdr_bdr",
    is_verified: true,
    verification_count: 1,
  },

  // ─── Interview 2 — Small Business AE at HubSpot, Hiring Manager screen ────
  {
    question_text:
      "What has you looking for a new opportunity and why HubSpot?",
    question_category: "behavioral",
    interview_stage: "hiring_manager",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "hubspot",
    role_type: "account_executive",
    is_verified: true,
    verification_count: 1,
  },
  {
    question_text:
      "What part of the sales career most excites you and what are some of your career goals?",
    question_category: "behavioral",
    interview_stage: "hiring_manager",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "hubspot",
    role_type: "account_executive",
    is_verified: true,
    verification_count: 1,
  },
  {
    question_text:
      "Tell me more about your current position — more specifically what you're selling and who you're selling to.",
    question_category: "situational",
    interview_stage: "hiring_manager",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "hubspot",
    role_type: "account_executive",
    is_verified: true,
    verification_count: 1,
  },
  {
    question_text:
      "Are you more inbound or outbound? What does that split look like?",
    question_category: "situational",
    interview_stage: "hiring_manager",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "hubspot",
    role_type: "account_executive",
    is_verified: true,
    verification_count: 1,
  },
  {
    question_text:
      "Do you have a specific book of business that you're selling into?",
    question_category: "situational",
    interview_stage: "hiring_manager",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "hubspot",
    role_type: "account_executive",
    is_verified: true,
    verification_count: 1,
  },
  {
    question_text:
      "Once you close the deal, are you holding those accounts or passing them off to someone else?",
    question_category: "situational",
    interview_stage: "hiring_manager",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "hubspot",
    role_type: "account_executive",
    is_verified: true,
    verification_count: 1,
  },
  {
    question_text:
      "How much of your time do you feel like you're going after net new accounts versus handling account management issues?",
    question_category: "situational",
    interview_stage: "hiring_manager",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "hubspot",
    role_type: "account_executive",
    is_verified: true,
    verification_count: 1,
  },
  {
    question_text:
      "Walk me through your full sales process — from that initial cold call, what steps are you taking to get them across the finish line?",
    question_category: "behavioral",
    interview_stage: "hiring_manager",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "hubspot",
    role_type: "account_executive",
    is_verified: true,
    verification_count: 1,
  },
  {
    question_text:
      "How many deals are you closing on a monthly basis?",
    question_category: "situational",
    interview_stage: "hiring_manager",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "hubspot",
    role_type: "account_executive",
    is_verified: true,
    verification_count: 1,
  },
  {
    question_text:
      "Tell me more about your prospecting strategy — tools and methods you're using.",
    question_category: "situational",
    interview_stage: "hiring_manager",
    was_expected: true,
    felt_prepared: true,
    company_name_normalized: "hubspot",
    role_type: "account_executive",
    is_verified: true,
    verification_count: 1,
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting interview questions seeding...");
  console.log(`Questions to seed: ${QUESTIONS.length}\n`);

  let inserted = 0;
  let skipped = 0;

  for (const question of QUESTIONS) {
    // Check for existing question by matching question_text to avoid duplicates
    const { data: existing } = await supabase
      .from("interview_questions_reported")
      .select("id")
      .eq("question_text", question.question_text)
      .maybeSingle();

    if (existing) {
      console.log(`  Skipping (exists): "${question.question_text.slice(0, 60)}..."`);
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from("interview_questions_reported")
      .insert(question);

    if (error) {
      console.error(`  Failed to insert: "${question.question_text.slice(0, 60)}..."`, error.message);
    } else {
      console.log(`  Inserted: "${question.question_text.slice(0, 60)}..."`);
      inserted++;
    }
  }

  console.log(`\n--- Complete ---`);
  console.log(`Total questions: ${QUESTIONS.length}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (duplicates): ${skipped}`);
  console.log(
    `\nVerify: SELECT question_text, question_category, interview_stage, company_name_normalized FROM interview_questions_reported;`
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
