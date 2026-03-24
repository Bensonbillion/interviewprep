/**
 * Seed Samsara knowledge bank with proprietary interview intelligence.
 * Generates OpenAI embeddings for each chunk so RAG retrieval works.
 *
 * Usage: npx tsx scripts/seed-samsara-knowledge.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

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
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !OPENAI_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENAI_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// ─── Embedding helper ────────────────────────────────────────────────────────

async function embed(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

// ─── Seed one document ───────────────────────────────────────────────────────

interface DocDef {
  title: string;
  description: string;
  category: string;
  tags: string[];
  chunks: Array<{ content: string; metadata: Record<string, string> }>;
}

async function seedDocument(doc: DocDef) {
  // Check if already exists
  const { data: existing } = await supabase
    .from("knowledge_sources")
    .select("id, title")
    .eq("title", doc.title)
    .maybeSingle();

  if (existing) {
    console.log(`  Skipping (exists): ${doc.title}`);
    return;
  }

  // Insert source
  const { data: source, error: sourceError } = await supabase
    .from("knowledge_sources")
    .insert({
      title: doc.title,
      description: doc.description,
      source_type: "text_paste",
      category: doc.category,
      tags: doc.tags,
      status: "processing",
      chunk_count: doc.chunks.length,
    })
    .select("id")
    .single();

  if (sourceError || !source) {
    console.error(`  Failed to insert source: ${doc.title}`, sourceError);
    return;
  }

  console.log(`  Source inserted: ${source.id}`);

  // Embed and insert chunks
  for (let i = 0; i < doc.chunks.length; i++) {
    const chunk = doc.chunks[i];
    process.stdout.write(`  Embedding chunk ${i + 1}/${doc.chunks.length}...`);

    const embedding = await embed(chunk.content);

    const { error: chunkError } = await supabase
      .from("admin_knowledge_chunks")
      .insert({
        source_id: source.id,
        content: chunk.content,
        chunk_index: i,
        embedding,
        metadata: chunk.metadata,
      });

    if (chunkError) {
      console.log(` FAILED: ${chunkError.message}`);
    } else {
      console.log(` done (${embedding.length} dims)`);
    }

    // Rate limit pause
    await new Promise((r) => setTimeout(r, 80));
  }

  // Mark as ready
  await supabase
    .from("knowledge_sources")
    .update({ status: "ready" })
    .eq("id", source.id);

  console.log(`  Ready: ${doc.chunks.length} chunks embedded`);
}

// ─── Knowledge documents ─────────────────────────────────────────────────────

const DOCS: DocDef[] = [
  // 1. Value Driver Framework
  {
    title: "Samsara Value Driver Framework - Complete",
    description: "Three Samsara value drivers with Before/After scenarios, negative consequences, positive business outcomes, required capabilities, and metrics.",
    category: "sales_methodology",
    tags: ["samsara", "value_drivers", "command_of_message", "fleet_safety", "interview_prep"],
    chunks: [
      {
        content: `SAMSARA VALUE DRIVER 01: REDUCE RISK

BEFORE SCENARIOS (how prospects describe current state):
- Pressure from leadership and insurers for more visibility and accountability into risk
- Time and money spent on accidents (investigations, legal review, audit prep, litigation) without ability to exonerate drivers
- Ineffective or lack of safety program - not identifying riskiest driver behaviors, not coaching drivers, short staffed
- Difficulty getting insurance; out of control liability costs
- Poor safety compliance - weak CSA scores, failed audits, expired driver qualifications

NEGATIVE CONSEQUENCES:
- Increased number and cost per accident (investigation time, legal fees, repair costs)
- Lawsuits or nuclear verdicts - accident over $10M, major liability, going out of business event
- Rising insurance premiums
- Customer retention and new customer acquisition impacted due to reputational issues
- Higher driver turnover

AFTER SCENARIOS (what success looks like):
- Reduction in accidents and accident severity
- Drivers alerted and coached in real-time for weather, distraction, speeding, risk zones
- Driver protection - get home safely, exoneration with video evidence
- Best-in-class safety program - positive, targeted, scalable without adding staff`,
        metadata: { company: "samsara", content_type: "value_driver", value_driver: "reduce_risk", section: "before_after_scenarios" },
      },
      {
        content: `SAMSARA VALUE DRIVER 01: REDUCE RISK (continued)

POSITIVE BUSINESS OUTCOMES:
- Reduce accident costs (legal settlements and fees, repair costs)
- Lower insurance premiums
- Save time (coaching, investigation, time to settlement)
- Improve driver retention (reduce hiring costs)
- Win new bids (more opportunities, higher win rates)

REQUIRED CAPABILITIES:
- Comprehensive safety platform (AI risk detection, automated coaching, risk insights, built-in recognition and reward programs)
- Safety expertise (installation, program design)
- Ongoing partnership and support (training, change management, hardware health checks, tech support)
- Proven track record of customer-driven innovation
- Easy-to-use driver app and dashboard with reliable hardware
- Comprehensive risk visibility (weather, pedestrians, day vs night, traffic conditions)
- Accurate alerts and data for driver experience (video, AI, real-time alerts)

METRICS THAT PROVE SUCCESS:
- Safety event rate improvement (mobile usage, distracted driving, drowsiness, severe speeding, seat belt use)
- AI breadth and accuracy (number of risks detected, accuracy percentage)
- Coaching effectiveness (percent events corrected in-cab, percent coached via self-coaching, manager-led coaching)
- Driver experience (percent accuracy of in-cab alerts, number positive behaviors recognized, driver CSAT)
- Customer support quality and completeness of safety solution`,
        metadata: { company: "samsara", content_type: "value_driver", value_driver: "reduce_risk", section: "outcomes_capabilities_metrics" },
      },
      {
        content: `SAMSARA VALUE DRIVER 02: INCREASE EFFICIENCY

BEFORE SCENARIOS:
- Inefficient or unauthorized fuel use (inefficient driving behavior, unnecessary idling, fuel theft)
- Inefficient maintenance practices (burdensome, unnecessary, reactive, or incomplete maintenance)
- Inability to recover lost and stolen assets
- Underutilized assets and unauthorized usage
- Disconnected legacy vendor systems - hard to aggregate data, delayed decision making

NEGATIVE CONSEQUENCES:
- Excessive fuel spend
- Increased maintenance and repair costs
- Higher asset replacement cost due to wear and tear
- Asset recovery and replacement cost
- Low asset utilization, higher capex spend
- Unnecessary spend on multiple technologies

AFTER SCENARIOS:
- Reduction in admin and driver workload/paperwork
- More efficient asset utilization
- Fewer lost or stolen assets and faster recovery time
- Data-driven maintenance schedules that reduce shop time
- Surfacing the most relevant data into actionable insights

POSITIVE BUSINESS OUTCOMES:
- Increase profit margins due to reduced operating expenses
- Reduce fuel spend (less idling, green-band driving, fewer miles)
- Reduce asset spend (longer asset life, fewer purchases)
- Reduce maintenance spend
- Consolidate technology vendor spend`,
        metadata: { company: "samsara", content_type: "value_driver", value_driver: "increase_efficiency", section: "before_after_scenarios" },
      },
      {
        content: `SAMSARA VALUE DRIVER 03: DIGITALLY TRANSFORM THE BUSINESS

BEFORE SCENARIOS:
- Inefficient back-office worker experience caused by multiple outdated, disconnected systems
- Inefficient driver experience (multiple apps, pen and paper DVIRs, duplicative data entry)
- Poor end-customer experience (lack of visibility, poor reporting, missed SLAs)
- Leaders don't have the right data to quickly make the right decisions
- Back office is stretched thin, always firefighting

NEGATIVE CONSEQUENCES:
- High driver turnover and increased hiring costs
- Missed SLAs or lost opportunities due to driver availability constraints
- Customer churn and losing bids
- Inaccurate and incomplete information resulting in business risk
- Inefficient, reactive back-office teams

AFTER SCENARIOS:
- Simplified driver workflows and experiences
- Great end-customer experience, reliable and modern brand
- Streamlined and automated back-office workflows
- Get the right answers quickly on complex questions
- All of the right data in a single system that integrates with other systems

POSITIVE BUSINESS OUTCOMES:
- Improve driver retention (reduce hiring costs)
- Consolidate technology vendor spend
- Improve end-customer experience (higher retention, win more business)
- Improve frontline worker efficiency
- Improve back-office worker efficiency`,
        metadata: { company: "samsara", content_type: "value_driver", value_driver: "digitally_transform", section: "before_after_scenarios" },
      },
    ],
  },

  // 2. Reduce Risk Proof Points
  {
    title: "Samsara Reduce Risk - Customer Proof Points",
    description: "Real customer case studies proving Samsara Reduce Risk value driver outcomes.",
    category: "company_research",
    tags: ["samsara", "proof_points", "reduce_risk", "case_studies", "interview_prep"],
    chunks: [
      {
        content: `SAMSARA REDUCE RISK PROOF POINTS

The Home Depot (US, Enterprise): 80% reduction in auto incidents over three years, 65% reduction in auto liability claims, 62% decrease in total claims costs. Deployed centralized Video-Based Safety program with AI-driven monitoring.

DHL (US, Enterprise): 65% decrease in harsh driving incidents, 49% reduction in accident-related costs, 50% decrease in driver turnover. Deployed AI Dash Cams with Drowsiness Detection and Lane Departure Warnings.

Primoris Services Corporation (US, Enterprise): 66% reduction in total safety events and $2M annual savings in insurance costs. AI Dash Cams with In-Cab Nudges across 8,000 vehicles and 25,000 assets.

ITF Group (US, Enterprise): $4.4M saved in insurance premiums by reducing risky behaviors by 50%. AI Dash Cams and unified platform across 2,000+ trucks and trailers.

TEAMS Transport (Canada, Enterprise): 63% reduction in Hours of Service violations and over $1M in insurance-related savings in a single year. AI Dash Cams and Samsara Driver App across 550 trailers, 230 trucks.

KEY STATISTICS:
- Samsara 2025 Safety Report: AI-enabled fleets reduce crash rates by nearly 75% over 30 months
- IDC 2024: Organizations using Samsara see 8x ROI and cut total fleet operating costs by 6% on average ($2M annual savings per organization)
- 50% of Samsara dash cam customers have used footage to exonerate drivers, saving $5K-$25K per incident`,
        metadata: { company: "samsara", content_type: "proof_points", value_driver: "reduce_risk", section: "customer_case_studies" },
      },
    ],
  },

  // 3. Trap-Setting Questions
  {
    title: "Samsara Trap-Setting Discovery Questions - Complete",
    description: "Trap-setting questions positioning Samsara defensible differentiators as buyer requirements.",
    category: "sales_methodology",
    tags: ["samsara", "trap_questions", "discovery", "command_of_message", "interview_prep", "role_play"],
    chunks: [
      {
        content: `SAMSARA TRAP-SETTING QUESTIONS: REAL-TIME AI COACHING

DIFFERENTIATOR: Real-time in-cab AI coaching versus event-triggered clip upload. Lytx and Motive only upload clips after G-force events. 80% of dangerous behaviors like drowsiness, distraction, and close following never trigger G-force.

TRAP 1: "Walk me through what happens right now when one of your drivers starts showing signs of fatigue at 2am. How quickly does your current system detect that and intervene?"
Exposes: Clip-only systems have zero pre-incident intervention. Locks in real-time detection as a requirement.

TRAP 2: "What percentage of your safety events would you estimate happen without any hard-braking or G-force trigger - things like distracted driving or drowsiness?"
Exposes: G-force triggered systems miss the majority of dangerous behaviors.

TRAP 3: "If your system could coach a driver in the exact moment they pick up their phone - before anything happens - versus reviewing that footage the next morning, what impact would that have on your incident rate?"
Gets buyer to articulate value of real-time coaching in their own words.

TRAP 4: "How many hours per week does your safety team spend reviewing video clips manually to identify coaching opportunities?"
Quantifies operational cost of clip-review systems versus AI-powered auto-triage.`,
        metadata: { company: "samsara", content_type: "trap_questions", differentiator: "real_time_coaching", interview_stage: "role_play" },
      },
      {
        content: `SAMSARA TRAP-SETTING QUESTIONS: UNIFIED PLATFORM

DIFFERENTIATOR: Natively integrated ELD plus cameras plus GPS on one platform. Competitors bolt on cameras to separate GPS or ELD systems creating data inconsistency.

TRAP 1: "When your dispatch team needs to cross-reference a driver's HOS status with a safety event and their real-time GPS location, how many different systems do they have to open?"
Exposes platform fragmentation. Buyer quantifies friction.

TRAP 2: "When you investigate an accident, can your current system show you - in one screen - the video footage, the driver's HOS status, the vehicle's exact speed, and the GPS location, all correlated together?"
Only Samsara's native integration provides cross-system correlation.

TRAP 3: "If you could eliminate the integration costs, separate contracts, and data silos from running separate GPS, camera, and ELD vendors - what would that save you annually?"
Gets CFO-minded buyer to calculate consolidation savings.

TRAP 4: "When you're reconstructing an incident for insurance or legal purposes - how long does it take to pull together footage, GPS data, driver hours, and vehicle diagnostics from all your systems into one coherent timeline?"
Quantifies operational cost and legal risk of disconnected systems.`,
        metadata: { company: "samsara", content_type: "trap_questions", differentiator: "unified_platform", interview_stage: "role_play" },
      },
      {
        content: `SAMSARA TRAP-SETTING QUESTIONS: BY PERSONA

SAFETY MANAGER / DIRECTOR OF SAFETY:
1. "What's your current CSA Unsafe Driving score, and how close are you to the FMCSA intervention threshold of 65%?" Opens: Samsara customers see 43% improvement in Unsafe Driving scores.
2. "When a plaintiff's attorney argues your company knew about a driver's risky behavior pattern but didn't intervene in real time - how do you defend against that in court?" Opens: Nuclear verdict fear. Positions real-time AI coaching as litigation defense.
3. "How are you currently demonstrating to your insurance carrier that you're proactively managing driver risk - not just documenting incidents?" Opens: Positions proactive AI coaching as an insurability requirement.

FLEET MANAGER / DIRECTOR OF FLEET OPERATIONS:
1. "How many different logins and dashboards does your team use daily to manage fleet operations?" Opens: Platform fragmentation cost.
2. "When a fault code fires on a vehicle, what's the process from detection to work order - automated or manual?" Opens: Samsara Fault Code Intelligence.
3. "How accurate are your customer ETAs right now?" Opens: Per-second GPS versus Verizon Connect's 30-second refresh.

VP OPERATIONS / COO:
1. "If you could see every vehicle, every piece of equipment, and every site from a single command center with AI surfacing only what needs your attention - how would that change your Monday morning meeting?" Opens: Connected Operations Platform vision.
2. "What would it mean for your competitive position if you could guarantee customers live, accurate ETAs while competitors work off delayed data?" Opens: Competitive advantage vision.`,
        metadata: { company: "samsara", content_type: "trap_questions", differentiator: "persona_specific", interview_stage: "role_play" },
      },
    ],
  },

  // 4. Discovery Talk Tracks
  {
    title: "Samsara Discovery Call Talk Tracks - Word for Word",
    description: "Word-for-word discovery call talk tracks for Samsara AE interviews including Safety Manager sequence and pain recap.",
    category: "sales_methodology",
    tags: ["samsara", "talk_tracks", "discovery", "command_of_message", "interview_prep", "role_play", "pain_quantification"],
    chunks: [
      {
        content: `SAMSARA DISCOVERY TALK TRACK: SAFETY MANAGER

Setup: 12 minutes into first call. Fleet: 200 trucks, long-haul. Currently on Lytx for cameras and Geotab for GPS/ELD.

YOU: "Thanks for walking me through your current setup. I want to make sure I understand the safety program side. When a risky driving event happens - say a driver is on their phone, or showing signs of drowsiness - walk me through the timeline from when it happens to when the driver gets coached."

PROSPECT: "Honestly, it's usually a few days. The event gets uploaded, our safety team reviews it the next day, and then they schedule coaching within 48-72 hours."

YOU: (Mirror) "...48 to 72 hours?"

PROSPECT: "Yeah. And by that point the driver barely remembers the event."

YOU: (Label) "It sounds like the delay is undermining the coaching effectiveness."

PROSPECT: "Exactly. The teachable moment is gone."

YOU: (Take notes visibly) "I want to capture that. Let me ask - of all the risky behaviors you'd want to catch, what percentage actually generate a G-force event that triggers the camera?"

PROSPECT: "Probably 20%? A driver on their phone doesn't trigger G-force. Drowsiness doesn't."

YOU: "So 80% of the most dangerous behaviors aren't being captured at all?"

PROSPECT: "When you put it that way... yeah, that's a problem."

YOU: (Consequence trap) "If one of those undetected behaviors leads to a serious accident, and your record shows the system never flagged it - how does that affect your defense in a liability claim?"

PROSPECT: "That's our nightmare scenario."

YOU: (Vision trap) "So it sounds like you need something that detects behaviors continuously, not just during G-force events, and coaches the driver in the moment. Is that a fair summary?"

PROSPECT: "That's exactly right."

THE TRAP IS SPRUNG: "Continuous AI detection with real-time coaching" is now a buyer-stated Required Capability.

COACHING NOTE: After every answer use the mirror (repeat last 2-3 words as a question), then the label ("it sounds like..."), then take visible notes.`,
        metadata: { company: "samsara", content_type: "talk_track", persona: "safety_manager", interview_stage: "role_play" },
      },
      {
        content: `SAMSARA DISCOVERY PAIN RECAP AND RECOMMENDATION TRANSITION

THE PAIN RECAP (Command of Message - use before ANY recommendation):

"Let me make sure I have this right before I say anything about what we do."

"You told me that [TECHNICAL PAIN - their specific words about what's broken today]."

"That's also creating [PERSONAL PAIN - how it affects their day and their goals specifically]."

"And when it compounds, you're looking at roughly [BUSINESS PAIN - dollar amount] annually. That's before you factor in the [ESCALATING RISK - nuclear verdict exposure / insurance non-renewal / leadership pressure]."

"Did I capture that correctly? Is there anything I missed?"

Wait for confirmation. Do NOT proceed until they confirm.

THE RECOMMENDATION TRANSITION:
"Based on everything you've shared with me today, my recommendation would be..."

CRITICAL NOTE FROM EVALUATOR:
Luke O'Connor specifically scores whether you: 1) Recap ALL pain threads - technical, personal, business. 2) Get explicit confirmation before recommending. 3) Use "my recommendation" language. 4) Don't skip any pain thread.

MULTI-THREADING CLOSE:
"This sounds like it touches more than just your safety program - who else in the organization is feeling this? Would it make sense to bring them into the next conversation?"

CHALLENGER 3Ts:
Teach: Lead with an industry insight they don't have. Example: "Nuclear verdicts in trucking have increased 300% since 2020."
Tailor: Adjust message per persona. Safety Manager = incidents, coaching, CSA. Fleet Manager = fuel, maintenance, uptime. VP Ops = transformation, single platform. CFO = hard-dollar ROI.
Take Control: Set concrete next steps. Bad: "Let me know what works." Good: "The right next step is to bring your VP Ops in. Can you connect me this week?"`,
        metadata: { company: "samsara", content_type: "talk_track", section: "pain_recap_and_transition", interview_stage: "role_play" },
      },
    ],
  },

  // 5. Interview Scoring Framework
  {
    title: "Samsara AE Interview Scoring Framework - Luke OConnor",
    description: "Exact scoring criteria for Samsara AE mock discovery call interviews. 7-category rubric with 5/5 descriptions and common mistakes.",
    category: "interview_guide",
    tags: ["samsara", "scoring_rubric", "hiring_manager", "mock_call", "interview_prep", "role_play"],
    chunks: [
      {
        content: `SAMSARA AE INTERVIEW SCORING FRAMEWORK

INTERVIEW FORMAT: 40 minutes total. 15 min behavioral, 5-10 min live account research (pick from 5 accounts), 10 min mock discovery call (grader plays prospect), 5-10 min debrief. Grader is FORTHCOMING - gives real answers to dig into.

EVALUATOR FOCUS (Luke O'Connor, Commercial Sales Manager):
1. Identifying risk of the deal early
2. Before/after scenarios (Command of Message)
3. Pain recap BEFORE solution recommendation
4. Using "my recommendation" language for transitions
5. Exploring 2nd and 3rd level pain beyond initial request
6. Challenger 3Ts: Teach, Tailor, Take Control
7. Expanding the scope of the opportunity

SCORING CATEGORIES:
1. INDUSTRY PAIN (HIGH): 5/5 = Expert-level insight with 2+ pain points tied to current events. Winning move: Open with Business Hypothesis.
2. PERSONA PAIN (HIGH): 5/5 = Deeply understands persona's day-to-day. Winning move: "What part of managing safety takes up more time than it should for you personally?"
3. ACTIVE LISTENING (HIGH): 5/5 = Consistently mirrors and builds on input. Winning move: Mirror, label, then probe after every answer.
4. CURRENT STATE (MEDIUM): 5/5 = Complete picture of tools, team, process. Winning move: "Walk me through your safety program today."
5. TECHNICAL PAIN (HIGH): 5/5 = Uncovers specific gap with 2-3 follow-ups. Winning move: "How long has that been the case? What happens when that fails?"
6. PERSONAL PAIN (HIGH): 5/5 = Connects gap to personal frustration. Winning move: "What does that mean for you personally?"
7. BUSINESS PAIN (HIGH): 5/5 = Gets dollar number on the table. Winning move: "What did your last significant accident cost?"

DISQUALIFYING MISTAKES: Pitching before completing discovery. Skipping pain recap. Using "let me show you" instead of "my recommendation would be." Not reaching Business Pain. Passive close.`,
        metadata: { company: "samsara", content_type: "scoring_rubric", section: "complete", interview_stage: "role_play" },
      },
    ],
  },

  // 6. Construction Fleet Context
  {
    title: "Construction Fleet Safety - Industry Context for Samsara",
    description: "Construction industry fleet safety context for Samsara AE interviews including typical pain points, compliance pressures, and proof points.",
    category: "company_research",
    tags: ["samsara", "construction", "fleet_safety", "industry_context", "interview_prep"],
    chunks: [
      {
        content: `CONSTRUCTION FLEET SAFETY: INDUSTRY CONTEXT

TYPICAL TECHNOLOGY STACK: Basic GPS tracker (often Verizon Connect or Motive), separate dash cam (often Lytx or basic event-triggered), paper DVIRs or basic digital DVIR app, spreadsheets for incident tracking, separate ELD for HOS compliance, no integration between systems (3 to 5 different logins).

SAFETY MANAGER DAILY REALITY: Reviews overnight incidents manually from multiple systems. Chases paper DVIR completion. Investigates incidents by pulling footage from one system, GPS from another, driver hours from a third. Spends 10-15 hours/week on manual coaching identification. Builds compliance reports manually. Can't prove which drivers are highest-risk before an incident.

COMPLIANCE PRESSURES 2025-2026: FMCSA CSA scoring overhaul consolidates 950+ violation groups into 116. Drug and Alcohol Clearinghouse mandates CDL revocations, fines up to $5,833. HOS violation penalties up to $16,000 each. Dual OSHA and DOT scrutiny for construction.

INSURANCE MARKET 2025-2026: Premiums risen 20%+ market-wide. Nuclear verdict frequency increasing (jury awards over $10M up 300% since 2020). Average trucking crash cost $16,500 before litigation. Average nuclear verdict $27.5M. Carriers pulling out of commercial fleet coverage. Telematics increasingly required for coverage.

SAMSARA CONSTRUCTION VERTICAL: #1 growth vertical (highest net new ACV for 6 consecutive quarters). OEM integrations: CAT, John Deere, Komatsu. HCSS integration. Asset Tags for unpowered equipment. Only platform managing vehicles + heavy equipment + unpowered assets in one system.

CONSTRUCTION PROOF POINTS: Emery Sapp and Sons - 25% reduction in at-fault accidents, 40% drop in DOT-reportable incidents. Fox Brothers - 86% reduction in mobile device usage, 78% reduction in collision risk. USIC - 90% decrease in distracted driving events within 24 hours, 75% reduction in drowsy-related accidents. Sterling Crane - 10,000+ hours saved, $3M in avoided maintenance costs. Rasmussen Group - $1.2M saved exonerating one driver.`,
        metadata: { company: "samsara", content_type: "industry_context", industry: "construction", interview_stage: "role_play" },
      },
    ],
  },

  // 7. Best Call Tool Cards
  {
    title: "Samsara Best Call Tool - All Persona Cards",
    description: "Complete Samsara Best Call Tool cards for Commercial and Enterprise segments with opening statements, discovery questions, pain categories, and proof points.",
    category: "sales_methodology",
    tags: ["samsara", "call_tool", "persona_cards", "discovery_questions", "interview_prep", "cold_call", "opening_statements"],
    chunks: [
      {
        content: `SAMSARA BEST CALL TOOL: COMMERCIAL SEGMENT

OPENING FORMULA: Grab Attention (personalized opener) + Benefit Statement ("Samsara gets your drivers home safely and protects your business.") + Hook ("I'm curious - are you open to sharing because [topic]?")

DISCOVERY QUESTIONS:
1. "Walk me through what you are using to track your vehicles and equipment and keep your drivers safe. How has your experience been? What would you like to change?"
2. "Tell me about the other types of equipment you have. How are you tracking those today?"
3. "How do you keep your insurance costs from going up?"

PAIN CATEGORIES: High Accident Costs, Operating Costs (fuel, maintenance), Administrative Overhead (too many systems), Complex Compliance (CSA scores), Poor Driver Retention, Office Headaches (paperwork).

COMMERCIAL PROOF POINTS: Mavis (68 vehicles) - 25% less idling, 20% fewer breakdowns, $56K insurance reduction. Taylor Distribution (65 vehicles) - 80% increase in equipment utilization, 12% fuel reduction.`,
        metadata: { company: "samsara", content_type: "call_tool", segment: "commercial", interview_stage: "role_play" },
      },
      {
        content: `SAMSARA BEST CALL TOOL: ENTERPRISE SEGMENT

OPENING FORMULA: "Do you have 5 minutes? I know nobody likes cold calls but I can share why I'm calling." + "Samsara identifies the gaps in your fleet operations and provides the data to quickly address them."

ENTERPRISE DISCOVERY QUESTIONS:
1. "Walk me through what you are using to track vehicles and equipment and keep drivers safe. What would you change?"
2. "Tell me about your existing fleet management and operations."
3. "Tell me about your incident investigation workflow. How long does it take?"
4. "What challenges within your fleet? What goals are you looking to accomplish?"
5. "What tools and systems don't work as well today?"
6. "How much has your insurance gone up?"

ENTERPRISE PAIN CATEGORIES: Limited Visibility (too many systems, lack of integration), Reduced Budget (insurance, accidents, waste), Ineffective Safety Programs (low coaching adoption, resource constraints).

ENTERPRISE PROOF POINTS: DJI (4.6K vehicles) - 40% decrease in total claims costs, $2M saved. Palmetto Services (2.9K assets) - 40% decrease in claims, $25K preventative maintenance savings. Estes Express Lines (100K trailers) - 40% increase in ETA predictability. USIC (100K+ technicians) - 49% reduction in accident-related costs.`,
        metadata: { company: "samsara", content_type: "call_tool", segment: "enterprise", interview_stage: "role_play" },
      },
    ],
  },

  // 8. Differentiators + The Mantra
  {
    title: "Samsara Differentiators and The Mantra Technique",
    description: "Samsara seven differentiators with customer value and defensibility. Plus Command of Message Mantra reinforcement technique.",
    category: "sales_methodology",
    tags: ["samsara", "differentiators", "the_mantra", "command_of_message", "competitive", "interview_prep"],
    chunks: [
      {
        content: `SAMSARA DIFFERENTIATORS (7)

1. MARKET-LEADER IN SAFETY (Unique): 73% crash rate reduction over 30 months. #1 G2 satisfaction. Trained on 220+ billion miles. Trap: "How important is it that AI models are trained on scenarios matching your fleet's conditions?"

2. BROADEST OPERATIONS PLATFORM (Unique): One platform for fleet, equipment, sites, drivers. Only platform natively managing vehicles + heavy equipment + unpowered assets + jobsites. Trap: "Do you have visibility into where your trailers, generators, or equipment are right now - or is that separate?"

3. EXCEPTIONAL SERVICE AND SUPPORT (Holistic): Regional support teams (not offshore), dedicated implementation, hardware health monitoring, proactive outreach.

4. SIMPLE FRONTLINE EXPERIENCE (Comparative): #1-rated driver app (4.77 stars). Highest rated vs all competitors. Trap: "What's the #1 complaint your drivers have about the technology they use daily?"

5. SCALE AND STABILITY (Holistic): Public company (IOT on NYSE), $1B+ ARR, highest R&D spend in category, 220+ billion miles training data.

6. INTEGRATIONS AND CUSTOMIZATION (Comparative): Open API included free with 350+ marketplace integrations. Competitors charge for API access. Trap: "How many integrations require custom middleware or paid API access?"

7. RELIABLE HARDWARE AND CONNECTIVITY (Comparative): Over-the-air firmware updates (no truck rolls). Hardware improves over time like a smartphone. Trap: "When your vendor releases new AI capabilities, is that automatic or does it require truck rolls?"`,
        metadata: { company: "samsara", content_type: "differentiators", section: "all_seven", interview_stage: "role_play" },
      },
      {
        content: `SAMSARA COMMAND OF MESSAGE: THE MANTRA TECHNIQUE

THE MANTRA: A living summary of the buyer's own words that evolves across every conversation. NOT an elevator pitch. Built from what the buyer told you.

MANTRA STRUCTURE: "Based on what you've shared, you're currently experiencing [negative consequences - their words]. You're looking to achieve [positive outcomes - their words]. To get there, you need [required capabilities - which are your differentiators]. Don't take my word for it - [proof point]."

HOW TO BUILD ACROSS CALLS:
Call 1 (Initial Discovery): Set 1-2 surface traps. Establish problem landscape. Plant seeds.
Call 2 (Deep Discovery): Deepen with consequence traps. Quantify pain. Introduce capability traps. Begin building Mantra.
Call 3 (Multi-Stakeholder): Replay trapped requirements. Set fresh traps for new personas.

HOW TO USE IN EACH PHASE:
Follow-Up Emails: "Per our conversation, the three capabilities you identified as non-negotiable are..."
Demos: Open each section with "You told us [trapped requirement] was essential. Here's how that works."
Proposals: Create "Your Requirements" section quoting buyer by name and date.
Negotiation: "We could reduce scope, but that would mean removing [trapped capability] - the one you identified as critical because [their consequence]. Is that a trade-off you're comfortable with?"

POST-TRAP DELIVERY:
1. Do NOT celebrate - buyer must not feel trapped
2. Mirror their last 2-3 words as a question
3. Label the emotion: "It sounds like that's been frustrating"
4. Take visible notes: "I want to capture that exactly right"
5. Go quiet - pause 3-5 seconds
6. Send summary email confirming trapped requirements in writing`,
        metadata: { company: "samsara", content_type: "sales_methodology", section: "the_mantra", interview_stage: "role_play" },
      },
    ],
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting Samsara knowledge bank seeding...");
  console.log(`Documents to seed: ${DOCS.length}\n`);

  let totalChunks = 0;

  for (const doc of DOCS) {
    console.log(`[${DOCS.indexOf(doc) + 1}/${DOCS.length}] ${doc.title}`);
    await seedDocument(doc);
    totalChunks += doc.chunks.length;
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n--- Complete ---`);
  console.log(`Documents: ${DOCS.length}`);
  console.log(`Total chunks: ${totalChunks}`);
  console.log(`\nVerify: SELECT title, status, chunk_count FROM knowledge_sources WHERE 'samsara' = ANY(tags);`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
