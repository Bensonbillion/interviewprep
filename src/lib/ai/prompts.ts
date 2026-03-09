/**
 * All 12 answer type prompt builders.
 * Each function returns { system, user } strings for the Claude API call.
 */

import { getKnowledgeForStage } from "@/lib/knowledge-base";
import { type RoleSeniority } from "@/lib/ai/seniority";
import {
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
  personalContext?: string;
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


function buildPersonalContextBlock(personalContext?: string): string {
  if (!personalContext?.trim()) return "";
  return `\nPERSONAL CONTEXT (use naturally, don't force it):
The candidate shared this about themselves beyond their resume:
'${personalContext.trim()}'

Weave this into the answer ONLY if it adds value — don't shoehorn it in. The best placement is usually:
- TMAY: as a memorable closing line ('Outside of work, I actually run a small e-commerce business, which honestly taught me more about cold outreach than any sales course')
- Why Sales: if the personal detail connects to sales traits (competitive sports → competitive drive, side business → entrepreneurial hustle, coaching → leadership)
- Behavioral STAR: if the personal context provides a relevant story that the resume doesn't cover
- Resume walkthrough: as a brief personal touch at the end

Rules for using personal context:
- ONE mention per answer maximum — don't overuse it
- Frame it as a STRENGTH or DIFFERENTIATOR, never random trivia
- Connect it to a sales-relevant trait when possible
- If the personal context doesn't naturally fit the answer type, SKIP IT entirely — forced personal details sound worse than no personal details
- Keep it brief — one sentence, woven in naturally, not a separate paragraph
`;
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
- BUILD ANSWERS THROUGH CLAUSE-CHAINING, NOT SENTENCES: Spoken English connects short clauses with "and," "so," "but," "because," "which" — not periods followed by new topic sentences. WRONG: "I identified the problem early. I proposed a solution to my manager. She approved it. I implemented it within two weeks." RIGHT: "I caught it pretty early, so I put together a quick proposal for my manager — and she was actually on board right away, which meant I could start implementing within like two weeks." RULE: No more than 2 consecutive sentences that end with a period and start a completely new thought. By the third sentence, chain it to the previous thought with a conjunction.
- PLACE COGNITIVE MARKERS AT THOUGHT TRANSITIONS: Research shows ~6 disfluencies per 100 words in natural speech. Use 2–3 cognitive markers per answer at clause boundaries only — NEVER mid-clause, NEVER two in the same clause, NEVER more than 4 per answer. Markers: "I mean," (self-clarification/rephrase), "actually," (mid-sentence revision), "honestly," (authenticity — once per answer max), "like," (approximation: "we had like 300 accounts"), "you know," (shared understanding — once per answer max), "right," (self-confirmation: "I was doing about 50 calls a day, right, and what I noticed was..."), "— sorry, let me back up —" (narrative reorganization). Place them where the speaker is SHIFTING from one idea to another or SHARPENING a vague statement. EXAMPLE: "So I was handling about — I mean, it was probably 40 to 50 outbound calls a day, and honestly the thing that made the biggest difference was actually slowing down and doing more research before each call."
- USE PHONETIC REDUCTIONS THAT MATCH SPOKEN ENGLISH: Written text uses full forms. Spoken English compresses. ALWAYS use: "gonna" (not "going to"), "wanna" (not "want to"), "'cause" (not "because" in casual explanations), "kinda" (not "kind of"), "a lot" (not "a great deal" or "significantly"), "pretty" (not "quite" or "rather"), "stuff"/"things" (not "various elements" or "multiple factors"), "figured out" (not "determined" or "ascertained"), "messed up" (not "made an error" in vulnerability moments), "ended up" (not "ultimately" or "eventually"). EXCEPTION: Never reduce in the key metric moment — when stating a specific achievement, use precise language: "I increased our conversion rate from 12 to 18 percent" — not "I kinda bumped our numbers up a lot."
- INDICATE EMPHASIS AND PACE SHIFTS: These answers will be read aloud and practiced, so embed delivery cues in the structure. Use em dashes (—) to mark natural pause points where the speaker should breathe and let the point land. Use ALL CAPS for the single word in a key sentence that carries the emphasis: "it wasn't about the VOLUME of calls — it was about the quality of each conversation." Use short sentences (3–6 words) for impact moments, surrounded by longer flowing clauses: "That was the turning point. After that, everything kind of clicked and I went from middle of the pack to consistently hitting 120%." PACE PRINCIPLE: Short sentences = slow down, let it land. Surrounding clauses = normal pace. Numbers and key claims = slow, precise. Transitions = faster. Varying pace within 140–160 wpm is what creates the perception of confidence.
- FIRST-PERSON PRONOUN DOMINANCE (Newman et al., 2003): People who ACTUALLY did something use "I" heavily. People fabricating or inflating use "we," "the team," or passive voice to create distance. RULES: "I" must appear in at least 60% of action sentences. "We" is acceptable for context ("we had a team of four") but NEVER for actions ("I built the sequence" not "we built"). NEVER passive voice for the candidate's own actions ("The pipeline was increased by 40%" → "I grew the pipeline by 40%"). If the candidate genuinely led a team effort, structure it as: "I coordinated with [role] to do X — specifically, my part was Y." Include at least ONE explicit ownership statement per behavioral answer: "That was my call" / "I made that decision" / "I was the one who pushed for that."

PRONOUN DISCIPLINE — CRITICAL:
Authentic speakers own their actions with "I", not "we" or passive constructions. Deception research shows candidates who hide behind "we" and passive voice are perceived as less credible.
- CORRECT: "I built the sequence", "I closed that deal", "I made the call to pivot"
- WRONG: "We ran a campaign", "The deal closed", "A decision was made to..."
- RULE: Use "we" only for genuine team accomplishments where personal ownership would be a lie. Every individual action, decision, and result gets "I".

BAN THESE AI SPEECH PATTERNS — they make answers sound generated, not experienced:
- Formulaic transitions: NEVER use "Furthermore", "Moreover", "In addition", "Additionally", "It's worth noting that", "It is important to note"
- Hedging boilerplate: NEVER "Generally speaking", "In the context of", "From a [X] perspective", "At the end of the day"
- Rhetorical road-mapping: NEVER "In this answer I will cover...", "There are three key points to consider", "To summarize..."
- Uniform cautiousness: Take positions. "I think that approach is wrong" not "different methods may have merit depending on context"
- Passive distance: NEVER "A decision was made", "Challenges were encountered", "Results were achieved" — who did it? Say it directly.

BANNED STRUCTURES — structural AI tells, not just phrases:
- I-chain: NEVER start 3+ consecutive sentences with "I". "I did X. I then Y. I also Z." is robotic and AI-patterned. Break it: "I did X — and then Y kind of fell into place, which meant Z."
- Balanced hedging: NEVER "While X, it's also true that Y." This is AI's signature even-handedness. Real people have opinions. Pick a side.
- Enumeration: NEVER "First... Second... Third..." — say "the main thing was X, and then on top of that Y"
- Meta-commentary: NEVER "That's a great question" (unless genuinely buying time), NEVER "Let me think about that for a second" as a pattern
- Identical sentence length: if three consecutive sentences are all 12–18 words, force at least one to be <8 or >22 words
- Thesis restatement closing: NEVER end with "So that's why I believe I'd be a great fit for this role." End with a specific forward-looking statement or a natural trail-off: "...and that's basically what brought me here."

USE THESE HUMAN PATTERNS INSTEAD:
- Self-interruption: "The thing that — actually no, let me give you a better example..."
- Acknowledged imprecision: "I don't remember the exact number, but it was somewhere around 30%"
- Strong opinions: "Honestly, I think most SDRs waste too much time on low-intent leads" — a strong stance reads as authentic
- Sensory/physical anchors: "I remember sitting at my desk on a Friday..." — specific physical context signals genuine memory, not fabrication

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
- CRITICAL: First sentence must hook with a number immediately — "Over the last [X] years I've closed just over $[X] million across [Y] accounts, mostly in [segment]..." — lead with the metric, not the backstory
- Mentions quota attainment specifically (e.g., "115% in 3 of my 4 years there")
- Shows deal complexity / multi-threading / enterprise motion if present
- Does NOT apologize for moving companies — frames every transition as a deliberate strategic step
- Closes by connecting deal experience to exactly what THIS company is building`
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
- Lead with the most compelling part of the arc, not the chronological beginning

HIRING MANAGER VERSION — deeper, more narrative:
- Include a specific TURNING POINT moment. Real example: 'The turning point was honestly about two years ago at BroadBridge. I was running ABM/ABX... but what excited me wasn't the marketing side. It was when I started getting prospects on the phone.'
- 200-280 words. This round goes deeper.
- Show decision RATIONALE at career transitions — why you left, not just where you went.
- HMs are testing for self-awareness. The best TMAY answers include one honest admission: 'I wasn't sure when it happened exactly' or 'I realized the marketing side wasn't what excited me.'`
    : `STRUCTURE — Present → Past → Future (tell it like a story, not a framework):
Present (2–3 sentences): What they're doing now + one specific metric that proves they're good at it.
Past (2–3 sentences): The ONE experience or turning point that made this career direction click — not a chronological résumé read-through.
Future (1–2 sentences): Why THIS role at THIS company is the natural next chapter.

CRITICAL — First sentence must hook. Not "I am currently at..." but something with energy:
- "So right now I'm at [Company] doing [role], and honestly the thing I love most about it is [specific thing]..."
- "The quick version — I've been in [field] for about X years and I basically live for the part most people dread..."
- Start with what makes their story interesting, not the most boring chronological fact about them

For SDR/BDR:
- Career switcher: the Past section should name the pivot moment directly — own it confidently, don't slide past it
- Include one specific metric (a number, a ranking, a rate — anything concrete)
- End with genuine forward energy: connect to THIS company specifically, not a generic "I'm excited for the opportunity"

REAL-WORLD PATTERNS FROM HIRED CANDIDATES:
- Start with a MOMENT or REALIZATION, not a chronological bio. Example: 'I spent a long time in college convinced I was going to be in finance...' NOT 'I graduated from X University in 2020.'
- Include ONE specific metric from past work. Real example that got someone hired: 'raised $100,000 more than our original goal'
- End with an engagement question: 'What else would you like to know about me?' — this is an instinctive sales move that hiring managers notice. Terry Husayn (250+ SDR interviews) says this question IS the entire interview.
- Keep under 60 seconds / 130-180 words for recruiter screen.
- Career switchers: Draw a THREAD through your whole life that leads to sales. The nonprofit fundraiser mentioned real estate sections as a kid → college internship → current role.
- NEVER start with 'I am a [role] with X years of experience.' Hiring managers report hearing this opening in 80%+ of interviews — it is invisible.`;

  const wordTarget = ctx.stage === "hiring_manager" ? "200–280 words (90–120 seconds spoken)" : "130–200 words (60–90 seconds spoken)";

  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate a "Tell Me About Yourself" narrative for this candidate.

${structure}


- ${wordTarget}
- SPOKEN LANGUAGE: This will be said out loud on a phone call. Use contractions. Vary sentence length. No phrases a human wouldn't say in conversation — "leveraged my expertise" is disqualifying, "used what I learned" is correct.
- Use specific numbers/achievements from their ACTUAL experience — never fabricate
- End with a specific bridge connecting their journey to THIS company and role — name the company and role explicitly

SHOW, DON'T TELL IN CAREER NARRATIVE:
Specific numbers beat vague claims: "hit 127% to quota" not "exceeded expectations"
Quoted moments beat summaries: "my manager told me 'you're the first SDR who's asked me that'" not "I built strong relationships"
Physical context beats emotional labels: "I was the only SDR making calls at 7am" not "I was really dedicated"
Named turning points beat smooth arcs: "the moment it clicked was when I closed a deal my AE had written off" not "I grew a lot in that role"

NESTED DETAILS — one per narrative:
Include one detail that wasn't specifically requested — a small piece of texture that makes the story feel like a memory rather than a pitch. The name of the product they were selling, what city they were in when they got the news, what they said to themselves the night before a big call. One unrequested detail signals the story is real.

ONE AUTHENTIC ROUGH EDGE — required:
A perfect career arc reads as fabricated. Include one moment where something was hard, uncertain, or didn't go as planned — and how the candidate moved through it. Harvard research shows that disclosing a genuine work difficulty increases perceived authenticity because it signals the speaker isn't just managing impressions. This doesn't mean leading with weakness — it means a single honest beat inside an otherwise strong narrative.

NESTED DETAILS REQUIRED (all three must be present):
1. ONE specific metric from a current or previous role — a number, rate, attainment percentage, ranking. Not "exceeded expectations" — a real figure.
2. ONE named tool or methodology they actually used — Outreach, Salesforce, MEDDIC, SPICED, Gong, a framework name. Whatever the resume supports.
3. ONE moment of genuine reflection about career direction — where they realized something, made a deliberate choice, or changed direction. Stated as a specific moment, not a general observation.

PROBE-READINESS — this answer must survive:
- "Tell me more about [specific role]" — each role mentioned needs enough depth in the narrative to continue discussing for 60+ seconds
- "Why did you leave [company]?" — every career transition must have a forward-leaning reason already embedded. Never escape-framing ("I wanted more" not "it wasn't working out").

CANDIDATE:
${buildResumeContext(ctx.resume)}

TARGET: ${ctx.targetRole} at ${ctx.company.name}
COMPANY: ${buildCompanyContext(ctx.company)}
${buildPersonalContextBlock(ctx.personalContext)}
Return ONLY the narrative text. No labels, no JSON, no quotes around it.`,
    maxTokens: 600,
  };
}

// ─── 2. Why Sales / Why This Move ─────────────────────────────────────────────

export function buildWhySalesPrompt(ctx: PromptContext): PromptResult {
  const isAE = ctx.roleType === "account_executive";


  if (isAE) {
    return {
      system: BASE_SYSTEM,
      user: `Generate a "Why are you making this move?" answer for this experienced AE candidate.

AEs don't get asked "Why sales?" — they get asked "Why are you leaving?" and "Why this company specifically at this stage of your career?"

Generate an answer that covers BOTH:
1. Why they're making a move now (forward-looking, not running away — frame it as strategic next step)
2. Why this specific company and role is the right next step (specific to this company's product, market, or growth stage)


REQUIREMENTS:
- 75–150 words
- SPOKEN LANGUAGE: This will be said out loud. Use contractions. Say it like they're talking to a peer — not writing an email. "I've been thinking about this move for a while" not "I have carefully considered this career transition."
- Confident, not defensive — they chose to move, not fled
- Does NOT trash their current/previous employer
- Weaves in something specific about this company — name a product, market position, or customer segment naturally, not as a recited fact
- Should feel like a closer who has thought carefully about this opportunity, not someone who is just job-hunting
CANDIDATE:
${buildResumeContext(ctx.resume)}

COMPANY:
${buildCompanyContext(ctx.company)}
${buildPersonalContextBlock(ctx.personalContext)}
Return ONLY the answer text.`,
      maxTokens: 300,
    };
  }

  return {
    system: BASE_SYSTEM,
    user: `Generate a "Why sales?" answer for this candidate.

This answer must start with a MOMENT, not a statement.

BAD: "I chose sales because I enjoy building relationships and solving problems."
GOOD: "Honestly, sales kind of chose me — I was working at [place] and I realized I was having more fun figuring out what people actually needed than anything else in my day..."

One specific anecdote that made sales click. Not a list of reasons. One story. Then connect that moment to why they're pursuing THIS type of sales role specifically.

For entry-level: The story can be from any job — retail, food service, a campus org. What matters is the MOMENT they realized they were wired for this.
For experienced: The story should be from their actual sales career — a specific call, a deal, a metric they hit. Show they've validated the initial instinct with real results.

REQUIREMENTS:
- 75–150 words — tight, punchy
- SPOKEN: contractions throughout, short sentences mixed with longer ones — no phrase a human wouldn't say on a call
- BANNED: "I've always been passionate about...", "I'm a natural communicator", "I believe I would thrive in sales", "I'm a people person"
- End by connecting the story to why THIS specific type of sales role (SDR, SaaS, B2B — whatever the target is)

NESTED DETAILS REQUIRED (all three must be present):
1. ONE specific MOMENT — not a phase or period, but a specific day, call, interaction, or conversation. "When I was working at [place] and [specific thing happened]" — not "during my time in retail."
2. The EMOTION felt in that moment — not "I was excited" but a physical or behavioral signal: "I couldn't stop thinking about it that night" / "I called my friend right after" / "I stayed two hours late just to keep doing it."
3. What SPECIFICALLY about sales was revealed — not "I'm good with people" but the actual mechanic: "I realized I was wired to figure out what someone actually needed before they could articulate it" / "I genuinely enjoyed the no — it made me want to figure out what I missed."

PROBE-READINESS — this answer must survive:
- "What specifically about that moment clicked?" — the answer must have sensory or physical detail to draw from, not just a summary
- "Was there a time you doubted sales?" — the answer should already acknowledge one honest friction point or uncertainty, so this probe feels pre-answered

REAL-WORLD PATTERNS:
- Start with a SPECIFIC MOMENT, not a statement. The finance major who got hired started with: 'I spent a long time in college convinced I was going to be in finance. But every job description I read bored me to tears...'
- Career switchers should NAME the previous field and explain the PULL toward sales, not the push away from the old career.
- Military candidates: Connect specific military experiences (unit, mission, training moment) to sales traits. Do NOT just say 'military taught me discipline.'
- Teachers: Frame classroom management as coaching, lesson planning as territory planning, student outcomes as metrics.
- Hospitality/retail: Frame customer interactions as discovery, upselling as consultative selling, complaint resolution as objection handling. One hired candidate said: 'I spent 10 years in top-tier steakhouses. My responsibilities included hands-on time programming POS systems' — turned domain knowledge into a credential.
- AVOID: 'I heard the money is good.' While true, this is a red flag when stated as primary motivation.

CANDIDATE:
${buildResumeContext(ctx.resume)}
${buildPersonalContextBlock(ctx.personalContext)}
Return ONLY the answer text.`,
    maxTokens: 350,
  };
}

// ─── 3. Why This Company ──────────────────────────────────────────────────────

export function buildWhyThisCompanyPrompt(ctx: PromptContext): PromptResult {
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

${depthInstruction}

THREE-LAYER STRUCTURE (every stage, every depth level):
1. The PROBLEM (1–2 sentences): Show you understand the market pain they're solving — not just the product features.
   BAD: "I'm excited about ${ctx.company.name} because you're a leader in this space with an innovative platform..."
   GOOD: "What got me was the actual problem they're going after — most [buyers/teams] are dealing with [specific pain] and the way ${ctx.company.name} approaches it is..."
2. Why THIS company's APPROACH (1–2 sentences): Product and market awareness without reciting a spec sheet.
3. Why YOU specifically belong here (1–2 sentences): Connect their mission to your actual background or goals.

If company values are in the profile: EMBODY them in the tone — don't name them. If the value is 'audacity,' the answer should sound bold. If it's 'honesty,' it should feel direct and unpolished.

NESTED DETAILS REQUIRED (all three must be present):
1. The PROBLEM the company solves in plain language — not marketing copy, but how a customer would describe it: "basically their [buyers/teams/companies] are dealing with [specific friction] and there's no good solution that doesn't require..." Not: "they provide an innovative platform that enables..."
2. ONE specific product feature, approach, or differentiator mentioned by name — not "your platform" or "your solution." A named feature, tier, methodology, or market position from the company profile.
3. HOW the candidate discovered or researched this company — shows authentic investigation, not job-board spray. Use the resume/background to make it plausible: "came across it while researching [industry/problem]", "a former colleague who works in this space mentioned it", "found the job posting and then went deep on the product before applying."

PROBE-READINESS — this answer must survive:
- "What do you know about our competitors?" — the answer should reference the competitive landscape naturally or create an obvious setup for this probe
- "Who do you think our ideal customer is?" — the answer must reflect ICP understanding from the company profile, stated in plain language

REQUIREMENTS (all stages):
- Must be specific to THIS company — reference their product, market, ICP, culture signals, or recent news
- DON'T list research facts — weave them in naturally. Sound like you already know this, not like you're presenting a report: "The reason I'm specifically excited about ${ctx.company.name} is..." or "What got me was when I looked at who actually buys this..."
- SPOKEN: This will be said out loud on a call. Use contractions. No sentence a human wouldn't say in conversation.
- Every company detail MUST come from the company profile — never hallucinate facts

REAL-WORLD PATTERNS:
- NEVER recite marketing copy. A CEO literally eye-rolled when a candidate memorized their website paragraph, then said: 'Great, you memorized it. Now pretend I'm your grandmother and do it over.' The candidate simplified to 'You get the hard data for customers and make it easy to understand' — and THAT got them hired.
- Reference SPECIFIC customers by name. Real example: 'Leapfin selling to customers like Reddit, TaskRabbit, and Guideline proves how great this product is.'
- Use the 'grandmother test': Can you explain what this company does in one sentence that a non-technical person understands?
- Show value proposition in SPECIFIC numbers, not vague claims. Good: 'enables 5x as many conversations' Bad: 'increases efficiency.' Great: 'reps will have more conversations in a day than a peer will have in an entire week.'
- ONE candidate at SaaStr got hired on the spot because they had created a free trial account, tested competitors, and brought printouts with improvement recommendations. Signal this level of initiative in the answer.

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


  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate ${questionOverride ? "1 STAR answer" : `${questions.length} STAR answers`} for this candidate.

${questionOverride ? `QUESTION: ${questionOverride}` : `QUESTIONS:\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`}


Remember: this answer will be SPOKEN, not read. It's a story being told to a person in real time.

FOUR-LAYER ANSWER STRUCTURE — every experience-based answer must have all four layers:

LAYER 1 — THE HEADLINE (1 sentence): The claim or conclusion, stated upfront. This is what the interviewer will remember. State the result first, then prove it in the layers below.
  EXAMPLE: "I took our team's outbound response rate from 3% to 11% in about two months."

LAYER 2 — THE CONTEXT (2–3 sentences): Set the scene with PHYSICAL and ORGANIZATIONAL specifics. Answer three things: Where were you (company, team size, your role)? What was the specific problem or goal? What were the concrete stakes — not abstract importance, but real consequences if it failed.
  EXAMPLE: "This was at [Company], a Series B SaaS platform — we had a team of four BDRs and our sequences were basically getting ignored. The VP of Sales had just set a mandate that we needed to double pipeline in Q3 or the team was gonna get restructured."

LAYER 3 — THE SPECIFIC ACTIONS (3–5 sentences): This is where depth lives. MUST include ALL of:
  - SEQUENCED actions (first I did X, then Y, then Z — not "I handled it")
  - NAMED tools and methods (not "I analyzed data" but "I pulled a report in Salesforce and cross-referenced with Gong recordings")
  - A DECISION POINT with reasoning (not just what you did, but WHY you chose that over alternatives)
  - A COMPLICATION or obstacle (something that went wrong or was harder than expected)
  - A SENSORY or PHYSICAL detail that grounds the story in reality ("I spent that whole weekend rebuilding sequences" / "I literally taped the ICP criteria to my monitor")

LAYER 4 — THE REFLECTION (1–2 sentences): What you LEARNED, not what you ACHIEVED. The achievement is already in Layer 1. This layer shows self-awareness, which is more credible than a perfect outcome.
  EXAMPLE: "Looking back, the biggest lesson was that personalization at scale isn't about writing custom emails for everyone — it's about finding the three or four signals that actually predict intent and building around those."
  This layer is REQUIRED — answers that end on the result alone feel rehearsed and scripted.

WHY THIS STRUCTURE SURVIVES PROBING: When the interviewer asks "Tell me more about that," the candidate has nested details to access. "What tool did you use?" → Named in Layer 3. "What went wrong?" → Complication in Layer 3. "Why that approach?" → Decision point in Layer 3. "What would you do differently?" → Reflection in Layer 4. "What were the numbers?" → Headline in Layer 1. Flat answers collapse under probing. Layered answers get RICHER under probing.

REQUIRED DETAILS IN EVERY BEHAVIORAL ANSWER (check all four):
1. PHYSICAL SETTING DETAIL: Where exactly were you when this happened? "I was in the office late that Thursday" / "I'd just gotten off a call with my manager" / "It was end of quarter and we were down on the board" — grounds the story in a real moment
2. QUOTED DIALOGUE: At least one paraphrased quote from someone in the story. Even imprecise: "my manager said something like, 'we can't keep doing this'" / "the prospect literally said, 'I've never had a rep do that before'" — quotes make stories feel witnessed, not summarized
3. INTERNAL THOUGHT PROCESS during the key decision: What were you weighing? What did you almost do instead? "Part of me wanted to just let it go, but..." / "I remember thinking, if I don't do this now, I never will..." / "My first instinct was to escalate it, but then I realized..."
4. A COMPLICATION that made it harder: One thing that went wrong, arrived late, pushed back, or complicated the path. Stories without complications feel rehearsed. Complications feel real.

PROBE-READINESS — this answer must survive:
- "Walk me through that step by step" — Layer 3 must be detailed enough to narrate slowly without inventing new details
- "What was the hardest part?" — the complication in Layer 3 is the answer; it must be specific enough to expand on
- "What would you do differently?" — the reflection in Layer 4 is the answer; it must show genuine learning, not just restating the win

SHOW, DON'T TELL — five techniques that make a story feel experienced vs. invented:
1. SPECIFIC NUMBERS: Not "a lot of calls" → "about 80 dials a day, maybe 12 connects"
2. NAMED TOOLS/METHODS: Not "used our CRM" → "ran the sequence in Outreach, flagged it in Salesforce"
3. QUOTED DIALOGUE: Not "my manager gave feedback" → "she said 'you're pitching before you've earned the right to pitch'"
4. SENSORY/PHYSICAL DETAILS: Not "it was stressful" → "I was in the office until 9pm three nights that week"
5. SEQUENCED ACTIONS: Not "I handled it" → "First I... then I talked to... which led to... and finally..."
Use at least THREE of these five in every answer.

NESTED DETAILS — what authentic memories contain that fabricated ones don't:
Real stories have texture that wasn't specifically requested — who else was in the room, what had just happened before this moment, what you were thinking when you got the news, what the stakes felt like. Weave in one detail that wasn't asked for. It's the difference between a story that feels lived and one that feels constructed.

NATURAL OPENERS (use one variation, never "I would like to share a story about..."):
- "So the situation that comes to mind for this is..."
- "Yeah, this actually happened pretty recently — about [X months] ago..."
- "Honestly the best example I have is when..."

- 150–225 words total (60–90 seconds spoken)
- Must draw from ACTUAL resume bullets — never fabricate
- SPOKEN LANGUAGE: The STAR labels should NOT appear. Use contractions. Vary sentence length. "I was nervous going into that conversation, honestly" is exactly right. "I demonstrated exceptional communication skills" is disqualifying.
- Includes at least one specific metric, name, or concrete detail
- MUST end with the reflection layer — what they learned or would do differently${aeExtra}${panelExtra}

REAL STAR PATTERNS FROM HIRED CANDIDATES:
- The rejection story structure: Lost a deal → asked WHY → discovered the real gap → built a system to prevent it. Real example: 'They chose a competitor who provided a more customized solution. I started asking more probing questions and spending more time understanding each client's specific challenges.'
- Entry-level without sales experience: Use fundraising, student org, volunteer, or academic stories. Real example: 'I reached out to sponsors who rejected me, asking if they would share insights on how I could improve my pitch.' This shows resilience AND coachability simultaneously.
- Include ONE number in every story. Pipeline sourced, percentage improvement, dollar amount, number of calls.
- The reflection layer matters more than the result. Good: 'I now have a 10-item checklist I go through when a mistake occurs, that I developed with my boss and five colleagues.' Bad: 'And that's how I learned to always work harder.'
- RED FLAG: Never switch from 'I' to 'you' when discussing mistakes. 'You should always...' signals deflection. Keep it in first person throughout.

CANDIDATE:
${buildResumeContext(ctx.resume)}

RELEVANCE MAP:
${buildRelevanceContext(ctx.relevanceMap)}
${buildPersonalContextBlock(ctx.personalContext)}
Return JSON:
{"answers": [{"question": "...", "answer": "...", "resumeSource": "which bullet/role this draws from"}]}`,
    maxTokens: 2000,
  };
}

// ─── 5. Comp Expectations ─────────────────────────────────────────────────────

export function buildCompExpectationsPrompt(ctx: PromptContext): PromptResult {
  const compCtx = buildCompListingContext(ctx.jobListingSignals);
  return {
    system: BASE_SYSTEM,
    user: `Generate a comp expectations answer for this candidate applying for ${ctx.targetRole} at ${ctx.company.name}.

${compCtx ? `\n${compCtx}\n` : ""}
This is the most AWKWARD question in the interview and the answer must feel natural, not rehearsed.

STRUCTURE: Acknowledge → Range → Redirect
- Acknowledge: "Yeah, so I've done some research on this..." or "Sure — based on what I've seen for similar roles in this space..."
- Range: Give a range, never a single number. If the listing has a public comp range, acknowledge it: "I noticed the listing mentions $X–Y, and honestly that feels about right for what this involves..."
- Redirect: Pivot to what actually matters: "...but I'm honestly more focused on the opportunity itself. I'd love to understand how the commission structure works — what does a strong performer actually take home?"

NEVER SAY:
- "My salary expectations are..." (too formal, too stiff)
- "I'm flexible on compensation" (signals desperation)
- A single number without a range

BENCHMARK RANGES (calibrate to seniority):
- Entry SDR/BDR: $50K–$80K OTE
- Senior BDR/SDR: $70K–$100K OTE
- AE: $80K–$150K+ OTE — anchor to OTE + upside, not just base

IMPORTANT: This is a DEFLECTION answer, not a depth answer. NO nested details, NO storytelling, NO proof points. The goal is to give a range without killing the deal, then redirect forward. Keep it SHORT.
60–80 words max. This is a screening question, not a negotiation.

REAL NEGOTIATION PATTERNS:
- Default response: 'What is budgeted for the role?' — this is the #1 recommended deflection across Bravado, LinkedIn, and sales hiring communities.
- If pushed: 'Right now I'm focused on the interview process and don't have a number in mind, but I'm confident we'll be able to reach an agreement.'
- NEVER say 'I'm flexible' or 'I'll take whatever you think is fair' — hiring managers see this as a weakness signal.
- For entry-level SDRs, note that one experienced SDR manager warned: 'Negotiating for BDR is HARD because they will tell you you don't have enough experience for a higher base. It doesn't make sense to negotiate an entry-level role like this.' Generate the answer with this context in mind.
- Keep the comp answer to 60-80 words MAX. This is a redirect, not a speech.
Return ONLY the answer text.`,
    maxTokens: 200,
  };
}

// ─── 6. Role Play Script ──────────────────────────────────────────────────────

export function buildRolePlayScriptPrompt(ctx: PromptContext): PromptResult {
  const kb = getKnowledgeForStage("role_play", ctx.resume.backgroundType);
  const isAE = ctx.roleType === "account_executive";

  if (isAE) {
    return {
      system: `${BASE_SYSTEM}

${kb}`,
      user: `Generate a discovery demo script for this AE candidate's role play / live exercise assessment.

The candidate is applying for ${ctx.targetRole} at ${ctx.company.name}.

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

TALK-TO-LISTEN RATIO — the most important mechanic interviewers test for:
Top AEs have a 46:54 talk-to-listen ratio — they speak LESS than their prospect. The script must be written so the prospect talks more than the AE. Discovery questions should be open-ended enough to generate a 60–90 second response. Build in backchanneling after each answer ("Yeah, that tracks..." / "Got it, and when you say X, do you mean...?") to signal listening before asking the next question. A rep who pitches 70% of the time fails — the evaluator is specifically watching for this.

PAIN FUNNEL PROGRESSION — discovery must drill, not skim:
Each discovery question should go one layer deeper than the last. The Sandler model: broad → specific → quantify → urgency.
- Q1: "What's your current process for [X]?" (broad, get them talking)
- Q2: "Where does that break down?" (identify the crack)
- Q3: "How long has that been a friction point?" (establish duration = seriousness)
- Q4: "What have you tried to fix it?" (qualify effort already invested)
- Q5: "What does it actually cost you when [pain] happens?" (quantify stakes)
Do NOT jump from Q1 to the product. The pivot only earns credibility after the prospect has confirmed real pain.

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
    user: `Generate a cold call conversation framework for this candidate's role play assessment.

The candidate is applying for ${ctx.targetRole} at ${ctx.company.name}.

RESEARCH FOUNDATION:
Gong data across 1M+ calls: top-performing reps have a 46:54 talk-to-listen ratio — they talk LESS than the prospect. The #1 failure mode in mock call interviews is a candidate who pitches 70% of the call and barely asks a question. This framework is a CONVERSATION, not a monologue.

FRAMEWORK STRUCTURE (4 parts, in order):

PART 1 — PATTERN INTERRUPT OPENER (target: 10 seconds)
Every prospect has a script for the standard cold call opening. Break it before they can run theirs.
DO NOT write: "Hi [Name], this is [Rep] from [Company] — how are you today?" — that sentence triggers the hang-up reflex in under 2 seconds.
DO write: An honest, disarming opening that acknowledges the interruption + asks permission before pitching.
EXAMPLE STRUCTURE: "Hey [Prospect], this is [Name] with [Company] — I know I'm probably catching you in the middle of something, so I'll be quick. Mind if I take 30 seconds to tell you why I called, and you can tell me if it's worth a few more minutes?"
WHY IT WORKS: Acknowledging the interruption is honest. Asking permission returns control to the prospect. Prospects who say "go ahead" are significantly more likely to stay on the call.

PART 2 — VALUE HYPOTHESIS (target: 15–20 seconds)
ONE sentence. Describe the PROBLEM you solve for companies like theirs — not your product features.
FORMULA: "We work with [similar company type] who are dealing with [specific operational pain]. We've helped them [specific, quantifiable outcome]."
IMPORTANT: Name their ICP and a real pain point from ${ctx.company.name}'s actual market. This is problem-first, not product-first. The prospect should think "that's us" before you ever say what your product does.

PART 3 — DISCOVERY QUESTIONS (target: the bulk of the call — prospect should talk 54%+)
5 questions. Use the Sandler Pain Funnel: start broad, drill to pain, quantify stakes, establish urgency.
Q1 (Broad surface check): "Is that something you're running into?" — short yes/no to confirm relevance before going deep
Q2 (Current state): "Can you tell me a bit more about how you're handling [that problem] currently?" — gets them talking for 30–60 seconds
Q3 (Duration = seriousness): "How long has that been an issue?" — longer = more entrenched = better fit
Q4 (Prior attempts): "What have you tried so far to solve it?" — reveals what they've already bought/tried and why it failed
Q5 (Cost of inaction): "What happens if this doesn't get solved in the next [quarter/6 months]?" — forces them to articulate the stakes themselves
CRITICAL RULE: Do NOT introduce the value prop or product until Q3 at the earliest and only after the prospect confirms real pain. A rep who jumps to pitch after Q1 fails this test every time.
Add one brief backchannel after Q2's expected response ("That tracks — we hear that a lot from [their company type]...") to signal listening before asking Q3.

PART 4 — BRIDGE TO NEXT STEP (target: 10 seconds)
This is NOT "Can I set up a demo?" — that's a generic ask that sounds like every other rep.
FORMULA: Tie the next step directly to what they just said + reference a peer company that solved the same problem.
EXAMPLE: "It sounds like this is actually something worth digging into. Would it make sense to set up 20 minutes with one of our AEs who works specifically with [their company type]? They just helped [similar company] work through the same thing — [one-line specific outcome]."
WHY: Specific next step + peer-company social proof + tied to their stated pain = a credible reason to say yes.

OBJECTION HANDLING — formula: acknowledge → isolate → question:
5 objections to handle. Never fight the objection, never immediately push harder.
Structure: acknowledge it as reasonable ("That's fair — most people I talk to say that at first") → isolate it ("Is that the main thing, or is there something else?") → end with a question that shifts control back to you. The question at the end is the most important part.
Required objections:
- "Not interested / We're all set"
- "Send me an email"
- "We already have a solution"
- "Not the right time"
- "I'm busy / I have to go"

COMPANY:
${buildCompanyContext(ctx.company)}

REAL MOCK CALL INSIGHTS FROM HIRING MANAGERS:
- The call itself matters LESS than how you respond to coaching afterward. Gong gives candidates TWO attempts with coaching between them. Outreach evaluates 'not whether they ace the call but how they respond to coaching.'
- A BDR who self-described his mock call as 'awful' and lasting '5 minutes' still got hired. The CEO said he 'didn't do too bad.' What mattered was recovery, not perfection.
- Framework from Bravado (real advice that got people hired): 'Don't overcomplicate it. Say: We have helped [competitor] in this space with [stat]. We might be able to assist y'all too. Ask for the next call.'
- INCLUDE a self-assessment section at the end: 'After your mock call, say: Here is one thing I did well, and here is specifically what I'd improve next time.' This is explicitly what hiring managers evaluate.
- NEVER include an objection handle that just pushes past the objection. The real pattern: acknowledge → ask a deeper question → reframe. One hired candidate: When told to 'just send an email,' they asked what specific problem they could address in the email — turning a blow-off into discovery.

COACHING NOTE TO INCLUDE:
Generate a coachingNote field with this exact framing, personalized to ${ctx.company.name}'s product and ICP: explain that this is a FRAMEWORK, not a word-for-word script. Memorizing it sounds robotic. The candidate should know the STRUCTURE (interrupt → hypothesis → discover → bridge) and fill it in naturally. In the mock call, they're being tested on whether they can have a CONVERSATION, not recite a pitch.

Return JSON:
{
  "coachingNote": "...",
  "patternInterruptOpener": "...",
  "valueHypothesis": "...",
  "discoveryQuestions": ["...", "...", "...", "...", "..."],
  "objectionResponses": [
    {"objection": "...", "response": "..."},
    {"objection": "...", "response": "..."},
    {"objection": "...", "response": "..."},
    {"objection": "...", "response": "..."},
    {"objection": "...", "response": "..."}
  ],
  "bridgeToNextStep": "..."
}`,
    maxTokens: 1600,
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

Remember: these will be SPOKEN on a live call, not read. Every word should sound like something a confident, unflappable rep would actually say in real time.

OBJECTIONS TO ADDRESS:
${targetObjections.map((o, i) => `${i + 1}. "${o}"`).join("\n")}

FORMULA: Acknowledge → Reframe → Re-engage with a question
- Acknowledge with warmth, not formality: "Yeah, totally fair —" or "I hear you, that makes sense..." NOT "I understand your concern."
- Reframe as a genuine thought, not a tactic: "The thing is..." or "What I've actually found..." NOT "However, I'd like to point out..."
- Question should be curious, not pressuring: "What does the current setup actually look like?" NOT "Would you be open to reconsidering?"

REQUIREMENTS:
- Each response 40–80 words
- Specific to ${ctx.company.name}'s product and ICP — no generic filler
- Natural and conversational — sounds like a rep who's heard this a hundred times and isn't rattled
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

Generate the company research in TWO sections:

SECTION 1 — "WHAT TO SAY" (put this FIRST in the JSON as "sayThis"):
Write a 3–4 sentence conversational summary of what the company does, written as if the candidate were SAYING it aloud to an interviewer who asked "So what do you know about what we do?"

This must sound like a confident person EXPLAINING the company to a friend, not a Wikipedia summary. Use natural, spoken language — contractions, casual transitions, specific details.

Example structure: "So basically, [Company] is building [X] for [Y customers] — think of it as [simple analogy]. What makes them interesting is [differentiator or traction signal]. They're [funding/stage detail] and [growth/momentum signal]."

SECTION 2 — "DEEP RESEARCH" (the remaining fields):
The full company research brief: product details, competitors, recent news, ICP, sales motion, funding. This is REFERENCE material for studying — formatted for reading, not speaking.

Return JSON:
{
  "sayThis": "3–4 sentence spoken summary — natural, conversational, confident",
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

const STAGE_CHEAT_TESTING_SDR: Record<InterviewStage, string> = {
  recruiter: `Example bullets: "Can you explain what you do and why sales in under 90 seconds?" / "Did they research us, or are they mass-applying?" / "Can they have a confident, natural phone conversation with a stranger?"`,
  hiring_manager: `Example bullets: "Do they have real STAR stories with specific numbers?" / "Are they coachable when I push back — or do they get defensive?" / "Is their quota attainment story consistent and believable?"`,
  role_play: `Example bullets: "Do they ask discovery questions before pitching, or lead with features?" / "How do they handle an objection — do they fight it or acknowledge and redirect?" / "When I give feedback at the end, do they implement it immediately or defend themselves?"`,
  panel: `Example bullets: "Are they still sharp and composed after 45+ minutes of pressure?" / "Do they have genuine curiosity about where the company is going, or just prepared answers?" / "Can they handle a curveball question without losing composure?"`,
  take_home: `Example bullets: "Did they research our actual ICP, or use generic targeting?" / "Is this something I'd actually open in my inbox?" / "Do they understand the real problem we solve, or just describe the product?"`,
};

const STAGE_CHEAT_TESTING_AE: Record<InterviewStage, string> = {
  recruiter: `Example bullets: "Can they speak to real numbers — quota attainment, deal sizes, sales cycle — without vagueness?" / "Is their reason for leaving credible and forward-looking?" / "Do they understand what we sell and who buys it?"`,
  hiring_manager: `Example bullets: "Can they walk me through a complex deal from first call to close — not just the highlights?" / "When I probe on a loss, do they show self-awareness or make excuses?" / "Do they know their methodology well enough to name it and apply it?"`,
  role_play: `Example bullets: "Do they run discovery before pitching — or pitch the moment they smell interest?" / "Can they qualify an executive objection without getting rattled?" / "After my feedback, do they visibly adjust — or just say 'got it' and repeat themselves?"`,
  panel: `Example bullets: "Do they have a credible 30/60/90-day plan — or a generic ramp framework?" / "Can they hold their own when a VP pushes back hard on their deal history?" / "Are they closing the process, or just hoping to pass?"`,
  take_home: `Example bullets: "Does the target account show real ICP thinking — or did they just Google the company?" / "Is the email specific enough that I'd forward it to our best rep?" / "Do they understand our competitive position, or describe us generically?"`,
};

const STAGE_CHEAT_ONE_THING: Record<InterviewStage, { sdr: string; ae: string }> = {
  recruiter: {
    sdr: "Did you research us? 50–70% of SDR candidates are cut in round 1 because they clearly didn't.",
    ae: "Can you back up your numbers? Vague quota talk ('I performed well') kills AE candidates in the recruiter screen.",
  },
  hiring_manager: {
    sdr: "Are you coachable? They're watching how you respond to probing questions — not just the answers themselves.",
    ae: "Can you show self-awareness on a deal you lost? HMs trust reps who own their losses more than ones who only share wins.",
  },
  role_play: {
    sdr: "Can you improve after feedback? The re-run after coaching is what they actually evaluate — not the first attempt.",
    ae: "Do you listen before you pitch? AEs who ask 2+ discovery questions before presenting anything advance at 3× the rate.",
  },
  panel: {
    sdr: "Can you handle pressure from multiple people without losing your composure or overexplaining?",
    ae: "Are you closing the process — or just surviving it? The panel expects you to ask for the job at the end.",
  },
  take_home: {
    sdr: "Did you show ICP thinking — or just write a cold email? Research depth is what separates finalists from rejections.",
    ae: "Is this submission something you'd send to a real prospect? Treat it like a live deal, not an assignment.",
  },
};

const STAGE_CHEAT_TIMING: Record<InterviewStage, string> = {
  recruiter: "This call will be 20–30 minutes. Keep answers under 90 seconds. If they want more, they'll ask.",
  hiring_manager: "Expect 45–60 minutes. STAR answers should be 2–3 minutes max — situation fast, your actions slow.",
  role_play: "Cold call: 3–5 minutes. Debrief: 10–15 minutes. The debrief is as important as the call itself.",
  panel: "90+ minutes, back-to-back rounds. Pace yourself — energy at minute 80 matters as much as minute 5.",
  take_home: "Submission turnaround: 24–48 hours unless specified. Quality over speed — one polished deliverable beats three rushed ones.",
};

const STAGE_CHEAT_MISTAKES_SDR: Record<InterviewStage, string[]> = {
  recruiter: [
    "Giving a 5-minute answer to 'Tell me about yourself' — 90 seconds is the target",
    "Saying 'I don't have any questions' when asked",
    "Not knowing what the company actually does or who it sells to",
  ],
  hiring_manager: [
    "Telling a STAR story without a single specific number",
    "Getting defensive when the interviewer pushes back or asks 'but why?'",
    "Answering 'what's your weakness' with a strength in disguise — they've heard it a thousand times",
  ],
  role_play: [
    "Pitching before establishing any pain — leading with features instead of questions",
    "Caving immediately when the prospect objects instead of acknowledging and redirecting",
    "Not implementing the feedback visibly in the second run — they're watching for this specifically",
  ],
  panel: [
    "Running out of questions to ask — bring at least 3, more than you think you'll need",
    "Rambling under pressure from a tough question — shorter, more confident is always better",
    "Not closing the process at the end: 'I'd love to join this team — what are the next steps?'",
  ],
  take_home: [
    "Generic ICP targeting — 'mid-market SaaS companies' instead of a named account with a specific pain",
    "A cold email that could have been sent to anyone — no personalization signal",
    "Submitting without asking 'what would make this an A+ submission?' first",
  ],
};

const STAGE_CHEAT_MISTAKES_AE: Record<InterviewStage, string[]> = {
  recruiter: [
    "Giving a soft number — 'around 100%' instead of 'I hit 112% in Q3 and 97% for the year'",
    "Saying 'I left for more opportunity' without explaining what specifically you were growing toward",
    "Not knowing the company's ICP, deal size, or sales cycle — they'll ask",
  ],
  hiring_manager: [
    "Walking through a deal win without acknowledging what nearly went wrong",
    "Saying you use 'MEDDIC' without being able to walk through a real deal using the framework",
    "Answering 'tell me about a deal you lost' by blaming the prospect or timing",
  ],
  role_play: [
    "Opening with a product pitch before establishing any business pain",
    "Folding on a discount request without understanding why they want it — 'sure, I can do that'",
    "Saying 'good feedback, I'll remember that' after coaching, then running the same play",
  ],
  panel: [
    "A 90-day plan that's all ramp and no pipeline activity — they want to see day 1 instincts",
    "Not having a clear answer to 'why are you leaving?' — it should be a forward-looking decision",
    "Leaving without explicitly asking for the job — panels respect candidates who close",
  ],
  take_home: [
    "Targeting a company that doesn't match the ICP without explaining the logic",
    "An email focused on your product instead of their problem",
    "A polished submission that shows zero competitive awareness",
  ],
};

const STAGE_CHEAT_CLOSER: Record<InterviewStage, { sdr: string; ae: string }> = {
  recruiter: {
    sdr: "'What will the hiring manager be focused on in the next round? I want to make sure I'm prepared.'",
    ae: "'Can you tell me what the hiring manager interview typically focuses on — specifically for AE candidates at this level?'",
  },
  hiring_manager: {
    sdr: "'Based on our conversation, is there anything about my background that gives you pause?'",
    ae: "'Based on everything we've covered — is there anything that would prevent you from moving me forward?'",
  },
  role_play: {
    sdr: "'What specifically were you looking for in that exercise — and did you see it?'",
    ae: "'What did the candidates who advanced do differently in that scenario that I should know for next time?'",
  },
  panel: {
    sdr: "'I'm genuinely excited about this role and this team. What are the next steps from here?'",
    ae: "'I'd love to be part of what you're building. Is there anything preventing you from moving me to the next step?'",
  },
  take_home: {
    sdr: "'What would make this submission stand out as an A+ from your perspective?'",
    ae: "'Before I finalize — is there a specific element of the assignment that matters most to your team?'",
  },
};

export function buildCheatSheetPrompt(ctx: PromptContext): PromptResult {
  const kb = getKnowledgeForStage(ctx.stage, ctx.resume.backgroundType);
  const isAE = ctx.roleType === "account_executive";

  const testingExamples = isAE
    ? STAGE_CHEAT_TESTING_AE[ctx.stage]
    : STAGE_CHEAT_TESTING_SDR[ctx.stage];
  const oneThingExample = isAE
    ? STAGE_CHEAT_ONE_THING[ctx.stage].ae
    : STAGE_CHEAT_ONE_THING[ctx.stage].sdr;
  const timingExample = STAGE_CHEAT_TIMING[ctx.stage];
  const mistakesExamples = isAE
    ? STAGE_CHEAT_MISTAKES_AE[ctx.stage]
    : STAGE_CHEAT_MISTAKES_SDR[ctx.stage];
  const closerExample = isAE
    ? STAGE_CHEAT_CLOSER[ctx.stage].ae
    : STAGE_CHEAT_CLOSER[ctx.stage].sdr;

  // Build the stage-specific "one thing" guidance
  const stageOneThingMap: Record<string, { sdr: string; ae: string }> = {
    recruiter: {
      sdr: "They are filtering for energy and research depth, not sales skill — your TMAY is 80% of this call. 'Without exception, every great SDR I have hired has had a fantastic Tell Me About Yourself.' — Jason Dorfman, CEO Orum (hired 10 from 250+ interviews, 30:1 ratio)",
      ae: "They are validating your numbers and reason for moving. Vague quota talk ('I performed well') kills AE candidates in the recruiter screen. Lead with specifics.",
    },
    hiring_manager: {
      sdr: "Show decision rationale at every career transition. WHY you moved matters more than where you went. They are testing self-awareness and coachability, not polish.",
      ae: "Can you walk through a deal end-to-end with real numbers — not just the highlight reel? HMs trust reps who own their losses more than ones who only share wins.",
    },
    role_play: {
      sdr: "The mock call is a coachability test. When they give you feedback, implement it visibly on your second try. First call performance barely matters. Gong gives candidates TWO attempts with coaching between them. Outreach evaluates 'not whether they ace the call but how they respond to coaching.'",
      ae: "Do you listen before you pitch? AEs who ask 2+ discovery questions before presenting anything advance at 3× the rate. The talk-to-listen ratio is what they actually measure.",
    },
    panel: {
      sdr: "You are being evaluated by 3-4 people who will compare notes. Be consistent but tailor depth to each person's function. Close the process at the end — panels respect candidates who ask for the job.",
      ae: "Are you closing the process — or just surviving it? The panel expects you to ask for the job. A 90-day plan that's all ramp and no pipeline activity signals you don't have day-1 instincts.",
    },
    take_home: {
      sdr: "Did you show ICP thinking — or just write a cold email? Research depth is what separates finalists from rejections.",
      ae: "Is this submission something you'd send to a real prospect? Treat it like a live deal, not an assignment.",
    },
  };
  const stageOneThing = isAE
    ? (stageOneThingMap[ctx.stage]?.ae ?? oneThingExample)
    : (stageOneThingMap[ctx.stage]?.sdr ?? oneThingExample);

  // Seniority label for prompt
  const seniorityLabel = ctx.seniority === "entry" ? "entry-level" : ctx.seniority === "senior" ? "senior" : "mid-level";

  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate a cheat sheet for a ${seniorityLabel} ${isAE ? "Account Executive" : "SDR/BDR"} candidate interviewing at ${ctx.company.name} for the ${ctx.stage} round.

This cheat sheet should feel like a note from a mentor who has sat in hundreds of interviews at THIS company, for THIS stage. Not a generic tip sheet. Direct, warm, like a coach texting you 5 minutes before the call. Short sentences. No fluff. Use "you" and "they" language. This is tactical, not inspirational.

CANDIDATE:
${buildResumeContext(ctx.resume)}

COMPANY:
${buildCompanyContext(ctx.company)}

Generate EXACTLY this structure — concise, fits on ONE mobile screen:

1. WHAT THEY'RE REALLY TESTING FOR (2–3 bullets, 1 sentence each):
   Not the obvious skills — the HIDDEN evaluation criteria.
   For recruiter screens: phone presence, enthusiasm, basic research.
   For HM rounds: depth of thought, self-awareness, why THIS company specifically.
   For role-play: coachability (not call performance), discovery skills, recovery from objections.
   For panel: consistency across interviewers, strategic depth, closing instinct.
   Use the candidate's specific background to make these feel personal.
   ${testingExamples}

2. THE ONE THING THAT MATTERS MOST (1-2 sentences):
   The single most important thing for THIS specific stage. Be blunt.
   For this stage: ${stageOneThing}

3. YOUR TIMING (1 line):
   How long this stage typically runs, how to pace.
   ${timingExample}

4. THREE MISTAKES THAT END INTERVIEWS (exactly 3 bullets):
   Real examples from hiring managers — not generic advice. Adapt to this candidate's background.
   REAL EXAMPLES TO DRAW FROM:
   - 'A VPM candidate in the 4th round hadn't watched the 2-minute explainer video. Interview ended in 10 minutes.' — SaaStr
   - 'I get questions like "Is the company remote?" This reflects poorly on research skills.' — Elric Legloire (220+ interviews)
   - 'If someone says they are hesitant about the phone, that's a huge red flag for me.' — HubSpot hiring manager
   - 'I am the best in the world at cold calling' — Victor Vatus flagged this as an instant no
   - A CRO candidate in a FINAL interview didn't know 66% of revenue came from channel. Interview ended immediately.
   Stage-specific examples: ${mistakesExamples.map((m) => `\n   - "${m}"`).join("")}

5. YOUR CLOSER (in quotes — the exact words to end the interview):
   Always close the interview. This is a sales interview — they notice if you don't close.
   Default: "Based on everything we've discussed, I'm confident I am a great fit for this role. Do you have any questions or concerns that would hold you back from moving me forward?"
   Stage-adapted example: ${closerExample}

6. QUICK TALK TRACK (your back-pocket ammo — memorize these 4 lines):
   a. 30-SECOND TMAY: Not the full 90-second version — the elevator pitch if they say "give me the quick version." One sentence on what you do now + one metric + one sentence on why you're here. Under 30 seconds spoken.
   b. GRANDMOTHER-TEST COMPANY DESCRIPTION: One sentence explaining what ${ctx.company.name} does that a non-technical person would understand. Not marketing copy. "They basically [simple verb] for [who] so they can [outcome]."
   c. ONE PREPARED METRIC: The single most impressive number from your resume to drop naturally. Not "I exceeded expectations" — a real number: "127% to quota", "$1.2M pipeline in Q3", "highest connect rate on a team of 12." Pick the one that's most relevant to ${ctx.company.name}.
   d. CLOSING LINE: The exact words above, practiced until they feel natural — not rehearsed.

'The questions they ask are more important than their responses to my questions.' — Chili Piper hiring manager. Your questions reveal whether you're a serious candidate or just going through motions.

SENIORITY CALIBRATION (${seniorityLabel}):
${ctx.seniority === "entry" ? "- Coaching tone. Briefly explain WHY each point matters — this may be their first real sales interview." : ctx.seniority === "senior" ? "- Brief and strategic. Skip the obvious. Focus on the political dynamics and executive-level signals." : "- Direct. Assumes basic interview knowledge. Focus on what's specific to THIS company and stage."}

Return JSON:
{
  "testing": ["...", "...", "..."],
  "oneThingThatMatters": "...",
  "timing": "...",
  "commonMistakes": ["...", "...", "..."],
  "closer": "...",
  "quickTalkTrack": {
    "thirtySecondTmay": "...",
    "grandmotherCompanyDescription": "...",
    "preparedMetric": "...",
    "closingLine": "..."
  }
}`,
    maxTokens: 1000,
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
  const isAE = ctx.roleType === "account_executive";
  const jdSnippet = ctx.jobDescription
    ? `\nJOB DESCRIPTION SIGNALS (use to make questions specific — never ask anything already answered here):\n${ctx.jobDescription.slice(0, 500)}`
    : "";
  const careerPathSignal = ctx.jobListingSignals?.careerPath
    ? `\nCAREER PATH SIGNAL: The listing mentions progression to ${ctx.jobListingSignals.careerPath} — the growth path question should reference this specifically.`
    : "";

  return {
    system: BASE_SYSTEM,
    user: `Generate 4 questions for this candidate to ask in their ${ctx.stage} interview at ${ctx.company.name}.

RESEARCH FOUNDATION (Huang et al., Harvard 2017):
Asking follow-up questions — questions that naturally extend what the interviewer just said — is the single strongest driver of interpersonal liking, stronger than any other conversational behavior. Generate a chain (primary + follow-up) for each question, where the follow-up sounds like it could ONLY exist because the candidate was actually listening.

STAGE CONTEXT: ${STAGE_QUESTION_CONTEXT[ctx.stage]}

GENERATE EXACTLY THESE 4 QUESTION TYPES IN ORDER:

1. ROLE MECHANICS (questionType: "role_mechanics")
Primary: How the role actually works day-to-day — the real split, the real workflow, the stuff not in the job listing.
Follow-up: Extends into a specific mechanic their answer will likely surface (handoff process, tool usage, collaboration pattern).
The primary must use "like" or "actually" or a contraction — it must sound like someone asking, not interviewing.
${isAE ? 'AE focus: territory structure, deal cycles, SDR support, forecast process.' : 'SDR/BDR focus: prospecting split, sequence ownership, AE handoff, call vs email ratio.'}

2. PERFORMANCE (questionType: "performance")
Primary: Ask for a REAL number — what % of the team hit number last quarter, or what quota attainment looks like.
This signals the candidate thinks like a rep who qualifies opportunities, not a job applicant.
Follow-up: What separates the ones hitting from the ones missing — is it volume, approach, or something else?
NEVER ask a version of this that can be answered from Glassdoor or the listing.

3. GROWTH PATH (questionType: "growth_path")
Primary: About career trajectory FROM this role — with a specific timeline ask, not a vague "what does growth look like."
Follow-up: Is it tenure-based or performance-based? Has anyone made the jump faster than typical?${careerPathSignal}

4. OBJECTION-SURFACING CLOSE (questionType: "close")
This is the final question — always. No follow-up needed.
Surface any hesitation the interviewer has before the candidate leaves the room.
Vary the phrasing based on stage:
- Recruiter: "Before we wrap — is there anything about my background that gives you pause, or anything you'd want me to address with the hiring manager?"
- HM/Panel: "Based on everything we've talked about, is there anything that makes you hesitant about moving me forward? I'd rather address it now."
This one question, asked confidently, gets more offers than any other technique in the interview.

VOICE RULES (non-negotiable):
- Contractions required: "what's", "that's", "you'd", "I'm", "isn't"
- Approximation markers: "like", "kind of", "basically", "roughly" — in the primary questions
- NEVER: "Could you elaborate on...", "I'd be curious to understand...", "What is your perspective on..."
- Questions must reference something SPECIFIC to ${ctx.company.name}, this role, or this conversation — not interchangeable with any other company
- NEVER ask anything answerable from the job listing or company website
- NEVER ask about benefits, PTO, or perks at the recruiter stage

REAL QUESTIONS THAT GOT CANDIDATES HIRED (from Bravado, Orum, and hiring manager interviews):
- 'What does your top performer do differently from your worst performer?' — shows competitive mindset
- 'If we started this interview over, can you coach me on something I could have done better?' — demonstrates coachability in real-time. Multiple hiring managers across Orum, Bravado, and LinkedIn independently called this one of the best questions they've ever received.
- 'What percentage of reps hit quota and at what point in the year is that typically?'
- 'What's comp like during onboarding? Is there a non-recoverable draw?' — shows business sophistication
- ALWAYS end with a CLOSE: 'Based on everything we've discussed, I am confident I am a great fit. Do you have any concerns that would hold you back from moving me forward?' This mirrors a sales close and every hiring manager notices it.
- RED FLAG questions to NEVER generate: 'Is the company remote?' (Googleable), 'How many people are on the team?' (shows zero research), 'What are the next steps?' (passive, no close)

COACHING NOTE TO INCLUDE:
Write a 2-sentence coaching note reminding the candidate these are NOT a checklist — pick 2–3 based on conversation flow, and the follow-ups only work if you were actually listening. If the answer goes somewhere unexpected, skip the planned follow-up and ask what you're genuinely curious about.${jdSnippet}

COMPANY:
${buildCompanyContext(ctx.company)}

Return JSON:
{
  "coachingNote": "2-sentence coaching note about how to use these",
  "questions": [
    {
      "questionType": "role_mechanics",
      "primary": "full conversational primary question",
      "followUp": "natural follow-up that could only exist because they were listening",
      "why": "what this signals to the interviewer"
    }
  ]
}
The "close" question has followUp: null.`,
    maxTokens: 1000,
  };
}

// ─── 11. Coachability Coaching ────────────────────────────────────────────────

export function buildCoachabilityCoachingPrompt(ctx: PromptContext): PromptResult {
  const kb = getKnowledgeForStage("role_play", ctx.resume.backgroundType);
  const isAE = ctx.roleType === "account_executive";
  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate coachability coaching for this candidate's ${isAE ? "discovery demo" : "cold call"} role play assessment at ${ctx.company.name}.

RESEARCH FOUNDATION (Roberge, HubSpot):
Across 1,000+ sales hires, coachability was the #1 predictor of success — more than curiosity, intelligence, prior quota attainment, or work ethic. Traditional "sales" traits like aggressiveness had the WORST correlation. The coachability test structure: roleplay → self-assessment → feedback → immediate redo → evaluate implementation.

COACHING MUST COVER ALL FIVE MOMENTS:

1. BEFORE THE FIRST ATTEMPT: The first attempt establishes a baseline. It does NOT need to be perfect. Focus on: clear opener, qualifying questions, talk less than the prospect. Don't burn mental energy trying to be flawless — save it for the redo.

2. THE SELF-ASSESSMENT (first real test): When they ask "how do you think you did?" — don't say "I think I did well." That's a red flag. Give specific self-critique: name ONE thing that worked and TWO things to improve. Example: "My opener landed okay but I jumped to the pitch too fast — I should've asked at least one more discovery question before mentioning the product." This isn't modesty theater. It's diagnostic ability. Show you can evaluate your own performance accurately.

3. RECEIVING FEEDBACK (this is where most candidates lose): Their first reaction matters more than anything. DO: nod, say "that makes sense," ask a clarifying question that shows you absorbed it ("so when you say focus more on discovery — do you mean before I even mention the product, or just slow down the transition?"). DON'T: defend yourself, explain why you did it that way, say "but what I was trying to do was..." — defensiveness is the #1 killer in this moment.

4. THE REDO (where the job is won or lost): You have 60–90 seconds to internalize and try again. You don't need to be perfect — you need VISIBLE IMPLEMENTATION of the specific feedback. If they said "ask more questions" — ask more questions, even if the rest is rougher. If they said "slow down" — slow down visibly, even if it feels awkward. Effort beats perfection every time.

5. AFTER THE REDO — brief self-assess again: "That felt better — I gave them more room to talk. I'd still want to work on [X] but the feedback really clicked." This closes the loop and shows you're already integrating the learning.

ROLE-SPECIFIC MOST COMMON MISTAKES TO ADDRESS:
${isAE ? "Pitching before confirming pain. Not connecting the demo to their specific stated problem. Defending your demo approach when they redirect you. Running through features instead of solving the problem they named." : "Feature-dumping without discovery. Freezing on the first hard objection. Not asking for next steps at the end. Talking 70%+ of the time."}

COMPANY:
${buildCompanyContext(ctx.company)}

TONE: Write like a friend who has coached 50 people through this exact moment — direct, informal, specific. Not a training manual. Give the candidate actual language to use, not principles to remember.

Return ONLY the coaching text (no JSON, no headers). 5–8 sentences. Include at least two examples of specific language to use in the moment.`,
    maxTokens: 600,
  };
}

// ─── 11b. Coachability Game Plan ──────────────────────────────────────────────

export function buildCoachabilityGamePlanPrompt(ctx: PromptContext): PromptResult {
  const isAE = ctx.roleType === "account_executive";
  return {
    system: BASE_SYSTEM,
    user: `Generate a coachability game plan for this candidate's ${isAE ? "discovery demo" : "cold call"} role play assessment at ${ctx.company.name}.

RESEARCH FOUNDATION (Roberge, HubSpot, 1,000+ hires):
Coachability is the #1 predictor of sales success. The entire roleplay exercise — including the self-assessment and redo — is a single test of one question: "If I hire this person, can I coach them? Will they get better every week? Or will they argue and plateau?" Show them you're a sponge.

Generate a structured game plan with these exact five sections. Write in direct second-person ("you"), conversational, like a coach talking to someone the night before. Each section should feel like advice from someone who has watched hundreds of candidates do this.

SECTION 1 — BEFORE THE ROLEPLAY
What to expect, how to prepare, what mindset to bring. The first attempt is a baseline — don't burn energy on perfection. Cover: what they'll brief you on, what to focus on, what to ignore for now.

SECTION 2 — THE SELF-ASSESSMENT (first real test)
When they ask "how do you think you did?" — this is test #1. Explain exactly what to say and what to avoid. The formula: one thing that worked + two specific things to improve. Give a template sentence they can adapt. Make clear this is about diagnostic ability, not modesty.

SECTION 3 — RECEIVING FEEDBACK
Their first reaction defines the hire/no-hire. Cover: what to do (nod, acknowledge, ask a clarifying question that proves absorption), what NEVER to do (defend, explain, say "but what I was trying to do was..."). Give one example of the clarifying question they should ask.

SECTION 4 — THE REDO (where the job is won or lost)
They have 60–90 seconds to internalize and try again. Visible implementation beats perfection. Cover: what "implementing feedback" looks like concretely for a ${isAE ? "discovery demo" : "cold call"}, what to say after the redo to close the loop.

SECTION 5 — THE META-SIGNAL
One paragraph. The entire exercise tests one thing. Make it visceral: if you implement feedback, you signal coachability, growth trajectory, and that managing you will be easy. If you defend, you signal a management problem. Frame this as the most important 10 minutes of the entire process.

ROLE-SPECIFIC CONTEXT for ${ctx.company.name}:
${isAE ? `This is a discovery demo. They'll play a ${ctx.company.name} ICP buyer. Your goal is discovery-first — understand their pain before you touch the product. The feedback will almost certainly be about talking too much or pitching too early.` : `This is a cold call. They'll play a skeptical prospect. Your goal is pattern interrupt, earn permission, ask 2+ discovery questions before any value prop. The feedback will almost certainly be about jumping to pitch too fast or not handling the objection cleanly.`}

COMPANY: ${ctx.company.name}${ctx.company.productDescription ? ` — ${ctx.company.productDescription}` : ""}

Return JSON:
{
  "beforeRoleplay": "coaching text for section 1",
  "selfAssessment": "coaching text for section 2",
  "receivingFeedback": "coaching text for section 3",
  "theRedo": "coaching text for section 4",
  "metaSignal": "coaching text for section 5"
}`,
    maxTokens: 900,
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
2. The bridge phrasing — what the candidate would actually SAY out loud
3. The sales scenario where this experience applies in this role

SPOKEN LANGUAGE: These bridges will be used verbally in an interview. The bridgePhrasing should sound like something a person would actually say — not a polished LinkedIn post.

GOOD BRIDGE PHRASING STYLE:
- "Honestly, the way I think about it — working [retail/hospitality/etc.] taught me to read a room in about 30 seconds. Every customer was a different kind of prospect. I was basically doing discovery calls without knowing what they were called."
- "In [previous role] I was basically hitting a quota every [day/week] — not in a sales context, but the pressure and the rhythm were identical."
NOT: "My experience in [role] provided me with transferable skills that align closely with the requirements of a sales position."

REQUIREMENTS:
- 3–5 bridges covering the most impactful experiences
- Each bridge should work as a standalone answer in an interview
- Never say "even though I don't have direct sales experience" — reframe as "different path, same skills"
- Specific: actual job titles, industries, situations, and numbers where available
${buildPersonalContextBlock(ctx.personalContext)}
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

  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate a "Walk me through your resume" answer for a hiring manager interview.

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

TRANSITIONS BETWEEN ROLES: Use natural connective language — not formal chronology.
- "So from there I moved to..." / "Which led me to..." / "And that's what brought me to..."
- NOT: "Subsequently I transitioned to..." / "Following that experience I pursued..." / "At this juncture in my career...""

CANDIDATE:
${buildResumeContext(ctx.resume)}

TARGET: ${ctx.targetRole} at ${ctx.company.name}
COMPANY: ${buildCompanyContext(ctx.company)}

RELEVANCE MAP:
${buildRelevanceContext(ctx.relevanceMap)}
${buildPersonalContextBlock(ctx.personalContext)}
Return ONLY the narrative text. No labels, no JSON, no quotes around it.`,
    maxTokens: 800,
  };
}

// ─── 14. Constructive Feedback ────────────────────────────────────────────────

export function buildConstructiveFeedbackPrompt(ctx: PromptContext): PromptResult {
  const kb = getKnowledgeForStage("hiring_manager", ctx.resume.backgroundType);

  return {
    system: `${BASE_SYSTEM}

${kb}`,
    user: `Generate an answer to "Tell me about the last piece of constructive feedback you received and what you did with it."

This question tests the #1 SDR trait hiring managers hire for: coachability.

Remember: this answer will be SPOKEN, not read. Start in the middle of the story — not at the administrative beginning of it.

BAD OPENER: "The last piece of constructive feedback I received was from my manager approximately six months ago regarding my [X]..."
GOOD OPENER: "So about six months ago my manager pulled me aside and basically said..." or "Honestly the most useful feedback I've gotten recently was kind of hard to hear at first..."

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
    case "coachability_game_plan":
      return buildCoachabilityGamePlanPrompt(ctx);
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
