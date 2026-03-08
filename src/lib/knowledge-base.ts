/**
 * Knowledge Base — 5 Core Documents
 *
 * These documents are the product's primary moat. They encode sales hiring
 * expertise into every generation call. Injected into system prompts via
 * getKnowledgeForStage() based on the user's interview stage and background.
 */

// ─── Document 1: Interview Stage Decoder ─────────────────────────────────────

export const STAGE_DECODER = `
## SDR Interview Stage Decoder

### Round 1 — Recruiter Screen (15–30 min)
**What is actually being evaluated:**
- Phone/video presence and energy. Sales is a communication sport — if the recruiter has low energy after your call, they'll assume prospects will too.
- Basic qualification: location, comp alignment, start availability.
- Genuine motivation: "Why sales?" and "Why this company?" — recruiters can immediately detect generic answers vs. real interest.
- Communication style: are you concise and clear, or do you ramble?

**Common disqualifiers:**
- Generic "I love people" answer to "Why sales?"
- No knowledge of the company's product, market, or recent news
- Compensation expectations wildly outside the range
- Monotone delivery or nervous filler words (um, like, you know)

**What the recruiter wants to see:**
A candidate who already sounds like they belong in sales — confident, enthusiastic, clear, curious. They are filtering for "would I want to cold call with this person next to me?"

---

### Round 2 — Hiring Manager Interview (30–45 min)
**What is actually being evaluated:**
- Coachability: the #1 trait SDR hiring managers prioritize. Not perfection — coachability. Can you receive feedback without becoming defensive?
- Grit/resilience: Can you tell a story about failure or adversity that frames you as the hero who learned, not the victim who quit?
- Self-awareness: Do you understand your own strengths and development areas?
- Work ethic/hustle signals: Evidence of doing more than required, outworking peers, proactively upskilling.
- Storytelling: STAR format (Situation, Task, Action, Result) with specific metrics and outcomes.

**Scoring rubric hiring managers use:**
- Communication: 1–5 (are stories clear, structured, appropriately concise?)
- Coachability: 1–5 (do they take feedback? Do they frame failures as learning?)
- Grit/Resilience: 1–5 (hero or victim? Did they push through or give up?)
- Drive/Initiative: 1–5 (did they go above and beyond? Self-start?)
- Preparation: 1–5 (do they know the company's product and market?)

**Common disqualifiers:**
- "Victim" framing: "My manager was terrible so I left" vs. "I learned what I needed from that role"
- Vague answers without specific metrics, names, or outcomes
- Inability to articulate "why this company" with specificity
- Defensive response when the interviewer pushes back gently on an answer

---

### Round 3 — Role Play / Cold Call Assessment (30–60 min)
**What is actually being evaluated:**
- Coachability above all else: After the first call attempt, the interviewer will give feedback. How the candidate responds to that feedback — not the quality of the first call — is what decides the outcome. Candidates who immediately incorporate feedback on the second attempt pass. Candidates who argue or repeat the same mistakes fail.
- Structure: Does the candidate have a framework? Opening → discovery questions → value prop → handle objection → close for next steps.
- Discovery instinct: Do they ask questions before pitching? 81% of candidates who jump straight into features without discovery questions fail this round.
- Resilience under pressure: Can they maintain energy and composure when the "prospect" says "not interested" or "send me an email"?
- Close: Do they ask for the next step? Candidates who don't close in the role play signal they won't close in real prospecting.

**The coachability loop:**
After the first attempt, the interviewer will say something like: "Good first attempt. One thing I'd try — ask a discovery question before jumping into your pitch. Want to try it again?" The correct response is: "Absolutely. I appreciate that feedback." Then do exactly what they said on the second attempt.

**Common disqualifiers:**
- Feature dumping without asking a single question
- Going silent or freezing when the prospect says "not interested"
- Failing to close for a specific next step (meeting, follow-up call)
- Arguing with the interviewer's feedback instead of implementing it

---

### Round 4 — Panel / Final Round (30–60 min)
**What is actually being evaluated:**
- Cultural fit and team energy: Will this person energize the team? Sales floors have culture. Low energy candidates don't get offers.
- Executive presence and self-awareness: Can they articulate their career trajectory? Do they have perspective on their own growth?
- Genuine curiosity: The quality of questions they ask signals how they'll approach learning the product and market.
- Consistency: Does their story match what they said in rounds 1–3?
- Closing instinct: Great candidates close the interviewer. After the final round, they say "I'm very excited about this role — what are the next steps and timeline?" Non-closers signal they won't close prospects.

**Common disqualifiers:**
- Asking no questions, or only asking about vacation policy/comp
- Low energy after a long process
- Inconsistency with earlier round answers
- Failing to express genuine enthusiasm or ask for the job
`;

// ─── Document 2: Career Switcher Framing Guide ──────────────────────────────

export const CAREER_SWITCHER_GUIDE = `
## Career Switcher Framing for SDR Interviews

### The Core Insight
Sales hiring managers at the SDR level have hired teachers, bartenders, military veterans, retail managers, personal trainers, and customer service reps who outperformed traditional sales backgrounds. What matters is not where you've been — it's whether you can demonstrate the underlying competencies through relevant stories.

### Experience Translation Map

**Customer Service / Call Center → Objection handling, volume, resilience**
- Translation: "In my customer service role, I handled 80+ calls/day, many from frustrated customers. I developed the ability to reframe a negative situation, find common ground, and turn a complaint into a resolution — which is exactly the skill of handling a prospect who says 'not interested.'"

**Retail Sales → Upselling, reading buying signals, closing**
- Translation: "In retail, I learned to qualify a customer's needs before recommending a product and to ask for the sale without feeling pushy. I consistently exceeded upsell targets because I listened before pitching."

**Teaching / Coaching → Communication, patience, simplifying complexity**
- Translation: "Teaching taught me to take something complex and make it immediately understandable to someone with no context — which is exactly what you do on a cold call when you have 20 seconds to explain why someone should care."

**Hospitality / Restaurant → Handling pressure, multitasking, relationship building**
- Translation: "Working in hospitality means performing under pressure, managing multiple priorities, and making every interaction feel personalized — even when you're slammed. That's the same mental model as managing a high-volume SDR book."

**Military / Law Enforcement → Discipline, resilience, following process**
- Translation: "Military service taught me that you don't need to be the most talented person in the room — you need to be the most disciplined and the most coachable. I hit my targets by following the playbook consistently while others improvised."

**Recruiting → Outbound prospecting, pipeline management, consultative selling**
- Translation: "Recruiting is sales with a human product. I sourced, qualified, and closed candidates while managing client expectations — the same dual-stakeholder management that enterprise SDRs deal with."

### The "Same Skills, New Context" Narrative Arc
Structure every career-switcher story as:
1. What I was doing → (brief context, 1 sentence)
2. The skill I developed → (specific, with evidence)
3. How it applies to sales → (direct bridge, confident)
4. Why I chose sales now → (genuine motivation, not desperation)

### What Career Switchers Get Wrong
- Apologizing for their background ("I know I don't have direct sales experience, but...")
- Over-explaining the switch instead of selling it confidently
- Failing to demonstrate any self-education (have you read a sales book? Taken a course? Done mock cold calls?)
- Presenting the switch as financial need rather than career conviction
`;

// ─── Document 3: Cold Call Playbook ──────────────────────────────────────────

export const COLD_CALL_PLAYBOOK = `
## Cold Call Playbook for SDR Role Play Assessments

### The Role Play Interview Format
The interviewer will give you a one-page briefing sheet: the company's product, the target persona, and sometimes common objections. You'll have 2–5 minutes to review, then execute a mock cold call with the interviewer playing the prospect. After your first attempt, they'll give you feedback and ask you to try again.

### The Cold Call Framework (5 Parts)

**Part 1: Pattern Interrupt Opener (5–7 seconds)**
Do NOT start with "Hi [Name], did I catch you at a bad time?" — this primes a "yes" answer.
Instead, use a direct, confident opener:
- "Hey [Name], this is [Your Name] from [Company] — I'll be brief. The reason I'm reaching out is [specific reason]. Quick question..."
- "Hey [Name], caught you at your desk? I'll be quick — I'm calling because [specific insight about their situation]. Is that something you're dealing with?"

**Part 2: Discovery Questions (ask BEFORE pitching — 2–3 questions)**
This is where 81% of candidates fail. They pitch before asking. The questions should qualify while showing genuine curiosity:
- "How are you currently handling [problem the product solves]?"
- "What's your biggest challenge with [area]?"
- "Out of curiosity, what does your current process for [X] look like?"

**Part 3: Value Proposition (1–2 sentences, problem-first)**
Only deliver after you've heard their pain. Structure: "Based on what you just said — [repeat their pain back] — that's exactly why companies like [reference customer] use [product]. We help [persona] [achieve outcome] without [common obstacle]."

**Part 4: Objection Handling (the 5 most common)**

"Not interested" / "We're all set":
→ "Totally understand — most [personas] I speak with say the same thing until they see [specific outcome]. What would it take for you to consider a change from your current approach?"

"Send me an email":
→ "I can absolutely do that. So I send you the right thing — what specifically were you most curious about from what I just shared?"

"We already have a solution":
→ "That's great context. Out of curiosity, are you getting [specific outcome/metric] from your current solution? That's typically where we complement what teams already have."

"Not the right time":
→ "I hear you. When does it make sense to revisit? I'd rather reconnect at the right time than waste yours now."

"I'm busy / I have to go":
→ "I respect your time completely — one last quick question: [most important qualifying question]. Your answer helps me know if there's even a reason to reconnect."

**Part 5: Close for Next Steps (always ask)**
Never end a call without asking for something specific:
- "Based on our conversation, would it make sense to schedule 20 minutes next week for a proper demo?"
- "Would you be open to a 15-minute call with our AE to dig into [specific pain they mentioned]?"

### The Coachability Moment
After the first call, the interviewer WILL give you feedback. The correct response:
1. Say "I appreciate that — that's really helpful." (never argue)
2. Immediately ask a clarifying question if needed
3. On the second call, EXPLICITLY implement the feedback, even verbatim if possible
4. This moment — not the first call — is what gets you the offer

### Scoring What Interviewers Actually Evaluate
1. Did they ask discovery questions before pitching? (most important)
2. Did they handle at least one objection without crumbling?
3. Did they close for a specific next step?
4. Did they take feedback gracefully and implement it on the second attempt?
5. Was their energy consistent throughout?
`;

// ─── Document 4: Behavioral Question Bible ───────────────────────────────────

export const BEHAVIORAL_QUESTION_BIBLE = `
## SDR Behavioral Interview Question Bible

### STAR Framework
Every behavioral answer should follow: Situation (10%) → Task/Challenge (10%) → Action (60%) → Result (20%)
Common mistake: candidates spend 60% on Situation and 10% on Action. Interviewers want to hear what YOU did, not what the situation was. Target length: 60–90 seconds spoken (150–225 words written).

### The 12 Most Common SDR Behavioral Questions + What They're Testing

**1. "Tell me about a time you overcame a significant obstacle or failure."**
Testing: Grit, resilience, hero vs. victim framing, self-awareness
Hero frame: "Here's what happened, here's what I did about it, here's what I learned."
Victim frame (avoid): "Here's what went wrong because of [external factor]."

**2. "Tell me about a time you were rejected repeatedly and kept going."**
Testing: Resilience in the face of high-volume rejection (core SDR requirement)
Must include: specific evidence of persistence, not just "I kept going"

**3. "Describe a situation where you had to learn something new very quickly."**
Testing: Coachability, learning agility, humility
Strong answers: show a specific system or process you used to learn, not just "I worked hard"

**4. "Tell me about a time you exceeded a goal or quota."**
Testing: Drive, metrics-orientation, competitive instinct
Must include: the actual number (percentage over quota, revenue amount, ranking vs. peers)

**5. "Describe a time you received feedback that was hard to hear. How did you respond?"**
Testing: Coachability (the #1 SDR trait). This is often the most important behavioral question.
Strong answer: acknowledge the feedback, describe implementing it immediately, share outcome
Red flag: any hint of "but I disagreed with the feedback"

**6. "Tell me about a time you had to influence someone without having authority."**
Testing: Communication, persuasion, early sales instinct

**7. "Describe a time you worked in a high-volume, fast-paced environment."**
Testing: Readiness for SDR role intensity (60–100 activities/day for many orgs)

**8. "Tell me about your most meaningful professional achievement."**
Testing: What they value, metrics, pride in work, story quality

**9. "Describe a time you went above and beyond what was expected."**
Testing: Hustle signals, intrinsic motivation, initiative

**10. "Tell me about a time you had a conflict with a coworker or manager. How did you resolve it?"**
Testing: Emotional intelligence, professionalism, communication
Must show: how YOU took responsibility or facilitated resolution — not blame

**11. "Where do you see yourself in 2–3 years?"**
Testing: Career intentionality, ambition, understanding of sales career ladder
Strong answer: SDR → AE progression with specific skills to develop. Shows they're choosing sales, not falling into it.

**12. "Why do you want to work in sales specifically?"**
Testing: Intrinsic vs. extrinsic motivation. Purpose-driven answers outperform money-motivated ones.
Weak: "I like people and want to make good money"
Strong: A specific story of when you persuaded or helped someone and felt energized by it

### STAR Answer Evaluation Criteria (Scoring 1–5)
- **Specificity (1–5)**: Does it include real names, numbers, timeframes, or outcomes?
- **Action focus (1–5)**: Is the majority of the answer about what the candidate personally did?
- **Sales relevance (1–5)**: Does the story demonstrate a sales-critical competency?
- **Authenticity (1–5)**: Does it sound like a real experience or a rehearsed script?
- **Length calibration (1–5)**: Is it 60–90 seconds — not too short (vapid) or too long (rambling)?
`;

// ─── Document 5: Sales Language Calibration Guide ───────────────────────────

export const SALES_LANGUAGE_GUIDE = `
## Sales Language Calibration Guide

### The Core Principle
Generated answers should sound like a confident, self-aware salesperson — not a corporate press release and not a nervous student. The voice is: direct, enthusiastic, specific, and grounded.

### Authentic Sales Voice vs. Corporate Robot

**Authentic:**
- "I'm genuinely energized by the prospecting side — I actually love the hunt."
- "Looking back, that rejection taught me more than any quota month did."
- "I'd go home and rewatch my call recordings. Not because I had to — because I wanted to."
- "My manager told me I was the most coachable rep she'd managed in five years."

**Corporate Robot (avoid):**
- "I possess strong communication skills and am a highly motivated self-starter."
- "I leverage my interpersonal capabilities to drive synergistic outcomes."
- "I am passionate about driving value for clients and stakeholders."
- "I am detail-oriented and thrive in fast-paced environments."

### Key Sales Vocabulary to Use Naturally
- Discovery / discovery questions (not "getting to know the customer")
- Quota / attainment / percentage over quota (not "sales goals")
- Pipeline / prospecting / outbound (not "finding customers")
- ICP / ideal customer profile (not "target market")
- Objection handling (not "dealing with rejection")
- Close / ask for next steps (not "ask for the sale")
- Cadence / sequence / touchpoints (not "follow-up schedule")
- Coachability (use this word — it's the hiring manager's favorite)

### Length Calibration
- Behavioral STAR answers: 150–225 words written (60–90 seconds spoken)
- Filter question answers (Why sales, Why company): 75–150 words (30–60 seconds)
- "Tell me about yourself": 175–225 words (60–75 seconds)
- Role play opener: 3–5 sentences
- Questions to ask interviewers: 1 sentence question + 1 sentence context (if needed)

### Authenticity Signals
Good answers include at least one of:
- A specific number or metric ("I was 147% to quota")
- A specific timeline ("In my first 30 days...")
- A specific moment of struggle or learning
- A genuine reaction ("I was honestly rattled at first, but...")
- A mentor, manager, or colleague by name or role
- Self-awareness about a weakness alongside evidence of growth

### Tone Calibration by Stage
- **Recruiter screen**: High energy, conversational, enthusiastic. Match the recruiter's pace.
- **Hiring manager**: Thoughtful, specific, grounded. This is more serious.
- **Role play**: Confident, not apologetic. You belong on this call.
- **Panel/final**: Warm, curious, genuine. You want to work here. Show it.
`;

// ─── Retrieval Function ───────────────────────────────────────────────────────

export type KnowledgeDoc = {
  title: string;
  content: string;
};

const ALL_DOCS: Record<string, KnowledgeDoc> = {
  stage_decoder: { title: "Interview Stage Decoder", content: STAGE_DECODER },
  career_switcher: {
    title: "Career Switcher Framing Guide",
    content: CAREER_SWITCHER_GUIDE,
  },
  cold_call: { title: "Cold Call Playbook", content: COLD_CALL_PLAYBOOK },
  behavioral: {
    title: "Behavioral Question Bible",
    content: BEHAVIORAL_QUESTION_BIBLE,
  },
  sales_language: {
    title: "Sales Language Guide",
    content: SALES_LANGUAGE_GUIDE,
  },
};

export function getKnowledgeForStage(
  stage: string,
  backgroundType: string
): string {
  const docs: string[] = [];

  // Always include stage decoder and sales language
  docs.push(ALL_DOCS.stage_decoder.content);
  docs.push(ALL_DOCS.sales_language.content);

  // Stage-specific docs
  if (stage === "recruiter" || stage === "hiring_manager") {
    docs.push(ALL_DOCS.behavioral.content);
  }
  if (stage === "role_play") {
    docs.push(ALL_DOCS.cold_call.content);
  }

  // Career switcher supplement
  if (backgroundType === "career_switcher") {
    docs.push(ALL_DOCS.career_switcher.content);
  }

  return docs.join("\n\n---\n\n");
}
