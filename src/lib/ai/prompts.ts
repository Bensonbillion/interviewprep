/**
 * All 12 answer type prompt builders.
 * Each function returns { system, user } strings for the Claude API call.
 */

import { getKnowledgeForStage } from "@/lib/knowledge-base";
import { getSeniorityInstructions, type RoleSeniority } from "@/lib/ai/seniority";
import {
  buildJobListingContext,
  buildCompListingContext,
  type JobListingSignals,
} from "@/lib/ai/job-listing";
import type {
  ParsedResume,
  CompanyProfile,
  RelevanceMap,
  InterviewStage,
  RoleType,
  AnswerType,
} from "@/types";

interface PromptContext {
  resume: ParsedResume;
  company: CompanyProfile;
  relevanceMap: RelevanceMap;
  jobDescription: string;
  targetRole: string;
  roleType: RoleType;
  stage: InterviewStage;
  seniority: RoleSeniority;
  jobListingSignals?: JobListingSignals;
}

interface PromptResult {
  system: string;
  user: string;
  maxTokens: number;
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function buildResumeContext(resume: ParsedResume): string {
  const topBullets = resume.roles
    .flatMap((r) =>
      r.bullets.map((b) => ({
        ...b,
        role: `${r.title} at ${r.company} (${r.startDate}–${r.endDate})`,
      }))
    )
    .sort((a, b) => b.salesRelevanceScore - a.salesRelevanceScore)
    .slice(0, 10)
    .map(
      (b) =>
        `• [${b.role}] ${b.originalText}${b.extractedMetrics.length ? ` [metrics: ${b.extractedMetrics.join(", ")}]` : ""}`
    )
    .join("\n");

  const roles = resume.roles
    .map((r) => `${r.title} at ${r.company} (${r.startDate}–${r.endDate}, ${r.durationMonths} months)`)
    .join("\n");

  return `Name: ${resume.personalInfo.name ?? "Candidate"}
Background type: ${resume.backgroundType}
Narrative: ${resume.narrativeSummary}

Roles:
${roles}

Top bullets by sales relevance:
${topBullets}`;
}

function buildCompanyContext(company: CompanyProfile): string {
  return `Company: ${company.name}
Product: ${company.productDescription}
ICP: ${JSON.stringify(company.icp)}
Sales motion: ${company.salesMotion}
Stage: ${company.stage}
Competitors: ${company.competitors.join(", ") || "unknown"}
Recent news: ${company.recentNews.join("; ") || "none"}
Culture signals: ${company.cultureSignals.join("; ") || "none"}`;
}

function buildRelevanceContext(relevanceMap: RelevanceMap): string {
  const lines = [
    `Strong matches: ${relevanceMap.strongMatches.map((m) => `${m.resumeItem} → ${m.relevance}`).join("; ")}`,
    `Gaps: ${relevanceMap.gaps.map((g) => `${g.gap} (bridge: ${g.bridgingStrategy})`).join("; ")}`,
    `Lead stories: ${relevanceMap.leadStories.join("; ")}`,
  ];
  if (relevanceMap.careerSwitcherBridges?.length) {
    lines.push(
      `Career switcher bridges: ${relevanceMap.careerSwitcherBridges.map((b) => `${b.originalExperience} → ${b.salesTranslation}`).join("; ")}`
    );
  }
  return lines.join("\n");
}


const BASE_SYSTEM = `You are an expert SDR/BDR/AE interview coach. Generate highly personalized, authentic interview prep content.

CORE PRINCIPLE — SPOKEN, NOT WRITTEN:
Every prose answer is going to be said out loud on a phone call or Zoom. It must sound like a real human talking, not a LinkedIn post, not a ChatGPT essay. Apply this test to every sentence: "Would someone actually SAY this out loud in a conversation?"

SPOKEN LANGUAGE RULES (apply to all narrative/prose answers):
- Use contractions throughout: "I've", "it's", "they're", "that's", "didn't", "won't" — never "I have", "it is" in casual speech contexts
- Mix sentence lengths: one short punchy sentence after a long one — that's how people talk
- First-person active voice: "I built X" not "The candidate built X" or "This experience showed"
- Fragments are natural in speech: "Not bad for a first month." "Which is exactly why I'm here."
- No corporate jargon: not "leverage", "synergize", "utilize", "streamline" — say "use", "build", "cut", "grow"
- End spoken answers with forward energy — not a period, but a bridge to the next conversation

GUARDRAILS:
- Every answer MUST trace to specific resume details — never fabricate achievements
- Every company reference MUST come from the company profile — never hallucinate facts
- Return ONLY the requested content — no preamble, no meta-commentary, no markdown headers
- Career switcher? Translate background confidently — never apologize for non-traditional path`;

// ─── 1. Tell Me About Yourself ────────────────────────────────────────────────

export function buildTmayPrompt(ctx: PromptContext): PromptResult {
  const kb = getKnowledgeForStage(ctx.stage, ctx.resume.backgroundType);
  const isAE = ctx.roleType === "account_executive";

  const structure = isAE
    ? `STRUCTURE for experienced AE (metrics-led):
1. Lead with your numbers in the first 1–2 sentences: quota attainment, total revenue closed, deal sizes, number of years
2. Walk through 2–3 key career milestones — not every role, focus on growth, deal complexity, and territory expansion
3. Land on most recent role — your biggest achievement (a deal, a territory, a year)
4. Bridge forward: "Which is why I'm excited to bring that enterprise motion to [Company] as [Role]."

SPECIFIC REQUIREMENTS for AE:
- Opens with a number ("Over the past X years, I've closed $Xm across Y companies")
- Mentions quota attainment specifically (e.g., "115% of quota in 3 of 4 years")
- Shows deal complexity / multi-threading / enterprise motion if present
- Does NOT apologize for moving companies — frames it as strategic growth
- Bridge connects their deal experience to what THIS company needs`
    : ctx.stage === "hiring_manager"
    ? `STRUCTURE for SDR/BDR — Hiring Manager "Walk me through your resume" variant:
This is NOT the recruiter pitch. The hiring manager has already seen the resume.
They want to understand your DECISION-MAKING ARC — why you made each move.

1. Start at the beginning of their relevant career arc
2. For each role (1–2 sentences): what you did + a result + WHY you moved on
   - Move-on reason must be GROWTH-oriented, not escape-oriented
   - "I wanted to be in a closer-to-quota environment" not "my boss was difficult"
3. For career switchers: address the switch PROACTIVELY — bridge transferable skills explicitly
   (retail selling → consultative selling, customer objections → prospect objections, team training → coaching mindset)
   Frame every transition as INTENTIONAL, not reactive
4. Land at most recent role: your biggest outcome
5. Bridge forward: connect this arc SPECIFICALLY to what this company is building

SPECIFIC REQUIREMENTS (HM variant):
- 250–350 words (90–120 seconds spoken) — longer than the recruiter version
- Every transition has a reason — don't skip decisions
- End with: why this arc specifically points to THIS role at THIS company

BANNED OPENERS (disqualifying):
- "So I graduated from..." — boring, starts too far back
- "I'm looking for a new challenge" — generic non-answer

GOOD OPENERS:
- "The short version is..." (then give the interesting version)
- "My path to tech sales isn't traditional, which I think is actually an advantage."
- Lead with the most compelling part of the arc, not the chronological beginning`
    : `STRUCTURE for SDR/BDR (chronological):
1. Start at their earliest relevant role — not their childhood or "ever since I was young"
2. Walk chronologically through their career — each role in 1–2 sentences with a specific outcome
3. Land at their most recent role — what they do/did and a concrete result
4. Bridge forward: "Which is why I'm here talking to [Company] about the [Role]."

SPECIFIC REQUIREMENTS for SDR/BDR:
- If career switcher: normalize the transition naturally — frame it as logical progression, not pivot
- Include one specific metric or achievement per role
- Energy and enthusiasm should come through — this person wants to be in sales`;

  const wordTarget = ctx.stage === "hiring_manager" ? "225–300 words (90–120 seconds spoken)" : "175–225 words (60–90 seconds spoken)";
  const seniority = getSeniorityInstructions(ctx.seniority);
  const jlc = buildJobListingContext(ctx.jobListingSignals);

  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate a "Tell Me About Yourself" narrative for this candidate.

${structure}

${seniority}

${jlc ? `${jlc}\n` : ""}SHARED REQUIREMENTS:
- ${wordTarget}
- SPOKEN LANGUAGE: This will be said out loud on a phone call. Use contractions. Vary sentence length. No phrases a human wouldn't say in conversation — "leveraged my expertise" is disqualifying, "used what I learned" is correct.
- Use specific numbers/achievements from their ACTUAL experience — never fabricate
- End with a specific bridge connecting their journey to THIS company and role — name the company and role explicitly

CANDIDATE:
${buildResumeContext(ctx.resume)}

TARGET: ${ctx.targetRole} at ${ctx.company.name}
COMPANY: ${buildCompanyContext(ctx.company)}

Return ONLY the narrative text. No labels, no JSON, no quotes around it.`,
    maxTokens: 600,
  };
}

// ─── 2. Why Sales / Why This Move ─────────────────────────────────────────────

export function buildWhySalesPrompt(ctx: PromptContext): PromptResult {
  const isAE = ctx.roleType === "account_executive";

  const seniority = getSeniorityInstructions(ctx.seniority);
  const jlc = buildJobListingContext(ctx.jobListingSignals);

  if (isAE) {
    return {
      system: BASE_SYSTEM,
      user: `Generate a "Why are you making this move?" answer for this experienced AE candidate.

AEs don't get asked "Why sales?" — they get asked "Why are you leaving?" and "Why this company specifically at this stage of your career?"

Generate an answer that covers BOTH:
1. Why they're making a move now (forward-looking, not running away — frame it as strategic next step)
2. Why this specific company and role is the right next step (specific to this company's product, market, or growth stage)

${seniority}

REQUIREMENTS:
- 75–150 words
- SPOKEN LANGUAGE: This will be said out loud. Use contractions. Say it like they're talking to a peer — not writing an email. "I've been thinking about this move for a while" not "I have carefully considered this career transition."
- Confident, not defensive — they chose to move, not fled
- Does NOT trash their current/previous employer
- Weaves in something specific about this company — name a product, market position, or customer segment naturally, not as a recited fact
- Should feel like a closer who has thought carefully about this opportunity, not someone who is just job-hunting
${jlc ? `\n${jlc}` : ""}
CANDIDATE:
${buildResumeContext(ctx.resume)}

COMPANY:
${buildCompanyContext(ctx.company)}

Return ONLY the answer text.`,
      maxTokens: 300,
    };
  }

  return {
    system: BASE_SYSTEM,
    user: `Generate a "Why sales?" answer for this candidate.

${seniority}
${jlc ? `\n${jlc}\n` : ""}
REQUIREMENTS:
- 75–150 words
- SPOKEN LANGUAGE: This will be said out loud. Use contractions. Short punchy sentences mixed with longer ones. No phrase a human wouldn't say on a phone call.
- Must include a specific moment, story, or realization — not generic "I love people" or "I've always been a people person"
- Should reference something from their actual background that connects to sales instinct or pressure
- For career switchers: frame their previous role as training for sales (resilience, persuasion, quota-like pressure)
- Ends with forward-looking energy — genuine, not desperate
- BANNED: "I've always been passionate about...", "I believe I would thrive in sales", "I'm a natural communicator"

CANDIDATE:
${buildResumeContext(ctx.resume)}

Return ONLY the answer text.`,
    maxTokens: 300,
  };
}

// ─── 3. Why This Company ──────────────────────────────────────────────────────

export function buildWhyThisCompanyPrompt(ctx: PromptContext): PromptResult {
  const seniority = getSeniorityInstructions(ctx.seniority);
  const jlc = buildJobListingContext(ctx.jobListingSignals);
  const isHM = ctx.stage === "hiring_manager";
  const depthInstruction = isHM
    ? `HIRING MANAGER DEPTH (required — recruiter-level answers will fail this round):
- Reference specific PRODUCTS by name — not just "your platform" or "your solution"
- Reference recent company news — earnings, product launches, partnerships, funding rounds if available
- Show competitive awareness — name 1–2 competitors and explain specifically why this company wins
- Connect the company's go-to-market motion to the candidate's specific skills and background
- Demonstrate ICP understanding — who buys this product, what pain it solves, why now
- Show you've researched or used the product yourself if any evidence supports it
- Connect the company's trajectory to the candidate's career goals
- 200–300 words — this is a substantially deeper answer than the recruiter version`
    : `RECRUITER LEVEL (basic research, clear motivation):
- 75–150 words
- Show genuine research — at least 2–3 specific details that prove they did their homework
- Connect something about the candidate's background/goals to what this company is building
- NOT generic: "I love the culture and growth opportunities" is disqualifying`;

  return {
    system: BASE_SYSTEM,
    user: `Generate a "Why ${ctx.company.name}?" answer for this candidate.

${seniority}
${jlc ? `\n${jlc}\n` : ""}
${depthInstruction}

REQUIREMENTS (all stages):
- Must be specific to THIS company — reference their product, market, ICP, culture signals, or recent news
- CONVERSATIONAL INTEGRATION: Don't list research facts — weave them in naturally. Instead of "I researched your company and found that...", just say it like you already know it: "The reason I'm specifically excited about ${ctx.company.name} is..." or "What drew me in was when I looked at who actually buys this — [ICP insight]..."
- SPOKEN LANGUAGE: This will be said out loud on a call. Use contractions. No sentence a human wouldn't say in conversation. Sound like a well-prepared seller who is genuinely excited, not someone reading off a research report.
- Every company detail MUST come from the company profile — never hallucinate facts

CANDIDATE:
${buildResumeContext(ctx.resume)}

COMPANY:
${buildCompanyContext(ctx.company)}

Return ONLY the answer text.`,
    maxTokens: isHM ? 600 : 300,
  };
}

// ─── 4. Behavioral STAR Answer ────────────────────────────────────────────────

const SDR_STAR_QUESTIONS: Record<string, string[]> = {
  recruiter: [
    "Tell me about a time you had to be really persistent to get something done.",
    "Tell me about a time you received feedback and had to adapt quickly.",
  ],
  hiring_manager: [
    "Tell me about a time you overcame a significant obstacle or failure.",
    "Describe a time you were rejected repeatedly and kept going.",
    "Tell me about a time you received feedback that was hard to hear. How did you respond?",
    "Tell me about your most meaningful professional achievement.",
    "Describe a time you went above and beyond what was expected.",
    "Tell me about a time you had to learn something new very quickly.",
  ],
  role_play: [
    "Tell me about a time you had to think on your feet in a high-pressure situation.",
    "Describe a time you recovered after a conversation didn't go the way you planned.",
  ],
  panel: [
    "Tell me about a time you influenced someone without having direct authority.",
    "Describe a situation where you had to persuade a skeptical audience.",
    "Tell me about a professional accomplishment you're most proud of.",
  ],
};

const AE_STAR_QUESTIONS: Record<string, string[]> = {
  recruiter: [
    "Walk me through your sales process from first contact to close.",
    "Tell me about a time you had to navigate a complex buying committee.",
  ],
  hiring_manager: [
    "Walk me through your most complex or largest deal from first meeting to close.",
    "Tell me about a deal you lost. What happened, and what did you change afterward?",
    "Describe a time you had to multi-thread a deal — how did you manage multiple stakeholders?",
    "Tell me about a time you built a deal from scratch with no inbound or SDR handoff.",
    "Describe a quarter where you missed quota. What happened and what did you do differently?",
    "Tell me about a time you had to negotiate against a better-resourced or entrenched competitor.",
  ],
  role_play: [
    "Tell me about a time you ran a discovery call that changed the deal's direction.",
    "Describe a situation where the prospect seemed disengaged and you re-engaged them.",
  ],
  panel: [
    "Tell me about your most meaningful professional achievement.",
    "Describe a time you had to influence a C-level executive you didn't have a relationship with.",
    "Tell me about a deal that taught you the most about enterprise selling.",
  ],
};

export function buildBehavioralStarPrompt(
  ctx: PromptContext,
  questionOverride?: string
): PromptResult {
  const isAE = ctx.roleType === "account_executive";
  const questionBank = isAE ? AE_STAR_QUESTIONS : SDR_STAR_QUESTIONS;
  const questions = questionBank[ctx.stage] ?? questionBank.hiring_manager;
  const kb = getKnowledgeForStage(ctx.stage, ctx.resume.backgroundType);

  const aeExtra = isAE
    ? `\nAE-SPECIFIC REQUIREMENTS:
- Deal stories MUST include: deal size ($), sales cycle length, number of stakeholders, quota context
- For "deal you lost" story: include what you changed afterward — self-awareness scores higher than the win
- For multi-threading stories: name the specific stakeholders (CTO, VP Eng, Procurement) and how you navigated each
- Quota attainment context: "I was 115% to my $1.2M annual quota" — not just "I exceeded quota"`
    : "";

  const panelExtra = ctx.stage === "panel"
    ? `\nPANEL ROUND REQUIREMENTS:
- This is the FINAL round. Interviewers are senior — VP Sales, SDR Manager, Senior AE, or cross-functional leaders.
- Lead with the STRONGEST story first — highest metrics, most impressive outcome, most specific detail
- Every single story MUST include a quantifiable result (%, $, #, time saved, ranking) — no exceptions
- Make stories DISTINCT from each other: one about resilience/failure recovery, one about exceeding expectations or a standout achievement, one about influencing others or cross-functional collaboration
- Demonstrate grit, accountability, and ownership — these are the traits senior interviewers specifically probe
- Senior interviewers have heard thousands of generic answers. "I worked really hard" is a disqualifying response. Specificity is everything — names, numbers, and decisions, not activities.`
    : "";

  const seniority = getSeniorityInstructions(ctx.seniority);
  const jlc = buildJobListingContext(ctx.jobListingSignals);

  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate ${questionOverride ? "1 STAR answer" : `${questions.length} STAR answers`} for this candidate.

${questionOverride ? `QUESTION: ${questionOverride}` : `QUESTIONS:\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`}

${seniority}

STAR FORMAT (each answer):
- Situation: brief context (1–2 sentences)
- Task: what was expected of them specifically
- Action: what THEY did — specific, first-person, with tactics and decisions
- Result: concrete outcome with a number or clear business impact

${jlc ? `${jlc}\n\n` : ""}REQUIREMENTS per answer:
- 150–225 words total (60–90 seconds spoken)
- Must draw from ACTUAL resume bullets — never fabricate
- SPOKEN LANGUAGE: This will be said out loud. Write it as a story being told, not a template being filled. The STAR structure is a guide — the STAR labels should NOT appear in the answer itself. Use contractions. Vary sentence length. "I was nervous going into that conversation, honestly" is fine. "I demonstrated exceptional communication skills" is not.
- Includes at least one specific metric, name, or detail
- Ends with what they learned or would do differently${aeExtra}${panelExtra}

CANDIDATE:
${buildResumeContext(ctx.resume)}

RELEVANCE MAP:
${buildRelevanceContext(ctx.relevanceMap)}

Return JSON:
{"answers": [{"question": "...", "answer": "...", "resumeSource": "which bullet/role this draws from"}]}`,
    maxTokens: 2000,
  };
}

// ─── 5. Comp Expectations ─────────────────────────────────────────────────────

export function buildCompExpectationsPrompt(ctx: PromptContext): PromptResult {
  const seniority = getSeniorityInstructions(ctx.seniority);
  const jlc = buildJobListingContext(ctx.jobListingSignals);
  const compCtx = buildCompListingContext(ctx.jobListingSignals);
  return {
    system: BASE_SYSTEM,
    user: `Generate a comp expectations answer for this candidate applying for ${ctx.targetRole} at ${ctx.company.name}.

${seniority}
${compCtx ? `\n${compCtx}\n` : ""}
REQUIREMENTS:
- 2–4 sentences
- Confident, market-aware, leaves room for negotiation
- Senior candidates should anchor higher and frame it around OTE + upside, not just base
- For SDR/BDR entry: typical OTE is $50K–$80K; for senior BDR/SDR: $70K–$100K; for AE: $80K–$150K+ OTE
- Signals understanding of sales comp structure (base + variable/commission)
- Not desperate or apologetic
- Does NOT give a single number — gives a range or frame
${jlc ? `\n${jlc}` : ""}
Return ONLY the answer text.`,
    maxTokens: 200,
  };
}

// ─── 6. Role Play Script ──────────────────────────────────────────────────────

export function buildRolePlayScriptPrompt(ctx: PromptContext): PromptResult {
  const kb = getKnowledgeForStage("role_play", ctx.resume.backgroundType);
  const isAE = ctx.roleType === "account_executive";
  const seniority = getSeniorityInstructions(ctx.seniority);
  const jlc = buildJobListingContext(ctx.jobListingSignals);

  if (isAE) {
    return {
      system: `${BASE_SYSTEM}

${kb}`,
      user: `Generate a discovery demo script for this AE candidate's role play / live exercise assessment.

The candidate is applying for ${ctx.targetRole} at ${ctx.company.name}.

${seniority}
${jlc ? `\n${jlc}\n` : ""}
AEs are NOT tested on cold calling — they're tested on running discovery. The interviewer will play a prospect (typically a VP or C-level buyer at the company's ICP). The candidate must run a real discovery conversation before pitching.

SCRIPT STRUCTURE (required):
1. Opener: Agenda-setting, NOT a pitch. Start with curiosity, not product. "Before I show you anything, I want to understand your world first." 2–3 sentences.
2. Discovery questions: 4–5 open-ended qualifying questions. Go deeper → connect to pain → qualify fit. DO NOT pitch until after question 3.
3. Pivot to demo: After hearing their pain, connect it specifically to the product. "Based on what you just said about [pain], let me show you exactly how we address that..."
4. Objection responses: Enterprise/executive-level objections:
   - "We already have a solution / We use [Competitor]"
   - "What makes you different from [X]?"
   - "We'd need to go through procurement / This isn't the right time"
   - "I don't see why we need to switch"
   - "Can you send me a deck first?"
5. Next steps close: Calendar a specific follow-up, propose a pilot/POC, or define the next person to involve.

REQUIREMENTS:
- Discovery questions: open-ended, show genuine curiosity about their business — not feature-fishing
- Value prop comes AFTER hearing their specific pain — problem-first, not product-first
- Objection responses: acknowledge validity → reframe without dismissing → advance the conversation
- Use ACTUAL product details and ICP from company profile — no generic descriptions

COMPANY:
${buildCompanyContext(ctx.company)}

Return JSON:
{
  "opener": "...",
  "discoveryQuestions": ["...", "...", "...", "...", "..."],
  "pivotToDemo": "...",
  "objectionResponses": [
    {"objection": "...", "response": "..."},
    {"objection": "...", "response": "..."},
    {"objection": "...", "response": "..."},
    {"objection": "...", "response": "..."},
    {"objection": "...", "response": "..."}
  ],
  "nextStepsClose": "..."
}`,
      maxTokens: 1500,
    };
  }

  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate a cold call script for this candidate to use in their role play assessment.

The candidate is applying for ${ctx.targetRole} at ${ctx.company.name}.

${seniority}
${jlc ? `\n${jlc}\n` : ""}
SCRIPT STRUCTURE (required):
1. Opener: Pattern interrupt, direct, brief. Reference company product + prospect pain. 2–3 sentences.
2. Discovery questions: 3 open-ended questions. Go from broad → specific → urgency/priority.
3. Value prop: 1–2 sentences. Problem-first: "Based on what you said about [pain], that's exactly why [Company] exists..."
4. Objection responses: Handle each of these 5 objections:
   - "Not interested / We're all set"
   - "Send me an email"
   - "We already have a solution"
   - "Not the right time"
   - "I'm busy / I have to go"
5. Close: Specific ask for next step. Assumptive but not pushy.

REQUIREMENTS:
- Use ACTUAL product details from company profile — no generic descriptions
- Objection responses: acknowledge → reframe → ask a question (don't just push harder)
- Script should work as an actual mock call — natural, not robotic
- Prospect persona: draw from company's ICP

COMPANY:
${buildCompanyContext(ctx.company)}

Return JSON:
{
  "opener": "...",
  "discoveryQuestions": ["...", "...", "..."],
  "valueProp": "...",
  "objectionResponses": [
    {"objection": "...", "response": "..."},
    ...
  ],
  "close": "..."
}`,
    maxTokens: 1500,
  };
}

// ─── 7. Objection Response ────────────────────────────────────────────────────

export function buildObjectionResponsePrompt(
  ctx: PromptContext,
  objection?: string
): PromptResult {
  const kb = getKnowledgeForStage("role_play", ctx.resume.backgroundType);
  const targetObjections = objection
    ? [objection]
    : [
        "Not interested / We're all set",
        "Send me an email",
        "We already have a solution",
        "Not the right time / Budget is frozen",
        "I'm busy / I have to go",
      ];

  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate objection handling responses for a ${ctx.company.name} ${ctx.targetRole} cold call role play.

OBJECTIONS TO ADDRESS:
${targetObjections.map((o, i) => `${i + 1}. "${o}"`).join("\n")}

FORMULA for each response: Acknowledge → Reframe → Ask a question
- Acknowledge: validate the objection without agreeing it's fatal
- Reframe: shift perspective without being pushy
- Question: end with an open question that re-engages them

REQUIREMENTS:
- Each response 40–80 words
- Specific to ${ctx.company.name}'s product and ICP — no generic filler
- Natural, conversational — sounds like a confident SDR not reading a script
- Never argue, never apologize, never beg

COMPANY CONTEXT:
${buildCompanyContext(ctx.company)}

Return JSON:
{"responses": [{"objection": "...", "response": "..."}]}`,
    maxTokens: 800,
  };
}

// ─── 8. Company Brief ─────────────────────────────────────────────────────────

export function buildCompanyBriefPrompt(ctx: PromptContext): PromptResult {
  return {
    system: BASE_SYSTEM,
    user: `Generate a company research brief for this candidate to study before their interview.

COMPANY:
${buildCompanyContext(ctx.company)}

JOB DESCRIPTION:
${ctx.jobDescription.slice(0, 800)}

BRIEF SHOULD INCLUDE:
1. Company in one sentence (what they do, who for, why it matters)
2. The product/platform — what problem it solves and how (2–3 sentences)
3. Their ICP — who buys it, why, what pain it addresses
4. Sales motion — inbound vs outbound vs PLG, what reps actually do
5. Competitive landscape — top 2–3 competitors and how ${ctx.company.name} differentiates
6. 3–4 things to mention in the interview (recent news, culture signals, growth signals)
7. Questions the candidate should be ready to answer about their knowledge of the company

Return JSON:
{
  "oneLiner": "...",
  "productExplainer": "...",
  "icpSummary": "...",
  "salesMotionSummary": "...",
  "competitiveLandscape": "...",
  "talkingPoints": ["...", "...", "...", "..."],
  "likelyCompanyQuestions": ["...", "...", "..."]
}`,
    maxTokens: 1000,
  };
}

// ─── 9. Cheat Sheet ───────────────────────────────────────────────────────────

const STAGE_CHEAT_FOCUS_SDR: Record<InterviewStage, string> = {
  recruiter:
    "Phone presence, motivation, basic fit, salary alignment, why sales, why this company",
  hiring_manager:
    "Behavioral STAR stories, grit, resilience, quota attainment, coachability",
  role_play:
    "Cold call structure, objection handling, discovery questions before pitching, coachability after feedback",
  panel:
    "Executive presence, cultural fit, career trajectory, questions to ask, closing the interviewer",
  take_home:
    "Cold email quality, ICP research depth, pain point specificity, submission polish, and showing you think like a rep not a job applicant",
};

const STAGE_CHEAT_FOCUS_AE: Record<InterviewStage, string> = {
  recruiter:
    "Numbers check: quota attainment, deal sizes, sales cycle, reason for moving, why this company",
  hiring_manager:
    "Deal depth: largest deal walkthrough, deal you lost, multi-threading, quota narrative, methodology name",
  role_play:
    "Discovery before pitching, qualifying questions, pivot to demo after pain is established, executive objection handling, coachability",
  panel:
    "Executive presence, 90-day plan, stakeholder management, career trajectory, close the hiring process",
  take_home:
    "Cold email quality, ICP research depth, pain point specificity, submission polish, and showing you think like a rep not a job applicant",
};

export function buildCheatSheetPrompt(ctx: PromptContext): PromptResult {
  const kb = getKnowledgeForStage(ctx.stage, ctx.resume.backgroundType);
  const isAE = ctx.roleType === "account_executive";
  const focusAreas = isAE ? STAGE_CHEAT_FOCUS_AE[ctx.stage] : STAGE_CHEAT_FOCUS_SDR[ctx.stage];
  const seniority = getSeniorityInstructions(ctx.seniority);
  const jlc = buildJobListingContext(ctx.jobListingSignals);
  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate a pre-interview cheat sheet for ${ctx.targetRole} at ${ctx.company.name}.
Stage: ${ctx.stage} — Focus areas: ${focusAreas}

${seniority}
${jlc ? `\n${jlc}\n` : ""}
CANDIDATE:
${buildResumeContext(ctx.resume)}

COMPANY:
${buildCompanyContext(ctx.company)}

CHEAT SHEET MUST INCLUDE:
- 4–5 key points to remember for this specific stage
- 3–4 company facts to reference (show research without sounding rehearsed)
- The single strongest story/bullet from their background to deploy in this round
- The critical tip — the #1 thing most candidates get wrong in this stage that this candidate should avoid

Return JSON:
{
  "keyPoints": ["...", "...", "...", "..."],
  "companyFacts": ["...", "...", "...", "..."],
  "strongestStory": "...",
  "criticalTip": "..."
}`,
    maxTokens: 600,
  };
}

// ─── 10. Questions To Ask ─────────────────────────────────────────────────────

const STAGE_QUESTION_CONTEXT: Record<InterviewStage, string> = {
  recruiter: `Ask the recruiter — questions should gather intel that helps the candidate ace the next round and evaluate fit. Focus on: process and timeline (what happens next, when will you hear), team structure (how many SDRs, SDR-to-AE ratio, is this a backfill or new headcount), what the hiring manager interview will focus on, comp structure (base/variable split, OTE, ramp), and what top performers on the team do differently. These questions signal the candidate is serious and thinks like a rep who qualifies opportunities, not just a job applicant going through the motions.`,
  hiring_manager: `Ask the hiring manager — these questions should show the candidate thinks like a rep who is qualifying the opportunity, not just hoping to pass. Focus on: what great performance looks like in the first 90 days (specific, not just "hit quota"), how the hiring manager coaches (what does their 1:1 actually look like), what challenges the current team is working through, why this role is open now (backfill, team growth, new territory), and what the rep who's performing best on the team does differently. Avoid softball questions ("What do you love about working here?") — they signal low ambition. End with something that shows strategic curiosity about the market or product.`,
  role_play: `Ask after the role play debrief — show coachability and genuine curiosity about performance. Focus on: what specifically the interviewer was looking for in the exercise (most candidates never ask this), what the top performers on the team do differently in their first call, how they train new reps and how quickly they expect someone to be fully ramped, and what the most common mistake is that candidates make in this exercise. Asking sharp questions after a debrief is itself a signal — it shows they're already thinking like a rep.`,
  panel: `Ask the panel — this is the final round. Questions should show strategic depth, close the hiring process, and express clear intent. At least one question should reference a specific aspect of the company's market position or product direction. Include: a question about where the company is headed in the next 12–18 months, something about the culture or how the team operates cross-functionally, what success looks like in year one (specific, not generic), and close the process explicitly — express genuine excitement and ask if there's anything preventing them from moving forward.`,
  take_home: `No live Q&A — generate strong follow-up questions to ask when submitting or debriefing the assignment. Focus on: what specifically the hiring team grades (most candidates never ask), what would make this an A+ submission vs a B, questions that reference specific elements of the company or role that show the candidate did the work, and a question that signals genuine interest in the market they're selling into.`,
};

export function buildQuestionsToAskPrompt(ctx: PromptContext): PromptResult {
  const seniority = getSeniorityInstructions(ctx.seniority);
  const jlc = buildJobListingContext(ctx.jobListingSignals);
  const jdSnippet = ctx.jobDescription
    ? `\nJOB DESCRIPTION (use to make at least 2 questions specific to this listing):\n${ctx.jobDescription.slice(0, 600)}`
    : "";

  return {
    system: BASE_SYSTEM,
    user: `Generate 5–6 sharp questions for this candidate to ask in their ${ctx.stage} interview at ${ctx.company.name}.

${seniority}
${jlc ? `\n${jlc}\n` : ""}
Context: ${STAGE_QUESTION_CONTEXT[ctx.stage]}

REQUIREMENTS:
- Each question demonstrates genuine curiosity AND sales-savvy thinking
- NOT generic ("What does success look like?") unless made very specific to this company and role
- Reference specific things from the company profile — product, ICP, sales motion, competitors — at least 2 questions should only work for THIS company, not any company
- If the job description is available, reference specific requirements or expectations from it in at least 2 questions — it signals the candidate actually read the listing
- Vary the type: some about the team, some about the company/market, some about the role/expectations
- Panel round MUST include a close: language to express genuine intent and ask where things stand${ctx.jobListingSignals?.careerPath ? `\n- CAREER PATH: The job listing explicitly mentions a path to ${ctx.jobListingSignals.careerPath}. Include at least one question probing how quickly that transition typically happens and what it takes to earn it.` : ""}${jdSnippet}

COMPANY:
${buildCompanyContext(ctx.company)}

Return JSON:
{"questions": [{"question": "...", "why": "why this question signals strong thinking"}]}`,
    maxTokens: 700,
  };
}

// ─── 11. Coachability Coaching ────────────────────────────────────────────────

export function buildCoachabilityCoachingPrompt(ctx: PromptContext): PromptResult {
  const kb = getKnowledgeForStage("role_play", ctx.resume.backgroundType);
  const seniority = getSeniorityInstructions(ctx.seniority);
  const jlc = buildJobListingContext(ctx.jobListingSignals);
  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate coachability coaching for this candidate's role play / live exercise assessment at ${ctx.company.name}.

The candidate is applying for ${ctx.targetRole}${ctx.roleType === "account_executive" ? " — this is a discovery demo assessment, not a cold call" : " — this is a cold call role play assessment"}.

${seniority}
${jlc ? `\n${jlc}\n` : ""}
WHAT COACHABILITY COACHING IS:
The moment after the first attempt when the interviewer gives feedback.
This is the #1 differentiator — candidates who receive feedback well and immediately implement it get offers. Candidates who argue, deflect, or implement only partially are eliminated.

COACHING MUST COVER:
1. What to say in the exact moment feedback is delivered (specific language, not generic "great feedback!")
2. How to listen — what signals show genuine receptivity vs. performative nodding
3. What to do on the second attempt — specifically implement the feedback within 30 seconds of restarting
4. The most common mistakes for this role type: ${ctx.roleType === "account_executive" ? "pitching before asking questions, not connecting demo to their stated pain, defending your approach instead of adapting" : "feature dumping without discovery, freezing on objections, not asking for next steps"}

COMPANY:
${buildCompanyContext(ctx.company)}

Return 3–5 sentences of specific, actionable coaching. Include at least one example of what to SAY in the moment.
Return ONLY the coaching text (no JSON, no headers).`,
    maxTokens: 400,
  };
}

// ─── 12. Career Switcher Bridge ───────────────────────────────────────────────

export function buildCareerSwitcherBridgePrompt(ctx: PromptContext): PromptResult {
  const kb = getKnowledgeForStage(ctx.stage, "career_switcher");
  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate career switcher bridges for this candidate transitioning into ${ctx.targetRole} at ${ctx.company.name}.

CANDIDATE BACKGROUND:
${buildResumeContext(ctx.resume)}

WHAT CAREER SWITCHER BRIDGES ARE:
Specific framings that connect non-sales experience to sales skills.
Goal: make the transition feel logical and inevitable — not apologetic or desperate.

FOR EACH PREVIOUS ROLE/EXPERIENCE, generate:
1. The transferable skill most relevant to sales
2. The exact bridge phrasing ("In [X role], I [did Y] — which is essentially the same as [sales skill Z]. For example, [specific instance].")
3. The sales scenario where this experience applies in this role

REQUIREMENTS:
- 3–5 bridges covering the most impactful career experiences
- Each bridge should work as a standalone answer in an interview question
- Never say "even though I don't have direct sales experience" — reframe as "different path, same skills"
- Specific: mention actual job titles, industries, and situations

Return JSON:
{
  "bridges": [
    {
      "previousExperience": "...",
      "transferableSkill": "...",
      "bridgePhrasing": "...",
      "salesApplication": "..."
    }
  ]
}`,
    maxTokens: 1200,
  };
}

// ─── 13. Resume Walkthrough ───────────────────────────────────────────────────

export function buildResumeWalkthroughPrompt(ctx: PromptContext): PromptResult {
  const kb = getKnowledgeForStage("hiring_manager", ctx.resume.backgroundType);
  const isAE = ctx.roleType === "account_executive";
  const isCareerSwitcher = ctx.resume.backgroundType === "career_switcher";
  const seniority = getSeniorityInstructions(ctx.seniority);
  const jlc = buildJobListingContext(ctx.jobListingSignals);

  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate a "Walk me through your resume" answer for a hiring manager interview.

${seniority}
${jlc ? `\n${jlc}\n` : ""}
This is DIFFERENT from "Tell Me About Yourself." TMAY is a 60-second present-past-future pitch. This is a 2–3 minute CHRONOLOGICAL NARRATIVE testing decision-making quality. The hiring manager has the resume in front of them — they want DECISION RATIONALE, not a list of job titles.

STRUCTURE — for each role or career phase:
1. What they did (1–2 sentences, include at least one specific metric)
2. Why they moved on — a GROWTH-oriented reason, never escape-oriented
3. What skill or lesson they carried forward to the next phase

${isCareerSwitcher ? `CAREER SWITCHER BRIDGING (mandatory — this candidate has a non-traditional background):
- Address the transition proactively in the FIRST 15 SECONDS — don't wait for the HM to ask
- Bridge transferable skills EXPLICITLY with language like:
  → retail floor selling → consultative discovery conversations
  → handling objections from customers → handling objections from prospects
  → training or onboarding new hires → coaching orientation
  → hitting daily/weekly revenue targets → hitting activity metrics
- Frame the switch as INTENTIONAL and STRATEGIC, not desperate or accidental
- The best career switch answers make the non-traditional path sound like a COMPETITIVE ADVANTAGE
` : ""}END: Connect the entire arc to why THIS role at THIS company is the inevitable next chapter. Name the company and role specifically.

LENGTH: 250–400 words (2–3 minutes spoken). Longer than the recruiter TMAY by design.

TONE: Confident storyteller who owns every decision. Not apologetic. Not robotic or overly formal.

REQUIRED ELEMENTS:
- At least one metric per role mentioned
- Explicit bridge from each previous experience to the next role's skills
- A forward-looking close that names the company and role specifically
- A moment of genuine self-awareness or reflection (makes it sound human)
${isAE ? "- AE version: show progression of deal complexity and quota attainment at each step" : ""}

BANNED — do not use these phrases:
- "I'm looking for a new challenge" (generic, says nothing)
- "I've always been passionate about technology/sales" (AI flag — nobody talks like this)
- Opening with "So I graduated from [university] in [year]" (boring chronological trap)
- "I believe my skills would translate well" (passive, unconfident)
- "I'm a people person" (cliché)

GOOD OPENER EXAMPLES (use one as inspiration, don't copy verbatim):
- "The short version is I've spent the last 18 months learning how to sell to people who don't want to be sold to — at Best Buy, not SaaS, but honestly the fundamentals are the same."
- "My path here isn't the typical SDR story, which I think is actually why I'd be good at this."
- "Two years ago I was the top revenue producer on a retail floor — and I realized I was doing consultative selling without knowing the term for it."

CANDIDATE:
${buildResumeContext(ctx.resume)}

TARGET: ${ctx.targetRole} at ${ctx.company.name}
COMPANY: ${buildCompanyContext(ctx.company)}

RELEVANCE MAP:
${buildRelevanceContext(ctx.relevanceMap)}

Return ONLY the narrative text. No labels, no JSON, no quotes around it.`,
    maxTokens: 800,
  };
}

// ─── 14. Constructive Feedback ────────────────────────────────────────────────

export function buildConstructiveFeedbackPrompt(ctx: PromptContext): PromptResult {
  const kb = getKnowledgeForStage("hiring_manager", ctx.resume.backgroundType);
  const seniority = getSeniorityInstructions(ctx.seniority);
  const jlc = buildJobListingContext(ctx.jobListingSignals);

  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate an answer to "Tell me about the last piece of constructive feedback you received and what you did with it."

${seniority}
${jlc ? `\n${jlc}\n` : ""}
This question tests the #1 SDR trait hiring managers hire for: coachability.

STRUCTURE:
1. WHO gave the feedback and WHEN (specific person + context — recent, last 6–12 months)
2. WHAT the feedback was (specific and real — not vague "communicate better")
3. Initial honest reaction (brief — 1 sentence acknowledging it wasn't easy to hear)
4. Specific ACTIONS taken in response (not "I reflected on it" — concrete behaviors)
5. Measurable RESULT or visible change
6. What it taught about how they learn and respond to coaching

REQUIREMENTS:
- 150–225 words (60–90 seconds spoken)
- SPOKEN LANGUAGE: This will be said out loud. Sound like someone telling this story to a peer over coffee — honest, a little self-aware, not like a performance review. "Honestly, my first reaction was to defend myself" is right. "I initially experienced some resistance" is wrong. Use contractions throughout.
- Draw from ACTUAL resume experience — manager, team lead, coach, professor, or customer feedback all count
- The feedback must be REAL-sounding — a humble-brag ("I work too hard") is an instant fail
- The reaction must be honest — showing initial resistance then growth scores HIGHER than pretending to love feedback
- End forward-looking: connect coachability to how they'll perform in THIS role

BANNED:
- "I don't really get negative feedback"
- "My manager said I work too hard / care too much"
- Generic feedback with no specifics
- Self-congratulatory framing that minimizes the feedback
- "I leveraged this feedback to enhance my performance" (robotic — say it like a human)

CANDIDATE:
${buildResumeContext(ctx.resume)}

TARGET: ${ctx.targetRole} at ${ctx.company.name}

Return ONLY the answer text. No labels, no JSON, no quotes around it.`,
    maxTokens: 500,
  };
}

// ─── Competitor Battle Cards ──────────────────────────────────────────────────

export function buildCompetitorBattleCardPrompt(ctx: PromptContext): PromptResult {
  const kb = getKnowledgeForStage(ctx.stage, ctx.resume.backgroundType);
  const competitors = ctx.company.competitors.slice(0, 4);
  const competitorList = competitors.length > 0
    ? competitors.join(", ")
    : "the main competitors in this space";

  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate competitor battle cards for a ${ctx.targetRole} interview at ${ctx.company.name}.

The candidate needs structured competitive intelligence to:
1. Answer "How does ${ctx.company.name} differ from [Competitor]?" in a ${ctx.stage} interview
2. Handle competitive objections during a cold call role play
3. Ask smart discovery questions when a prospect mentions a competitor

COMPANY CONTEXT:
${buildCompanyContext(ctx.company)}

COMPETITORS TO COVER: ${competitorList}
(Cover 2–4 competitors max. If the list is short, add the most relevant ones you know for this space.)

For each competitor, provide:
- name: competitor name
- strengths: 2–3 things they genuinely do well (be honest — candidates who dismiss competitors look naive)
- where_we_win: 2–3 specific differentiators where ${ctx.company.name} wins (concrete, not "better product")
- switching_triggers: 2–3 real reasons customers switch FROM this competitor TO ${ctx.company.name} (specific pain points, not generic)
- discovery_question: ONE sharp question to ask a prospect who is currently using this competitor — designed to surface dissatisfaction without bashing the competition

REQUIREMENTS:
- Be specific to ${ctx.company.name}'s actual product and market position
- Do NOT trash competitors — acknowledge their strengths credibly, then explain the differentiation
- switching_triggers should be operational pain points, not "they're more expensive"
- discovery_question should feel natural in a cold call, not combative

Return JSON:
{
  "competitors": [
    {
      "name": "...",
      "strengths": ["...", "..."],
      "where_we_win": ["...", "..."],
      "switching_triggers": ["...", "..."],
      "discovery_question": "..."
    }
  ]
}`,
    maxTokens: 1200,
  };
}

// ─── Take-Home: Cold Email ─────────────────────────────────────────────────────

export function buildColdEmailPrompt(ctx: PromptContext): PromptResult {
  const kb = getKnowledgeForStage("recruiter", ctx.resume.backgroundType);

  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Write a cold outreach email that a candidate would submit as part of their take-home sales assignment for a ${ctx.targetRole} role at ${ctx.company.name}.

The email should be written AS IF the candidate is reaching out to a realistic buyer/prospect at the kind of company ${ctx.company.name} typically sells to.

CONTEXT:
${buildCompanyContext(ctx.company)}

CANDIDATE BACKGROUND (use to make the prospecting approach feel authentic):
${buildResumeContext(ctx.resume)}

TARGET BUYER: A realistic prospect at one of ${ctx.company.name}'s ICP companies (${ctx.company.icp.companySizes.join(", ")} — ${ctx.company.icp.industries.slice(0, 3).join(", ")} industry — buyer persona: ${ctx.company.icp.buyerPersonas.slice(0, 2).join(" or ")}).

EMAIL REQUIREMENTS:
- Subject line: specific, personalized, no spam words — include company name or role
- Opening: a real trigger or observation (news, growth signal, pain indicator) — NOT "I came across your profile"
- Value connection: 1 sentence on what ${ctx.company.name} does for companies like theirs + a specific pain point it solves
- Credibility: 1 brief proof point (a result or customer type, not a wall of text)
- CTA: soft, specific, time-bounded — "15 minutes Tuesday or Wednesday?"
- PS line (optional but strong): a second reason to reply

FORMAT:
Subject: [subject line]

[email body — 100–150 words max]

[Optional PS line]

REQUIREMENTS:
- Sound like a real human, not a template
- Use the candidate's background to inform their prospecting angle — they should write from their own perspective
- Never mention the interview or the hiring process — this is a real cold email to a prospect
- No clichés: "I hope this email finds you well", "I wanted to reach out", "I'm reaching out because"
- Specific > Generic: reference actual company names, real pain points, real metrics where possible

Return ONLY the email (subject + body). No preamble, no explanation.`,
    maxTokens: 600,
  };
}

// ─── Take-Home: Pain Point Analysis ──────────────────────────────────────────

export function buildPainPointAnalysisPrompt(ctx: PromptContext): PromptResult {
  const kb = getKnowledgeForStage("recruiter", ctx.resume.backgroundType);

  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Write a pain point analysis for a ${ctx.targetRole} take-home assignment at ${ctx.company.name}.

This is the research foundation — the candidate uses this to anchor their cold email, prospecting strategy, and value prop in their assignment submission.

COMPANY CONTEXT:
${buildCompanyContext(ctx.company)}

CANDIDATE:
${buildResumeContext(ctx.resume)}

STRUCTURE:

## ICP Profile
2–3 sentences on who ${ctx.company.name} sells to (size, industry, buyer persona, buying triggers).

## Top 3 Pain Points
For each pain point:
- Pain: What the buyer struggles with (specific, operational, not generic)
- Why it hurts: Business impact (revenue, churn, time, headcount, competitive risk)
- How ${ctx.company.name} solves it: Specific mechanism, not just "our platform helps"

## Prospecting Triggers
3–5 specific signals that indicate a prospect is experiencing this pain RIGHT NOW (hiring signals, tech stack changes, news events, role postings, etc.)

## Candidate's Angle
1 paragraph: Given this candidate's background, which pain point is their strongest outreach hook and why? How does their experience make them credible on this topic?

REQUIREMENTS:
- 300–400 words total
- Specific to ${ctx.company.name}'s actual product and market, not generic SaaS pain
- Pain points should be operational, not philosophical ("their SDRs spend 3 hours per day on manual research" not "inefficiency")
- Use real-world language a buyer would recognize

Return ONLY the analysis. No preamble.`,
    maxTokens: 900,
  };
}

// ─── Take-Home: Assignment Strategy Guide ────────────────────────────────────

export function buildAssignmentGuidePrompt(ctx: PromptContext): PromptResult {
  const kb = getKnowledgeForStage("recruiter", ctx.resume.backgroundType);

  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Write a take-home assignment strategy guide for a ${ctx.targetRole} candidate at ${ctx.company.name}.

Most candidates treat take-homes as a test to pass. The best candidates treat them as their first sales call on ${ctx.company.name}. This guide should help the candidate think like a top 10% rep, not a job applicant.

COMPANY CONTEXT:
${buildCompanyContext(ctx.company)}

CANDIDATE:
${buildResumeContext(ctx.resume)}

STRUCTURE:

## What They're Actually Grading
3–4 bullet points on what a hiring team REALLY evaluates in a take-home (research quality, ICP understanding, messaging, effort signal). Cut the fluff — tell the truth about what moves the needle.

## The Top 10% Move
1–2 paragraphs on what separates a stand-out submission from an average one. Specific, actionable, not generic ("personalize your email" is not advice).

## Submission Checklist
7–10 specific items the candidate should include or verify before submitting. Include formatting, length, tone, research, and the one thing most candidates forget.

## Common Mistakes to Avoid
4–5 specific mistakes that sink candidates — not "be yourself" platitudes. Real tactical errors (wrong ICP, too long, features not pain, generic subject line, no PS, etc.).

## This Candidate's Edge
1 paragraph: Given this specific candidate's background (${ctx.resume.backgroundType}, roles at ${ctx.resume.roles.slice(0, 2).map((r) => r.company).join(" and ")}), what is their strongest angle for this assignment? What should they lead with?

REQUIREMENTS:
- 350–500 words
- Tactical > Philosophical — every sentence should be actionable
- Calibrate to ${ctx.company.name}'s actual stage and motion (${ctx.company.stage}, ${ctx.company.salesMotion})
- Sound like advice from a rep who's been through this, not an HR consultant

Return ONLY the guide. No preamble.`,
    maxTokens: 1000,
  };
}

// ─── Master router ────────────────────────────────────────────────────────────

export function buildPromptForAnswerType(
  answerType: AnswerType,
  ctx: PromptContext,
  options?: { question?: string; objection?: string }
): PromptResult {
  switch (answerType) {
    case "tell_me_about_yourself":
      return buildTmayPrompt(ctx);
    case "why_sales":
      return buildWhySalesPrompt(ctx);
    case "why_this_company":
      return buildWhyThisCompanyPrompt(ctx);
    case "behavioral_star":
      return buildBehavioralStarPrompt(ctx, options?.question);
    case "comp_expectations":
      return buildCompExpectationsPrompt(ctx);
    case "role_play_script":
      return buildRolePlayScriptPrompt(ctx);
    case "objection_response":
      return buildObjectionResponsePrompt(ctx, options?.objection);
    case "company_brief":
      return buildCompanyBriefPrompt(ctx);
    case "cheat_sheet":
      return buildCheatSheetPrompt(ctx);
    case "questions_to_ask":
      return buildQuestionsToAskPrompt(ctx);
    case "coachability_coaching":
      return buildCoachabilityCoachingPrompt(ctx);
    case "career_switcher_bridge":
      return buildCareerSwitcherBridgePrompt(ctx);
    case "resume_walkthrough":
      return buildResumeWalkthroughPrompt(ctx);
    case "constructive_feedback":
      return buildConstructiveFeedbackPrompt(ctx);
    case "competitor_battle_card":
      return buildCompetitorBattleCardPrompt(ctx);
    case "cold_email":
      return buildColdEmailPrompt(ctx);
    case "pain_point_analysis":
      return buildPainPointAnalysisPrompt(ctx);
    case "assignment_guide":
      return buildAssignmentGuidePrompt(ctx);
    default:
      throw new Error(`Unknown answer type: ${answerType}`);
  }
}
