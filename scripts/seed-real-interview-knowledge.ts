/**
 * Seed real-world interview answer examples as knowledge documents.
 * Generates OpenAI embeddings for each chunk so RAG retrieval works.
 *
 * Usage: npx tsx scripts/seed-real-interview-knowledge.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
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
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !OPENAI_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, or OPENAI_API_KEY");
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
  // 1. Real Interview Patterns — BDR/SDR Recruiter Screen
  {
    title: "Real Interview Patterns — BDR/SDR Recruiter Screen",
    description: "Authentic recruiter screen patterns for BDR/SDR roles including question flow, candidate response examples, and interviewer evaluation signals.",
    category: "interview_guide",
    tags: ["real_interview", "recruiter", "sdr_bdr", "question_patterns", "interview_prep"],
    chunks: [
      {
        content: `REAL BDR/SDR RECRUITER SCREEN — QUESTION FLOW

Based on real interview data, recruiter screens for BDR/SDR roles follow a consistent pattern:

OPENING BLOCK (first 5 minutes):
1. Brief company/role overview from recruiter
2. "Why are you looking to move on?" + "Why this role specifically?" (often combined)

EXPERIENCE VALIDATION (next 10 minutes):
3. "How does your current role differ from a standard BDR?" / "Walk me through your day-to-day"
4. "What qualities make you a good candidate for this role?"

BEHAVIORAL/SITUATIONAL (next 10 minutes):
5. "How do you stay motivated through the highs and lows?"
6. "Tell me about a time you were struggling to hit numbers — what did you do?"
7. "How do you organize and prioritize your day-to-day work?"

CANDIDATE QUESTIONS (final 5-10 minutes):
8. Candidate asks about culture, growth, comp structure, onboarding

KEY INTERVIEWER SIGNALS:
- Recruiter is screening for: energy, communication clarity, motivation authenticity, basic sales acumen
- Red flags they watch for: badmouthing current employer, vague metrics, no questions prepared
- Green flags: specific numbers, honest self-awareness, genuine curiosity about the role`,
        metadata: { content_type: "interview_pattern", role_type: "sdr_bdr", interview_stage: "recruiter", section: "question_flow" },
      },
      {
        content: `REAL ANSWER EXAMPLE — "How do you keep yourself motivated?"
Role: Senior BDR | Stage: Recruiter Screen

WHAT THE CANDIDATE ACTUALLY SAID:
"I have a note in front of me that says 'no one's coming to save you.' At the end of the day, no one's going to save you, and I truly believe that. I'm a very competitive person — I hate losing more than I like winning. I never want to be at the bottom of the dashboard. The money also motivates me — I'm a spender, I calculate my commission before I even get it and probably already spend it before the commission hits. So I wake up and I'm like, yeah, I have to make my calls and try to get some meetings today. I don't focus too much on KPIs — I focus on my quota. Rather than 'I have to make 50 calls a day,' it's more like 'I need to book a meeting today.' So if that takes 50 calls, 60 calls, I'm gonna push myself. Each day you need to come in and make sure you're having a better day than yesterday."

WHY THIS WORKS:
- Opens with a specific, personal detail (the note) — immediately authentic
- Admits to being a spender — vulnerable, not polished
- Reframes KPIs into outcome focus (quota > activity metrics) — shows strategic thinking
- "I hate losing more than I like winning" — memorable, quotable line
- No corporate buzzwords, no "I'm passionate about sales"

AUTHENTICITY MARKERS:
- Personal physical artifact (note on desk)
- Self-deprecating humor about spending habits
- Specific reframe (quota focus vs KPI focus)
- Raw competitive language`,
        metadata: { content_type: "golden_example", answer_type: "behavioral_star", role_type: "sdr_bdr", interview_stage: "recruiter", topic: "motivation" },
      },
      {
        content: `REAL ANSWER EXAMPLE — "Walk me through a time you were struggling to hit numbers"
Role: Senior BDR | Stage: Recruiter Screen

WHAT THE CANDIDATE ACTUALLY SAID:
"The first thing is getting feedback and understanding what's working. We work with different industries — transportation, construction, field services. I go back to scratch and look at the dashboard to see what meetings are being booked. Is it construction? Is it transportation? That gives me an idea of what to focus on because if construction is booking more right now, maybe summer's coming, they have free time before things ramp up. So first it's going back to basics — understanding which buying periods are happening. Second, just ramping up the numbers — doing 100%, 110% of what you usually do. If that means making 10 extra calls a day, sending more emails, figuring out how to increase talk time. And at the end of the day, it is somewhat of a team sport — you lean on your peers for feedback. What are you seeing? What objections are you getting? Because sometimes we get into this zone where things are automated in our brains and we might be doing something we wouldn't normally do because it feels easy."

WHY THIS WORKS:
- Starts with process (feedback first, not just 'grind harder')
- Shows industry awareness and seasonal buying patterns
- Combines effort increase WITH strategic pivoting
- Acknowledges team collaboration without losing individual ownership
- Self-aware about autopilot habits — shows growth mindset

AUTHENTICITY MARKERS:
- Industry-specific seasonal knowledge (construction buying cycles)
- Dashboard-first approach shows data-driven habits
- "Automated in our brains" — genuine insight about complacency
- Balance of strategy + effort (not just one or the other)`,
        metadata: { content_type: "golden_example", answer_type: "behavioral_star", role_type: "sdr_bdr", interview_stage: "recruiter", topic: "overcoming_slump" },
      },
    ],
  },

  // 2. Real Interview Patterns — AE Hiring Manager Screen
  {
    title: "Real Interview Patterns — AE Hiring Manager Screen",
    description: "Authentic hiring manager screen patterns for Account Executive roles including full sales process walkthrough, prospecting strategy, and deal mechanics.",
    category: "interview_guide",
    tags: ["real_interview", "hiring_manager", "account_executive", "question_patterns", "interview_prep"],
    chunks: [
      {
        content: `REAL AE HIRING MANAGER SCREEN — QUESTION FLOW

Based on real interview data, hiring manager screens for AE roles follow a deep-dive pattern:

ROLE OVERVIEW + FIT (first 10 minutes):
1. Hiring manager explains role details: territory, quota, deal size, sales cycle, comp
2. "Does this level of outbound activity align with what you're accustomed to?"
3. Comp discussion — base, variable, OTE, equity

MOTIVATION + CAREER (next 5 minutes):
4. "What has you looking for a new opportunity and why us?"
5. "What part of sales excites you most? What are your career goals?"

CURRENT ROLE DEEP DIVE (next 15 minutes):
6. "Tell me about your current position — what you're selling and who you're selling to"
7. "Inbound vs outbound split?"
8. "Do you have a specific book of business?"
9. "Holding accounts after close or passing off?"
10. "Net new vs account management time split?"

SALES PROCESS + METRICS (next 10 minutes):
11. "Walk me through your full sales process — cold call to close"
12. "How many deals closing monthly?"
13. "Tell me about your prospecting strategy — tools and methods"

KEY HIRING MANAGER SIGNALS:
- HM is evaluating: can this person run a full sales cycle independently?
- Deep dive into process shows they want to see structured thinking, not just activity
- They're comparing your current metrics to their role's requirements
- Asking about account management tests whether you understand hunter vs farmer roles`,
        metadata: { content_type: "interview_pattern", role_type: "account_executive", interview_stage: "hiring_manager", section: "question_flow" },
      },
      {
        content: `REAL ANSWER EXAMPLE — "Walk me through your full sales process"
Role: Commercial AE | Stage: Hiring Manager Screen

WHAT THE CANDIDATE ACTUALLY SAID:
"From the cold call, we usually book them into a discovery meeting. In discovery, we use Command of the Message — we're looking to find the business pain, the technical pain, and the personal pain. Then we go into demoing the product. Some accounts, depending on company size, we do a two-week trial where we send one or two units to test on different vehicles because we sell hardware. We send out a couple units for them to test for about two weeks and then use that to create a business case — a before-and-after scenario that helps us create a proposal for the close. Our average deal cycle is somewhere around 5 to 12 weeks."

WHY THIS WORKS:
- Clear linear process: cold call → discovery → demo → trial → proposal → close
- Names specific methodology (Command of the Message) — shows formal training
- Explains the three pain types without being asked — shows depth
- Hardware trial is a unique detail that proves real experience
- "Before-and-after scenario" shows value selling, not feature dumping
- Includes deal cycle metric naturally

AUTHENTICITY MARKERS:
- Named sales methodology with correct terminology
- Industry-specific detail (hardware trial with vehicle units)
- Specific deal cycle range (not round numbers)
- Business case / before-after language shows consultative approach`,
        metadata: { content_type: "golden_example", answer_type: "behavioral_star", role_type: "account_executive", interview_stage: "hiring_manager", topic: "sales_process" },
      },
      {
        content: `REAL ANSWER EXAMPLE — "Tell me about your prospecting strategy"
Role: Commercial AE | Stage: Hiring Manager Screen

WHAT THE CANDIDATE ACTUALLY SAID:
"First thing I'm trying to do is make the account as warm as possible. Going deep into previous closed-lost deals, last conversations, going into their websites, understanding what kind of vehicles and equipment they have. Going on LinkedIn to see who the personas are, matching that with ZoomInfo for contact info. I'm also multithreading — talking to below-the-line people before going above the line to get a better sense of what tools they're using, what issues those people have. That way I can bring that up to the people above the line and make that first call as warm as possible. For finding accounts, I go to the account pool — looking at accounts that were closed-lost in the past year where maybe it was a timing issue or a feature gap we've since fixed. I also use AI — if I find a great account in my persona, I use AI to model more accounts that are similar, which gives me a list I can go check if anyone's working."

WHY THIS WORKS:
- Multi-step, structured approach (not just "I make cold calls")
- Shows research depth: websites, LinkedIn, ZoomInfo, closed-lost data
- Multithreading strategy explained clearly (below-the-line → above-the-line)
- Account pool mining shows resourcefulness
- AI usage for lookalike prospecting shows modern approach
- Every step has a clear purpose (make the call warmer)

AUTHENTICITY MARKERS:
- Industry-specific research (vehicles, equipment)
- Named tools (ZoomInfo, LinkedIn, AI)
- Specific tactic: mining closed-lost for timing/feature gap accounts
- Multithreading language shows enterprise sales awareness
- "Make the account as warm as possible" — clear north star for prospecting`,
        metadata: { content_type: "golden_example", answer_type: "behavioral_star", role_type: "account_executive", interview_stage: "hiring_manager", topic: "prospecting_strategy" },
      },
    ],
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting real interview knowledge seeding...");
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
  console.log(`\nVerify: SELECT title, status, chunk_count FROM knowledge_sources WHERE 'real_interview' = ANY(tags);`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
