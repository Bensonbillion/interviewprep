/**
 * Seed a pre-built Samsara discovery mock call session for a specific user.
 *
 * Usage: npx tsx scripts/seed-samsara-session.ts
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
const INTERVIEWER_NAME = "Luke O'Connor";

// ─── Answer content ──────────────────────────────────────────────────────────

const DISCOVERY_HYPOTHESIS = JSON.stringify({
  hypothesis: "Because construction fleets still run reactive safety programs with disconnected systems, you may be dealing with incidents that cost more to investigate than prevent — and a leadership team that wants proof your program is working, not just reports after the fact.",
  valueDriver: "reduce_risk",
  deliveryNote: "Say this in the first 60 seconds. Deliver it calmly as a hypothesis to check, not a pitch. Pause after and let them react to it.",
  backupHypothesis: "Because field fleets have limited visibility into driver behavior day to day, you may be spending significant time on reactive investigation when you would rather be preventing incidents.",
});

const DISCOVERY_QUESTIONS_TECHNICAL = JSON.stringify([
  {
    layer: "technical",
    question: "Walk me through what happens when a safety event occurs — from the moment it happens to when the driver gets coached. What does that timeline look like?",
    listenFor: "Days of delay, manual footage review, how they identify who to coach",
    followUp: "So between when the event happens and coaching — what is the gap? How effective is coaching three days after the fact?",
    trapOpportunity: "Opens the real-time coaching trap",
  },
  {
    layer: "technical",
    question: "What systems are you using today to track driver behavior and identify safety risks? Are those integrated or are you toggling between platforms?",
    listenFor: "Disconnected systems, manual reconciliation, data inconsistency",
    followUp: "When you investigate an incident, how many different systems do you open to get the full picture?",
    trapOpportunity: "Opens the unified platform trap",
  },
  {
    layer: "technical",
    question: "When you need footage from an incident, how quickly can you pull it — and do you get the full context or just a clip around the trigger?",
    listenFor: "Upload delays, clip-only systems, missing context before the event",
    followUp: "If you needed footage from the ten minutes before a collision, not just the impact, how would you get that today?",
    trapOpportunity: "Opens live video streaming trap",
  },
  {
    layer: "technical",
    question: "How do you handle driver qualification files and compliance tracking — is that digital or are you still managing paper?",
    listenFor: "Paper-based, manual processes, audit vulnerability",
    followUp: "If FMCSA showed up tomorrow for an audit, how long would it take to pull all your DQFs together?",
    trapOpportunity: null,
  },
]);

const DISCOVERY_QUESTIONS_PERSONAL = JSON.stringify([
  {
    layer: "personal",
    question: "What part of managing safety takes up more time than it should for you personally?",
    listenFor: "Manual video review, building reports, chasing compliance paperwork, incident investigation",
    followUp: "How much time per week goes into that? If you got it back, what would you do with it?",
    trapOpportunity: null,
  },
  {
    layer: "personal",
    question: "When something goes wrong on the road — a collision, a close call — what does that first hour look like for you?",
    listenFor: "Scrambling for footage, manual documentation, notifying leadership",
    followUp: "What would your ideal first hour look like if you had everything you needed in one place?",
    trapOpportunity: "Opens real-time visibility trap",
  },
  {
    layer: "personal",
    question: "How confident are you that your coaching is reaching the highest-risk drivers? Is there a chance your team is focusing on the wrong people?",
    listenFor: "Guesswork, reactive prioritization, arbitrary coaching decisions",
    followUp: "What would it mean for your program if you could guarantee you were coaching the right drivers every time?",
    trapOpportunity: "Opens AI risk prioritization",
  },
  {
    layer: "personal",
    question: "How does leadership evaluate your safety program? What metrics are they asking for — and how easy is it to pull those together?",
    listenFor: "Lagging indicators, manual report building, inability to show proactive prevention",
    followUp: "So you are essentially being measured on outcomes you cannot fully control with current tools. Does that feel like a fair setup?",
    trapOpportunity: null,
  },
]);

const DISCOVERY_QUESTIONS_BUSINESS = JSON.stringify([
  {
    layer: "business",
    question: "What did your last significant accident cost — investigation time, legal fees, repair, and insurance impact?",
    listenFor: "Specific dollar amounts, lawyer involvement, insurance renewal pressure",
    followUp: "And since that incident, how has your insurance premium moved at renewal?",
    trapOpportunity: null,
  },
  {
    layer: "business",
    question: "If you are spending that many hours a week on manual safety processes, what does that add up to across your team over a year?",
    listenFor: "Calculate together: hours times people times hourly rate equals annual cost",
    followUp: "So conservatively you are looking at that much just in labor on manual processes. Does that track?",
    trapOpportunity: null,
  },
  {
    layer: "business",
    question: "Is leadership starting to ask harder questions about liability exposure and what your safety program can actually prove?",
    listenFor: "Nuclear verdict awareness, insurance carrier pressure, board-level scrutiny",
    followUp: "Nuclear verdicts — jury awards over $10M — have become more common in trucking. Has that conversation come up internally?",
    trapOpportunity: null,
  },
  {
    layer: "business",
    question: "If you could reduce preventable accidents by 30% next year, what would that mean for your insurance renewal and liability exposure?",
    listenFor: "They calculate the value themselves — this is the PBO moment",
    followUp: "And what would that do for your safety program's credibility with leadership?",
    trapOpportunity: null,
  },
]);

const DISCOVERY_TRAP_QUESTIONS = JSON.stringify([
  {
    question: "When one of your drivers is showing fatigue signs at 2am — how does your current system detect that and respond?",
    trapsFor: "Real-time in-cab AI coaching versus event-triggered clip upload",
    targetedCompetitor: "Lytx and Motive clip-only systems",
    sprangAnswer: "We find out the next morning when we review the footage. By then the driver is already off the road.",
    reuseInRecap: "You mentioned your system only captures events after the fact — so you cannot intervene before an incident, only document after. That gap is at the core of what we would address.",
  },
  {
    question: "When you investigate an incident, how many different systems do you have to open to get the full picture — footage, location, driver hours, vehicle diagnostics?",
    trapsFor: "Natively integrated platform versus bolted-on point solutions",
    targetedCompetitor: "Geotab plus Lytx, separate ELD and GPS systems",
    sprangAnswer: "Usually three or four different logins. And the data does not always line up between them.",
    reuseInRecap: "You described reconciling data from multiple systems to investigate a single incident. That inconsistency creates operational friction and legal exposure.",
  },
  {
    question: "What percentage of your safety events happen without any hard-braking or G-force trigger — things like distracted driving, drowsiness, or following too close?",
    trapsFor: "Continuous AI monitoring versus G-force triggered systems",
    targetedCompetitor: "Event-triggered camera systems",
    sprangAnswer: "Honestly, probably most of them. A driver on their phone does not trigger the camera.",
    reuseInRecap: "So the majority of your highest-risk behaviors are completely invisible to your current system. That is a significant gap.",
  },
]);

const DISCOVERY_SCORING_GUIDE = JSON.stringify({
  categories: [
    {
      name: "Industry Pain",
      weight: "high",
      fiveOutOfFive: "References 2+ specific construction fleet pain points with data — nuclear verdicts, insurance increases, CSA score changes — before the call starts",
      threeOutOfFive: "Shows general safety awareness without construction-specific context",
      commonMistake: "Treating it like a generic sales call instead of a construction fleet conversation",
      winningMove: "Open with business hypothesis: Because construction fleets face reactive safety models, you may be experiencing...",
    },
    {
      name: "Persona Pain",
      weight: "high",
      fiveOutOfFive: "Shows deep understanding of Safety Manager daily reality — incident timeline, coaching workflow, leadership reporting pressure",
      threeOutOfFive: "Asks about safety generally without connecting to the persona role",
      commonMistake: "Asking generic questions instead of persona-specific ones",
      winningMove: "Ask about their personal time: What part of managing safety takes up more time than it should for you personally?",
    },
    {
      name: "Active Listening",
      weight: "high",
      fiveOutOfFive: "Reflects back every answer before asking the next question. Uses mirroring. Say more about that after every answer.",
      threeOutOfFive: "Listens but jumps to next question without acknowledging the answer",
      commonMistake: "Moving to the next scripted question instead of following the thread",
      winningMove: "After every answer: say more about that — what does that mean for your team?",
    },
    {
      name: "Current State",
      weight: "medium",
      fiveOutOfFive: "Complete picture: team size, tools, coaching process, incident response timeline, compliance workflow",
      threeOutOfFive: "Gets tool names but not process depth or team context",
      commonMistake: "Skipping current state to get to pain faster",
      winningMove: "Walk me through your safety program today — how big is your team and who owns it?",
    },
    {
      name: "Technical Pain",
      weight: "high",
      fiveOutOfFive: "Uncovers one specific technical gap, asks 2-3 follow-ups to probe duration and consequence, gets them to describe disruption",
      threeOutOfFive: "Identifies a gap but does not probe further",
      commonMistake: "Moving on after surface-level technical answer",
      winningMove: "When they mention a gap: how long has that been the case? What happens when that fails?",
    },
    {
      name: "Personal Pain",
      weight: "high",
      fiveOutOfFive: "Connects technical gap to their personal frustration and daily burden. Gets them to describe how it blocks their goals.",
      threeOutOfFive: "Asks about personal pain but stays at surface level",
      commonMistake: "Skipping personal pain to get to business numbers faster",
      winningMove: "What part of this takes up more time than it should for you personally?",
    },
    {
      name: "Business Pain",
      weight: "high",
      fiveOutOfFive: "Gets a dollar number on the table. Calculates cost of inaction. Gets them to state the annual cost themselves.",
      threeOutOfFive: "Mentions cost impact without quantifying",
      commonMistake: "Ending discovery without a number",
      winningMove: "What did your last significant accident cost — investigation, legal, repair, insurance impact?",
    },
  ],
  painRecapScript: "So let me make sure I have this right before I say anything about what we do. You told me that [TECHNICAL PAIN — their specific gap]. That is also creating [PERSONAL PAIN — their frustration and time cost]. And when it compounds, you are looking at roughly [BUSINESS PAIN — dollar amount] annually. Plus the [ESCALATING RISK — insurance, legal, leadership pressure]. Did I capture that correctly?",
  recommendationTransition: "Based on everything you have shared with me today, my recommendation would be...",
  multithreadingClose: "This sounds like it touches more than just your team — who else in the organization feels this? Would it make sense to bring them into the next conversation so we can look at this across the whole operation?",
});

const DISCOVERY_PAIN_RECAP = JSON.stringify({
  recapTemplate: "So before I say anything about what we do — let me make sure I captured this.\n\nYou told me [TECHNICAL PAIN — their exact words about what is broken today].\n\nThat is also meaning [PERSONAL PAIN — how it affects their day and goals].\n\nAnd when you add that up — [QUANTIFIED COST: hours times labor plus incidents times average cost plus insurance increase] — you are looking at roughly [TOTAL DOLLAR AMOUNT] annually. That is before you factor in the [ESCALATING RISK].\n\nDid I capture that correctly?",
  confirmationQuestion: "Did I capture that correctly? Is there anything I missed or anything you would add?",
  recommendationBridge: "Based on everything you have shared with me today, my recommendation would be...",
  scopeExpansionPrompt: "It sounds like this touches more than just your safety program — there is a fleet operations angle and a financial angle here too. Who else in the organization is feeling this? Would it make sense to bring them in so we look at the full picture?",
  coachingNote: "Luke O'Connor specifically evaluates whether you recap before recommending. Do not skip this. Do not rush it. Say every pain thread out loud. Get confirmation. Then use the exact phrase: based on everything you have shared, my recommendation would be. This is the moment that separates AEs from SDRs in his scorecard.",
});

// ─── Answer slots ────────────────────────────────────────────────────────────

interface SlotDef {
  type: string;
  label: string;
  description: string;
  content: string;
}

const SLOT_DEFS: SlotDef[] = [
  {
    type: "discovery_hypothesis",
    label: "Business Hypothesis",
    description: "Your opening statement — a single sentence that frames the entire discovery call around a specific business pain.",
    content: DISCOVERY_HYPOTHESIS,
  },
  {
    type: "discovery_questions_technical",
    label: "Technical Discovery Questions",
    description: "Questions that uncover current state, tools, and process gaps — the surface layer of the Iceberg Framework.",
    content: DISCOVERY_QUESTIONS_TECHNICAL,
  },
  {
    type: "discovery_questions_personal",
    label: "Personal Discovery Questions",
    description: "Questions that make the pain personal — daily frustrations, time waste, and individual burden.",
    content: DISCOVERY_QUESTIONS_PERSONAL,
  },
  {
    type: "discovery_questions_business",
    label: "Business Discovery Questions",
    description: "Questions that quantify pain in dollars — cost of the status quo, leadership pressure, liability exposure.",
    content: DISCOVERY_QUESTIONS_BUSINESS,
  },
  {
    type: "discovery_trap_questions",
    label: "Trap Questions",
    description: "Discovery questions that position defensible differentiators as buyer requirements before competitors can claim alternatives.",
    content: DISCOVERY_TRAP_QUESTIONS,
  },
  {
    type: "discovery_scoring_guide",
    label: "Scoring Guide",
    description: "How you'll be evaluated — the 7 scoring categories, what excellence looks like, and the winning moves for each.",
    content: DISCOVERY_SCORING_GUIDE,
  },
  {
    type: "discovery_pain_recap",
    label: "Pain Recap Template",
    description: "The most critical moment in discovery — how to recap all pain threads and transition to your recommendation.",
    content: DISCOVERY_PAIN_RECAP,
  },
];

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

  // 2. Check if session already exists (session_data may not be in schema cache)
  let existingId: string | null = null;
  try {
    const { data: existing } = await supabase
      .from("prep_sessions")
      .select("id, session_data")
      .eq("user_id", userId);

    const match = existing?.find((row: { session_data?: Record<string, unknown> | null }) => {
      const sd = row.session_data;
      return sd && sd.companyName === "Samsara" && sd.mockCallType === "discovery";
    });
    if (match) existingId = match.id;
  } catch {
    // session_data column may not be in schema cache — skip check
    console.log("  (Could not check existing sessions — schema cache may be stale)");
  }

  if (existingId) {
    console.log(`Session already exists: ${existingId}`);
    console.log(`URL: /prep/${existingId}`);
    return;
  }

  // 3. Build session_data
  const sessionId = crypto.randomUUID();

  const answerSlots = SLOT_DEFS.map((def) => ({
    type: def.type,
    label: def.label,
    description: def.description,
    status: "unlocked",
    content: def.content,
  }));

  // Add cheat_sheet as locked (can be generated later)
  answerSlots.push({
    type: "cheat_sheet",
    label: "Stage Cheat Sheet",
    description: "Key points, company facts, strongest story, and the critical tip for this specific interview stage.",
    status: "locked",
    content: "",
  });

  const sessionData = {
    id: sessionId,
    companyName: "Samsara",
    companyUrl: "https://www.samsara.com",
    targetRole: "Account Executive",
    roleType: "account_executive",
    stage: "role_play",
    mockCallType: "discovery",
    mockCallPersona: "safety_manager",
    createdAt: Date.now(),
    jobDescription: "Account Executive — Commercial Sales at Samsara. Deep discovery mock call with Command of the Message framework evaluation.",
    resume: {
      rawText: "",
      personalInfo: { name: user.user_metadata?.full_name ?? "Candidate" },
      roles: [],
      skills: [],
      backgroundType: "experienced_sales",
      narrativeSummary: "Experienced sales professional preparing for Samsara AE interview.",
    },
    company: {
      name: "Samsara",
      productDescription: "Connected operations cloud platform for fleet management — AI-powered video safety, vehicle telematics, ELD compliance, equipment monitoring, and site visibility across a single platform.",
      icp: {
        companySizes: ["mid-market", "enterprise"],
        industries: ["transportation", "construction", "field services", "utilities", "food & beverage"],
        buyerPersonas: ["VP Operations", "Safety Director", "Fleet Manager", "CFO"],
      },
      salesMotion: "outbound",
      competitors: ["Lytx", "Motive (KeepTruckin)", "Geotab", "Verizon Connect", "Azuga", "Teletrac Navman"],
      techStack: ["Connected Operations Cloud", "AI Dash Cams", "Vehicle Gateway", "ELD", "DVIR", "Equipment Monitoring"],
      stage: "public",
      recentNews: [
        "2025 Safety Report: 73% crash rate reduction across 2600+ fleets",
        "IDC 2024: Customers cut fleet operating costs 6% on average ($2M annual savings per org)",
        "Construction is #1 growth vertical — highest net new ACV for 6 consecutive quarters",
      ],
      cultureSignals: [
        "Force Management Command of the Message framework company-wide",
        "Challenger Sale methodology (Teach, Tailor, Take Control)",
        "Three value drivers: Reduce Risk, Increase Efficiency, Digitally Transform The Business",
      ],
    },
    relevanceMap: {
      strongMatches: [],
      gaps: [],
      leadStories: [],
    },
    answerSlots,
    interviewers: [
      {
        name: INTERVIEWER_NAME,
        roleTitle: "Commercial Sales Manager",
        linkedinUrl: "",
      },
    ],
    personalContext: `Interviewer: ${INTERVIEWER_NAME}, Commercial Sales Manager at Samsara. Key evaluation focus areas: identify deal risk early, before and after scenarios (Command of Message), pain recap before solution recommendation, my recommendation language for solution transitions, exploring 2nd and 3rd level pain beyond initial request, Challenger 3Ts (Teach, Tailor, Take Control), expanding scope of opportunity. Grader is forthcoming and gives real answers to dig into. Scoring rubric: 7 categories — Industry Pain, Persona Pain, Active Listening, Current State, Technical Pain, Personal Pain, Business Pain.\n\nAccount: Construction company assigned day-of, likely Stqoya Construction or similar. Construction fleets: paper DVIRs, reactive incident investigation, 3+ disconnected systems, rising insurance premiums (20%+ market-wide), CSA score scrutiny, nuclear verdict exposure ($27.5M average jury award). Primary value driver: Reduce Risk. Secondary: Increase Efficiency.`,
  };

  // 4. Insert into prep_sessions
  //    Try supabase client first; if PostgREST schema cache is stale
  //    (doesn't know about session_data column), fall back to generating
  //    SQL for manual execution.
  console.log(`Inserting session: ${sessionId}`);

  const row = {
    id: sessionId,
    user_id: userId,
    session_data: sessionData,
    job_description: sessionData.jobDescription,
    target_role: sessionData.targetRole,
    role_type: sessionData.roleType,
    stage: sessionData.stage,
    relevance_map: sessionData.relevanceMap,
  };

  const { error: insertError } = await supabase.from("prep_sessions").insert(row);

  if (insertError) {
    const isSchemaCache = insertError.message?.includes("schema cache");
    if (isSchemaCache) {
      // PostgREST schema cache doesn't know about session_data column.
      // Generate SQL for manual execution in Supabase SQL Editor.
      const escapedJson = JSON.stringify(sessionData).replace(/'/g, "''");
      const escapedRelMap = JSON.stringify(sessionData.relevanceMap).replace(/'/g, "''");
      const sql = `INSERT INTO prep_sessions (id, user_id, session_data, job_description, target_role, role_type, stage, relevance_map)
VALUES (
  '${sessionId}',
  '${userId}',
  '${escapedJson}'::jsonb,
  '${sessionData.jobDescription.replace(/'/g, "''")}',
  '${sessionData.targetRole}',
  '${sessionData.roleType}',
  '${sessionData.stage}',
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
      console.log(`\n  Session ID: ${sessionId}`);
      console.log(`  URL: /prep/${sessionId}`);
      process.exit(0);
    }
    console.error("Insert failed:", insertError.message);
    process.exit(1);
  }

  console.log("\n✓ Session created successfully!");
  console.log(`  Session ID: ${sessionId}`);
  console.log(`  URL: /prep/${sessionId}`);
  console.log(`  Company: Samsara`);
  console.log(`  Stage: role_play (discovery)`);
  console.log(`  Persona: safety_manager`);
  console.log(`  Interviewer: ${INTERVIEWER_NAME}`);
  console.log(`  Answer slots: ${answerSlots.length} (${SLOT_DEFS.length} unlocked + 1 locked)`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
