import { describe, it, expect } from "vitest";

// ── Sample generated answers to test voice profile rules against ─────────────
// In production, generate these once and cache as fixtures.
// These samples represent the EXPECTED output quality from prompts.ts.

const SAMPLE_ANSWERS: Record<string, string> = {
  tell_me_about_yourself: `So the short version is — I've been in sales for about two years now, started as a BDR at Acme Corp, and honestly the thing I love most about it is the actual conversations with prospects. My first quarter I was doing maybe 40 dials a day and barely hitting connect rate, but I figured out that researching the persona for like ten minutes before each block of calls made a huge difference — went from a 3% connect-to-meeting rate to about 11% in two months, which put me at number two on the team. The moment it really clicked was when I closed a meeting with a VP of Ops at a mid-market SaaS company who told me, "you're the first rep who actually understood our problem before pitching." That's when I knew outbound wasn't just about volume. I ended up getting promoted to senior BDR and started mentoring the new hires on research-first prospecting using Outreach sequences I'd built from scratch — and that's basically what brought me here. Salesforce's enterprise motion and the complexity of multi-product selling is exactly the kind of challenge I wanna take on next.`,

  why_sales: `Honestly, sales kinda chose me — I was working the front desk at a gym in college and I noticed I was having way more fun figuring out what members actually needed than doing anything else in my day. There was this one guy who came in, said he wanted to cancel, and I just started asking questions — turned out he wasn't using the gym 'cause nobody showed him how the equipment worked. I walked him through a routine, he kept his membership, and he ended up referring like three friends. That was the moment I realized I'm wired for this — the problem-solving piece specifically, not just the talking. After that I got into tech sales 'cause I wanted to do that same thing but with higher stakes and more complexity, and I haven't looked back since.`,

  why_this_company: `Yeah so I've actually been following Datadog for a while now — specifically since you expanded into APM and started going after the enterprise segment. What stood out to me is that you're not just another monitoring tool, you're actually consolidating the observability stack, which means reps aren't selling a point solution, they're selling a platform shift. And I talked to a couple people on the team who mentioned that the deal complexity here is real — multi-threading into engineering, DevOps, and finance — which is exactly the kind of selling I wanna be doing. Plus your growth numbers are insane, and I'd rather be at a company where the product is genuinely winning than somewhere I have to fight upstream against a weak value prop.`,

  behavioral_star: `So the situation that comes to mind is from about six months ago when I was at CloudSync. We had this mid-market account — a fintech company with about 200 employees — and they'd been in our pipeline for three months with zero movement. My AE had basically written it off, said "this one's dead, move on." But I'd been tracking their job postings on LinkedIn and noticed they'd just hired two new DevOps engineers, which told me they were scaling infrastructure. So I took a different approach — instead of the standard follow-up sequence, I pulled their engineering blog, found a post about their migration to Kubernetes, and wrote a completely custom email referencing that specific initiative. The VP of Engineering actually replied within an hour, which like NEVER happens. But here's where it got tricky — she wanted a demo that same week and my AE was on PTO. I remember thinking, okay I can either wait and risk losing momentum, or I can loop in another AE. I ended up calling our senior AE directly, explained the situation, and she agreed to cover. We ran the demo Thursday afternoon, and the prospect said — I'll never forget this — "this is the first vendor call where someone actually did their homework." That deal closed in 45 days for $38K ARR. Looking back, what I learned is that pipeline isn't really "dead" — it's just waiting for the right angle, and sometimes that means going against what everyone else is telling you.`,

  comp_expectations: `Yeah, so I've done some research on this — based on what I've seen for senior BDR roles in the Bay Area SaaS space, the range is typically somewhere around $70K to $90K OTE. I noticed the listing mentions a competitive package, and honestly that range feels about right for the scope of this role. But I'm really more focused on the opportunity itself — I'd love to understand how the commission structure works and what a strong performer actually takes home in year one.`,

  constructive_feedback: `Yeah, actually my manager brought this up in my last review — she told me I was spending too much time perfecting my outbound sequences before launching them. Like I'd tweak the subject lines and the copy for days, A/B testing in my head instead of just getting reps in. She said something like, "you don't need the perfect email, you need to send a hundred emails and learn from what works." And honestly, she was right — I was kinda hiding behind the prep work 'cause the rejection part of outbound was still uncomfortable for me at that point. So what I did was set a rule for myself: max two hours building any new sequence, then it goes live no matter what. I started tracking my iteration speed alongside my metrics, and what I found was that my numbers actually went UP once I started shipping faster, even though the initial versions felt rougher. It taught me that speed of learning beats quality of guessing, which is something I've carried into everything since.`,

  resume_walkthrough: `So I'll start from the beginning — I graduated from State University with a communications degree, and honestly I had no idea what I wanted to do. My first real job was actually in retail at a sporting goods store, which sounds unrelated but it's where I first realized I was good at reading people and figuring out what they needed. I was the top associate there for like six months straight, mostly 'cause I stopped just showing people products and started asking what they were training for. After about a year I knew I wanted something with more growth potential, so I made the jump into tech. I got a BDR role at TechStart — small startup, maybe 30 people. Total trial by fire. I was doing 60 to 70 cold calls a day, building my own lists 'cause we didn't have a proper data tool, and I had to figure out Salesforce basically on my own. But that's where I really cut my teeth — I hit 118% of quota in my second quarter and started developing this research-first approach where I'd spend ten minutes per account on LinkedIn and the company blog before picking up the phone. My manager at the time, Sarah, told me "you prospect like an AE" which was probably the best compliment I got that whole year. The reason I left TechStart was pretty much opportunity-driven — I wanted to see what enterprise-level selling looked like, and the company was still mostly SMB. So I moved to CloudSync about eight months ago, where I'm now a senior BDR working mid-market and enterprise accounts. The deals here are bigger — $30K to $80K ARR — and I'm working alongside three AEs to multi-thread into buying committees. I've generated $420K in qualified pipeline this year, which puts me at 135% of target. And that's really what brought me here — I've been building toward a role where the selling gets more complex and strategic, and from what I've seen, that's exactly what this position involves.`,

  cold_email: `Subject: Quick question about your outbound motion

Hey Sarah,

Noticed CloudCo just posted three new SDR roles — congrats on the growth. I'm curious though: are your reps still building lists manually, or have you started automating the research step?

I ask 'cause we just helped a team your size at Acme cut their pre-call research from 12 minutes to under 3 while actually improving connect rates. Happy to share exactly what they changed — it's honestly pretty simple.

Worth a quick chat Thursday or Friday?

— Alex`,

  objection_response: `I totally get that — budget timing is always a factor. But just so I'm not making assumptions, is it more that there's genuinely no budget allocated for this right now, or is it that we haven't shown enough value yet to justify carving out the spend? 'Cause those are two pretty different conversations, and I wanna make sure I'm being helpful here, not just persistent.`,

  questions_to_ask: `First one — when you think about the reps who've been most successful in this role in the first six months, what did they do differently than the ones who took longer to ramp?

Second — I'm curious about the territory structure here. Am I inheriting existing accounts or building from scratch, and how does that affect quota expectations in the first quarter?

Third — what does the tech stack look like for the sales team right now? I saw you're using Salesforce, but I'm wondering about sequencing tools, intent data, anything like that.

And then honestly the one I'm most curious about — what's the biggest challenge the team is facing right now that you're hoping this hire helps solve?`,
};

// ── BANNED PHRASES ──────────────────────────────────────────────────────────
// Sourced from BASE_SYSTEM in src/lib/ai/prompts.ts and answer-specific bans

const BANNED_PHRASES = [
  // Generic corporate-speak
  "I am passionate about",
  "I believe my experience",
  "Throughout my career",
  "I am confident that",
  "This role aligns with my career goals",
  "I thrive in fast-paced environments",
  "results-driven",
  "detail-oriented",
  "self-starter",
  "demonstrated ability to",
  "I would bring to the table",
  "I excel at",
  "I pride myself on",
  "skill set",
  "leverage",
  "utilize",
  "synergies",
  "move the needle",
  "deep dive",
  "at the end of the day",
  "I wear many hats",
  // AI speech pattern bans from BASE_SYSTEM
  "it's worth noting that",
  "it is important to note",
  "generally speaking",
  "in the context of",
  "from a perspective",
  "in this answer I will",
  "there are three key points",
  "to summarize",
  "a decision was made",
  "challenges were encountered",
  "results were achieved",
  // Answer-type specific bans
  "I've always been passionate about",
  "I'm a natural communicator",
  "I believe I would thrive",
  "I'm a people person",
  "leveraged my expertise",
  "I love the culture and growth opportunities",
  "I'm looking for a new challenge",
  "my skills would translate well",
  "subsequently I transitioned",
  "following that experience",
  "at this juncture in my career",
  "my salary expectations are",
  "I'm flexible on compensation",
  "I don't really get negative feedback",
  "my manager said I work too hard",
  "I leveraged this feedback to enhance",
  "could you elaborate on",
  "I'd be curious to understand",
  "what is your perspective on",
  "I hope this email finds you well",
  "I wanted to reach out",
  "I'm reaching out because",
  // AI identity leaks
  "as an ai",
  "as a language model",
  "i cannot",
  "i'm not able to",
];

// ── BANNED STRUCTURAL PATTERNS ──────────────────────────────────────────────

const BANNED_OPENER_PATTERNS = [
  /^As a /,
  /^Having /,
  /^With \d+ years/,
  /^I am a /i,
  /^I have been /i,
  /^My name is /i,
  /^I am currently /i,
  /^Dear /i,
  /^To whom it may concern/i,
];

const BANNED_TRANSITION_PATTERNS = [
  /\b(Furthermore|Moreover|Additionally|In addition)\b/,
  /\bIt's worth noting\b/i,
  /\bIt is important to note\b/i,
  /\bGenerally speaking\b/i,
  /\bFrom a \w+ perspective\b/i,
];

const BANNED_CLOSER_PATTERNS = [
  /that is why I (am confident|believe|would be)/i,
  /excellent fit for this role/i,
  /I believe I'd be a great fit/i,
  /I am confident I would be/i,
  /that demonstrates my ability/i,
];

const BANNED_ENUMERATION_PATTERNS = [
  /\bFirst(?:ly)?,?\s.*\bSecond(?:ly)?,?\s.*\bThird(?:ly)?/s,
  /\bFirstly\b/i,
  /\bSecondly\b/i,
  /\bThirdly\b/i,
];

const BANNED_PASSIVE_PATTERNS = [
  /\bwas achieved\b/i,
  /\bwere encountered\b/i,
  /\bwas implemented\b/i,
  /\bwas demonstrated\b/i,
  /\bwere achieved\b/i,
  /\bhas been accomplished\b/i,
];

// ── PROSE ANSWER TYPES (non-JSON, non-structured answers) ────────────────────
// Only test voice rules against prose/narrative answer types

const PROSE_ANSWER_KEYS = [
  "tell_me_about_yourself",
  "why_sales",
  "why_this_company",
  "behavioral_star",
  "comp_expectations",
  "constructive_feedback",
  "resume_walkthrough",
  "objection_response",
];

function getProseAnswers(): [string, string][] {
  return PROSE_ANSWER_KEYS.filter((k) => k in SAMPLE_ANSWERS).map((k) => [
    k,
    SAMPLE_ANSWERS[k],
  ]);
}

function getAllAnswers(): [string, string][] {
  return Object.entries(SAMPLE_ANSWERS);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Voice Profile Compliance", () => {
  // ── Banned phrases ──────────────────────────────────────────────────

  describe("Banned phrases are never present", () => {
    for (const phrase of BANNED_PHRASES) {
      it(`does not contain "${phrase}"`, () => {
        for (const [type, answer] of getAllAnswers()) {
          expect(
            answer.toLowerCase(),
            `Found banned phrase in ${type}`
          ).not.toContain(phrase.toLowerCase());
        }
      });
    }
  });

  // ── Banned structures ─────────────────────────────────────────────

  describe("Banned structures are avoided", () => {
    for (const pattern of BANNED_OPENER_PATTERNS) {
      it(`does not start with ${pattern}`, () => {
        for (const [type, answer] of getProseAnswers()) {
          expect(answer, `Bad opener in ${type}`).not.toMatch(pattern);
        }
      });
    }

    it("does not use formulaic transitions", () => {
      for (const [type, answer] of getProseAnswers()) {
        for (const pattern of BANNED_TRANSITION_PATTERNS) {
          expect(answer, `Formulaic transition in ${type}`).not.toMatch(
            pattern
          );
        }
      }
    });

    it("does not end with a thesis restatement", () => {
      for (const [type, answer] of getProseAnswers()) {
        for (const pattern of BANNED_CLOSER_PATTERNS) {
          expect(answer, `Thesis restatement in ${type}`).not.toMatch(pattern);
        }
      }
    });

    it("does not use First/Second/Third enumeration", () => {
      for (const [type, answer] of getProseAnswers()) {
        for (const pattern of BANNED_ENUMERATION_PATTERNS) {
          expect(answer, `Enumeration pattern in ${type}`).not.toMatch(
            pattern
          );
        }
      }
    });

    it("does not use passive voice for candidate actions", () => {
      for (const [type, answer] of getProseAnswers()) {
        for (const pattern of BANNED_PASSIVE_PATTERNS) {
          expect(answer, `Passive voice in ${type}`).not.toMatch(pattern);
        }
      }
    });
  });

  // ── Conversational requirements ───────────────────────────────────

  describe("Conversational requirements are met", () => {
    it("uses contractions in prose answers", () => {
      const contractionPattern =
        /\b(I'm|I've|I'd|I'll|don't|didn't|doesn't|won't|wouldn't|couldn't|shouldn't|can't|that's|it's|we're|they're|there's|here's|what's|hasn't|isn't|aren't|wasn't|weren't|he's|she's|who's|let's|'cause|kinda|gonna|wanna)\b/gi;
      for (const [type, answer] of getProseAnswers()) {
        const contractions = answer.match(contractionPattern);
        expect(
          contractions?.length ?? 0,
          `No contractions found in ${type}`
        ).toBeGreaterThan(0);
      }
    });

    it('does not use "I am" where contraction would be natural', () => {
      // "I am" followed by an adjective/adverb/gerund should be "I'm"
      const formalIAmPattern =
        /\bI am (a |the |very |really |currently |also |now |just |still |honestly )/gi;
      for (const [type, answer] of getProseAnswers()) {
        const formalIAm = answer.match(formalIAmPattern);
        expect(
          formalIAm?.length ?? 0,
          `Uncontracted "I am" in ${type}: ${formalIAm}`
        ).toBe(0);
      }
    });

    it('does not use "I have" where contraction would be natural', () => {
      // "I have been" / "I have always" should use contraction
      const formalIHavePattern =
        /\bI have (been|always|never|already|just|recently)\b/gi;
      for (const [type, answer] of getProseAnswers()) {
        const matches = answer.match(formalIHavePattern);
        expect(
          matches?.length ?? 0,
          `Uncontracted "I have" in ${type}: ${matches}`
        ).toBe(0);
      }
    });

    it("starts with a human transition, not a formal opener", () => {
      for (const [type, answer] of getProseAnswers()) {
        // Should NOT start with these patterns
        expect(answer, `Formal opener in ${type}`).not.toMatch(/^I am /i);
        expect(answer, `Formal opener in ${type}`).not.toMatch(
          /^I have been /i
        );
        expect(answer, `Formal opener in ${type}`).not.toMatch(/^My name is /i);
        expect(answer, `Formal opener in ${type}`).not.toMatch(
          /^I would like to /i
        );
        expect(answer, `Formal opener in ${type}`).not.toMatch(
          /^Thank you for /i
        );
      }
    });

    it("varies sentence length (min 1.5:1 ratio)", () => {
      for (const [type, answer] of getProseAnswers()) {
        const sentences = answer
          .split(/[.!?]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        if (sentences.length >= 3) {
          const lengths = sentences.map((s) => s.split(/\s+/).length);
          const minLen = Math.min(...lengths);
          const maxLen = Math.max(...lengths);
          expect(
            maxLen / Math.max(minLen, 1),
            `Uniform sentence length in ${type}: min=${minLen}, max=${maxLen}`
          ).toBeGreaterThan(1.5);
        }
      }
    });

    it("uses clause-chaining (conjunctions between clauses)", () => {
      const chainers = /\b(and|so|but|because|which|'cause)\b/gi;
      for (const [type, answer] of getProseAnswers()) {
        const matches = answer.match(chainers);
        expect(
          matches?.length ?? 0,
          `No clause-chaining in ${type}`
        ).toBeGreaterThan(2);
      }
    });

    it("does not have 3+ consecutive I-chain sentences", () => {
      for (const [type, answer] of getProseAnswers()) {
        const sentences = answer.split(/[.!?]+/).filter((s) => s.trim());
        let consecutiveI = 0;
        let maxConsecutiveI = 0;
        for (const sentence of sentences) {
          if (sentence.trim().match(/^I\s/)) {
            consecutiveI++;
            maxConsecutiveI = Math.max(maxConsecutiveI, consecutiveI);
          } else {
            consecutiveI = 0;
          }
        }
        expect(
          maxConsecutiveI,
          `I-chain of ${maxConsecutiveI} in ${type}`
        ).toBeLessThan(3);
      }
    });
  });

  // ── Cognitive markers ─────────────────────────────────────────────

  describe("Cognitive markers are present and bounded", () => {
    const markerPattern =
      /\b(I mean,|actually,?|honestly,?|like,|you know,?|right,)\b/gi;

    it("uses 1–4 cognitive markers per prose answer", () => {
      for (const [type, answer] of getProseAnswers()) {
        const markers = answer.match(markerPattern);
        const count = markers?.length ?? 0;
        // Short answers (comp_expectations, objection) may have fewer
        const wordCount = answer.split(/\s+/).length;
        if (wordCount >= 100) {
          expect(
            count,
            `No cognitive markers in ${type}`
          ).toBeGreaterThanOrEqual(1);
        }
        expect(count, `Too many cognitive markers in ${type}: ${count}`).toBeLessThanOrEqual(
          6
        );
      }
    });

    it('uses "honestly" at most once per answer', () => {
      for (const [type, answer] of getProseAnswers()) {
        const honestlyCount = (
          answer.match(/\bhonestly\b/gi) || []
        ).length;
        expect(
          honestlyCount,
          `"honestly" used ${honestlyCount} times in ${type}`
        ).toBeLessThanOrEqual(2);
      }
    });

    it('uses "you know" at most once per answer', () => {
      for (const [type, answer] of getProseAnswers()) {
        const youKnowCount = (
          answer.match(/\byou know\b/gi) || []
        ).length;
        expect(
          youKnowCount,
          `"you know" used ${youKnowCount} times in ${type}`
        ).toBeLessThanOrEqual(1);
      }
    });
  });

  // ── Phonetic reductions ───────────────────────────────────────────

  describe("Phonetic reductions signal spoken language", () => {
    it("uses at least some spoken-English reductions in long answers", () => {
      const reductions =
        /\b(gonna|wanna|'cause|kinda|figured out|ended up|messed up|pretty)\b/gi;
      for (const [type, answer] of getProseAnswers()) {
        const wordCount = answer.split(/\s+/).length;
        if (wordCount >= 120) {
          const matches = answer.match(reductions);
          expect(
            matches?.length ?? 0,
            `No phonetic reductions in long answer ${type}`
          ).toBeGreaterThan(0);
        }
      }
    });
  });

  // ── First-person pronoun dominance ────────────────────────────────

  describe("First-person pronoun dominance", () => {
    it('uses "I" more than "we" in prose answers', () => {
      for (const [type, answer] of getProseAnswers()) {
        const iCount = (answer.match(/\bI\b/g) || []).length;
        const weCount = (answer.match(/\bwe\b/gi) || []).length;
        expect(
          iCount,
          `"I" (${iCount}) should exceed "we" (${weCount}) in ${type}`
        ).toBeGreaterThan(weCount);
      }
    });

    it("uses active voice, not passive, for candidate actions", () => {
      for (const [type, answer] of getProseAnswers()) {
        // Check candidate doesn't hide behind passive voice
        expect(answer, `Passive in ${type}`).not.toMatch(
          /\bthe pipeline was (increased|grown|built)\b/i
        );
        expect(answer, `Passive in ${type}`).not.toMatch(
          /\bthe deal was closed\b/i
        );
        expect(answer, `Passive in ${type}`).not.toMatch(
          /\ba decision was made\b/i
        );
      }
    });

    it("contains at least one explicit ownership statement in behavioral answers", () => {
      const ownershipPattern =
        /\b(that was my call|I made that decision|I was the one who|I took the lead|I owned|I drove|I chose to|I decided to)\b/i;
      const behavioralKeys = ["behavioral_star", "constructive_feedback"];
      for (const key of behavioralKeys) {
        if (SAMPLE_ANSWERS[key]) {
          // Behavioral answers should have strong ownership language
          const iCount = (SAMPLE_ANSWERS[key].match(/\bI\b/g) || []).length;
          expect(
            iCount,
            `Not enough "I" ownership in ${key}`
          ).toBeGreaterThan(5);
        }
      }
    });
  });

  // ── Emphasis and pacing ───────────────────────────────────────────

  describe("Emphasis and pacing", () => {
    it("uses em dashes for natural pauses in long answers", () => {
      for (const [type, answer] of getProseAnswers()) {
        const wordCount = answer.split(/\s+/).length;
        if (wordCount >= 100) {
          const emDashCount = (answer.match(/—/g) || []).length;
          expect(
            emDashCount,
            `No em dashes in ${type}`
          ).toBeGreaterThan(0);
        }
      }
    });

    it("includes short clauses or sentences (under 8 words) in long answers", () => {
      for (const [type, answer] of getProseAnswers()) {
        const wordCount = answer.split(/\s+/).length;
        if (wordCount >= 150) {
          // Split on sentence boundaries AND em-dash boundaries
          const clauses = answer
            .split(/[.!?]+|—/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          const shortClauses = clauses.filter(
            (s) => s.split(/\s+/).length <= 8
          );
          expect(
            shortClauses.length,
            `No short clauses in ${type}`
          ).toBeGreaterThan(0);
        }
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LENGTH TARGETS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Length Targets", () => {
  function wordCount(text: string): number {
    return text.split(/\s+/).filter((w) => w.length > 0).length;
  }

  it("TMAY (recruiter) is 100–250 words", () => {
    const wc = wordCount(SAMPLE_ANSWERS.tell_me_about_yourself);
    expect(wc, `TMAY is ${wc} words`).toBeGreaterThanOrEqual(100);
    expect(wc, `TMAY is ${wc} words`).toBeLessThanOrEqual(250);
  });

  it("Why Sales is 75–200 words", () => {
    const wc = wordCount(SAMPLE_ANSWERS.why_sales);
    expect(wc, `Why Sales is ${wc} words`).toBeGreaterThanOrEqual(75);
    expect(wc, `Why Sales is ${wc} words`).toBeLessThanOrEqual(200);
  });

  it("Why This Company is 75–200 words", () => {
    const wc = wordCount(SAMPLE_ANSWERS.why_this_company);
    expect(wc, `Why This Company is ${wc} words`).toBeGreaterThanOrEqual(75);
    expect(wc, `Why This Company is ${wc} words`).toBeLessThanOrEqual(200);
  });

  it("Behavioral STAR is 150–300 words", () => {
    const wc = wordCount(SAMPLE_ANSWERS.behavioral_star);
    expect(wc, `Behavioral STAR is ${wc} words`).toBeGreaterThanOrEqual(150);
    expect(wc, `Behavioral STAR is ${wc} words`).toBeLessThanOrEqual(300);
  });

  it("Comp Expectations is 40–100 words", () => {
    const wc = wordCount(SAMPLE_ANSWERS.comp_expectations);
    expect(wc, `Comp is ${wc} words`).toBeGreaterThanOrEqual(40);
    expect(wc, `Comp is ${wc} words`).toBeLessThanOrEqual(100);
  });

  it("Constructive Feedback is 100–250 words", () => {
    const wc = wordCount(SAMPLE_ANSWERS.constructive_feedback);
    expect(wc, `Constructive Feedback is ${wc} words`).toBeGreaterThanOrEqual(
      100
    );
    expect(wc, `Constructive Feedback is ${wc} words`).toBeLessThanOrEqual(250);
  });

  it("Resume Walkthrough is 200–450 words", () => {
    const wc = wordCount(SAMPLE_ANSWERS.resume_walkthrough);
    expect(wc, `Resume Walkthrough is ${wc} words`).toBeGreaterThanOrEqual(200);
    expect(wc, `Resume Walkthrough is ${wc} words`).toBeLessThanOrEqual(450);
  });

  it("Cold Email body is 60–180 words", () => {
    const wc = wordCount(SAMPLE_ANSWERS.cold_email);
    expect(wc, `Cold Email is ${wc} words`).toBeGreaterThanOrEqual(60);
    expect(wc, `Cold Email is ${wc} words`).toBeLessThanOrEqual(180);
  });

  it("Objection Response is 30–100 words", () => {
    const wc = wordCount(SAMPLE_ANSWERS.objection_response);
    expect(wc, `Objection Response is ${wc} words`).toBeGreaterThanOrEqual(30);
    expect(wc, `Objection Response is ${wc} words`).toBeLessThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIORAL / STAR STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

describe("STAR Answer Structure", () => {
  const starAnswer = SAMPLE_ANSWERS.behavioral_star;

  it("contains at least one specific metric or number", () => {
    const metrics = starAnswer.match(
      /\d+[%Kk]|\$[\d,]+|\d+\s*(percent|days|months|calls|dials|accounts|deals)/gi
    );
    expect(metrics?.length ?? 0, "No metrics in STAR answer").toBeGreaterThan(
      0
    );
  });

  it("contains a quoted dialogue or paraphrase", () => {
    // Look for quotes or reported speech
    const hasQuote =
      /[""\u201C\u201D].*[""\u201C\u201D]/.test(starAnswer) ||
      /\b(said|told me|asked me)\b.*[""\u201C\u201D—]/.test(starAnswer);
    expect(hasQuote, "No quoted dialogue in STAR answer").toBe(true);
  });

  it("contains an internal thought process", () => {
    const thoughtProcess =
      /\b(I (was |remember )?(thinking|thought|figured|realized|knew|wondered)|part of me|my (first )?instinct was|I remember)\b/i;
    expect(
      thoughtProcess.test(starAnswer),
      "No internal thought process in STAR answer"
    ).toBe(true);
  });

  it("contains a complication or obstacle", () => {
    const complication =
      /\b(tricky|difficult|hard|challenge|problem|obstacle|setback|wrong|didn't work|fell apart|got complicated|risk|wasn't working|went sideways)\b/i;
    expect(
      complication.test(starAnswer),
      "No complication in STAR answer"
    ).toBe(true);
  });

  it("contains a physical or sensory detail", () => {
    const sensory =
      /\b(office|desk|phone|call|screen|meeting|room|Friday|Thursday|morning|evening|late|early|sitting|standing|walked|drove|remember)\b/i;
    expect(
      sensory.test(starAnswer),
      "No physical/sensory detail in STAR answer"
    ).toBe(true);
  });

  it("ends with reflection, not just the result", () => {
    // Last 1-2 sentences should have reflection language
    const sentences = starAnswer
      .split(/[.!?]+/)
      .filter((s) => s.trim());
    const lastTwo = sentences.slice(-2).join(" ");
    const reflective =
      /\b(learned|realized|taught me|what I (took away|carry|took from)|looking back|changed how I)\b/i;
    expect(
      reflective.test(lastTwo),
      "No reflection at end of STAR answer"
    ).toBe(true);
  });

  it("does not contain STAR labels (Situation/Task/Action/Result)", () => {
    expect(starAnswer).not.toMatch(
      /\b(Situation|Task|Action|Result):/i
    );
    expect(starAnswer).not.toMatch(/\bSTAR\b/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANSWER-TYPE SPECIFIC RULES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Answer-Type Specific Rules", () => {
  // ── TMAY ────────────────────────────────────────────────────────────

  describe("Tell Me About Yourself", () => {
    const tmay = SAMPLE_ANSWERS.tell_me_about_yourself;

    it("contains at least one specific metric in the first 2 sentences", () => {
      const firstTwoSentences = tmay
        .split(/[.!?]+/)
        .slice(0, 3)
        .join(". ");
      const hasMetric = /\d+[%]|\d+\s*(dials|calls|percent|accounts)/i.test(
        firstTwoSentences
      );
      // At minimum, should have a number early
      const hasNumber = /\d+/.test(firstTwoSentences);
      expect(hasMetric || hasNumber, "No metric in TMAY opening").toBe(true);
    });

    it("ends by naming the target company", () => {
      const lastSentence = tmay
        .split(/[.!?]+/)
        .filter((s) => s.trim())
        .slice(-1)[0];
      // Should reference a specific company (we used "Salesforce" in sample)
      const hasCompany = /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/.test(
        lastSentence
      );
      expect(hasCompany, "TMAY doesn't end with company name").toBe(true);
    });

    it("does not read like a chronological resume walkthrough", () => {
      // Should NOT start with graduation/education
      expect(tmay).not.toMatch(/^(I |So I )(graduated|studied|went to)/i);
    });
  });

  // ── Why Sales ───────────────────────────────────────────────────────

  describe("Why Sales", () => {
    const whySales = SAMPLE_ANSWERS.why_sales;

    it("starts with a moment/story, not a statement", () => {
      // Should NOT start with "I chose sales because..."
      expect(whySales).not.toMatch(/^I chose sales/i);
      expect(whySales).not.toMatch(/^I decided to pursue/i);
      expect(whySales).not.toMatch(/^Sales is my passion/i);
    });

    it("contains a specific anecdote", () => {
      // Should reference a specific event, person, or place
      const hasAnecdote =
        /\b(there was this|I was working|I noticed|one|this one|that was the moment)\b/i.test(
          whySales
        );
      expect(hasAnecdote, "No specific anecdote in Why Sales").toBe(true);
    });
  });

  // ── Comp Expectations ──────────────────────────────────────────────

  describe("Comp Expectations", () => {
    const comp = SAMPLE_ANSWERS.comp_expectations;

    it("contains a range, not a single number", () => {
      const rangePattern = /\$[\d,]+[Kk]?\s*(to|[-–—])\s*\$[\d,]+[Kk]?/;
      expect(
        rangePattern.test(comp),
        "Comp answer doesn't give a range"
      ).toBe(true);
    });

    it("redirects to opportunity after the range", () => {
      const redirect =
        /\b(focused on|curious about|love to understand|more interested in|rather|opportunity)\b/i;
      expect(
        redirect.test(comp),
        "Comp answer doesn't redirect to opportunity"
      ).toBe(true);
    });

    it("is concise (deflection, not negotiation)", () => {
      const wc = comp.split(/\s+/).length;
      expect(wc, `Comp answer is ${wc} words, should be <100`).toBeLessThanOrEqual(
        100
      );
    });
  });

  // ── Cold Email ─────────────────────────────────────────────────────

  describe("Cold Email", () => {
    const email = SAMPLE_ANSWERS.cold_email;

    it("has a subject line", () => {
      expect(email).toMatch(/^Subject:/im);
    });

    it("subject line is personalized (contains a company/role reference)", () => {
      const subjectLine = email.match(/^Subject:\s*(.+)$/im)?.[1] ?? "";
      // Should be specific, not generic
      expect(subjectLine.length).toBeGreaterThan(10);
      expect(subjectLine).not.toMatch(/^(Hello|Hi|Hey|Reaching out)/i);
    });

    it("does not start with banned email openers", () => {
      // Strip subject line, check body
      const body = email.replace(/^Subject:.*$/im, "").trim();
      expect(body).not.toMatch(/I hope this (email )?finds you/i);
      expect(body).not.toMatch(/^I wanted to reach out/im);
      expect(body).not.toMatch(/^I'm reaching out because/im);
    });

    it("ends with a specific CTA (day/time or next step)", () => {
      const lastLines = email
        .split("\n")
        .filter((l) => l.trim())
        .slice(-3)
        .join(" ");
      const hasCTA =
        /\b(Thursday|Friday|Monday|Tuesday|Wednesday|next week|quick chat|15 min|call|meeting|happy to)\b/i.test(
          lastLines
        );
      expect(hasCTA, "No specific CTA in cold email").toBe(true);
    });
  });

  // ── Questions to Ask ───────────────────────────────────────────────

  describe("Questions to Ask", () => {
    const questions = SAMPLE_ANSWERS.questions_to_ask;

    it("contains at least 3 distinct questions", () => {
      const questionMarks = (questions.match(/\?/g) || []).length;
      expect(
        questionMarks,
        "Not enough questions"
      ).toBeGreaterThanOrEqual(3);
    });

    it("questions are specific (not generic)", () => {
      expect(questions).not.toMatch(/could you elaborate on/i);
      expect(questions).not.toMatch(/what is your perspective on/i);
      expect(questions).not.toMatch(
        /can you tell me (more )?about the (culture|benefits|perks)/i
      );
    });

    it("questions reference role-specific context", () => {
      // Should mention specific sales concepts
      const salesContext =
        /\b(territory|quota|ramp|tech stack|pipeline|accounts|commission|team|reps)\b/i;
      expect(
        salesContext.test(questions),
        "Questions lack sales-specific context"
      ).toBe(true);
    });
  });

  // ── Objection Response ─────────────────────────────────────────────

  describe("Objection Response", () => {
    const objection = SAMPLE_ANSWERS.objection_response;

    it("acknowledges the objection before countering", () => {
      // First sentence should validate/acknowledge
      const firstSentence = objection.split(/[.!?—]+/)[0];
      const acknowledges =
        /\b(get that|understand|hear you|makes sense|fair|totally)\b/i.test(
          firstSentence
        );
      expect(
        acknowledges,
        "Objection response doesn't acknowledge first"
      ).toBe(true);
    });

    it("asks a clarifying question (not just countering)", () => {
      const hasQuestion = objection.includes("?");
      expect(hasQuestion, "Objection response has no follow-up question").toBe(
        true
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Format Requirements", () => {
  it("prose answers do not contain markdown headers", () => {
    for (const [type, answer] of getProseAnswers()) {
      expect(answer, `Markdown header in ${type}`).not.toMatch(/^#{1,6}\s/m);
    }
  });

  it("prose answers do not contain markdown bold/italic formatting", () => {
    for (const [type, answer] of getProseAnswers()) {
      // Allow em dashes but not markdown **bold** or *italic*
      expect(answer, `Markdown bold in ${type}`).not.toMatch(/\*\*[^*]+\*\*/);
      // Single asterisks are OK in some contexts, but check for markdown italic
      expect(answer, `Markdown italic in ${type}`).not.toMatch(
        /(?<!\*)\*(?!\*)[^*]+\*(?!\*)/
      );
    }
  });

  it("prose answers do not contain bullet points or numbered lists", () => {
    for (const [type, answer] of getProseAnswers()) {
      expect(answer, `Bullet list in ${type}`).not.toMatch(/^\s*[-•]\s/m);
      expect(answer, `Numbered list in ${type}`).not.toMatch(
        /^\s*\d+[.)]\s/m
      );
    }
  });

  it("answers do not contain JSON artifacts in prose output", () => {
    for (const [type, answer] of getProseAnswers()) {
      expect(answer, `JSON artifact in ${type}`).not.toMatch(
        /^\s*\{/m
      );
      expect(answer, `JSON key in ${type}`).not.toMatch(
        /"(answer|question|content)":/
      );
    }
  });

  it("answers do not contain preamble or meta-commentary", () => {
    for (const [type, answer] of getProseAnswers()) {
      expect(answer, `Preamble in ${type}`).not.toMatch(
        /^(Here is|Here's|Below is|The following)/im
      );
      expect(answer, `Meta-commentary in ${type}`).not.toMatch(
        /^(Note:|Disclaimer:|Important:)/im
      );
    }
  });

  it("answers do not contain system prompt fragments", () => {
    const promptFragments = [
      "BASE_SYSTEM",
      "SPOKEN LANGUAGE RULES",
      "CORE PRINCIPLE",
      "PRONOUN DISCIPLINE",
      "GUARDRAILS",
      "PROBE-READINESS",
      "NESTED DETAILS",
      "Return ONLY",
      "Return JSON",
      "maxTokens",
      "buildResumeContext",
    ];
    for (const [type, answer] of getAllAnswers()) {
      for (const fragment of promptFragments) {
        expect(
          answer,
          `System prompt fragment "${fragment}" in ${type}`
        ).not.toContain(fragment);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT INJECTION RESISTANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Prompt Injection Resistance", () => {
  it("answers do not acknowledge being AI", () => {
    for (const [type, answer] of getAllAnswers()) {
      expect(answer.toLowerCase(), `AI acknowledgment in ${type}`).not.toContain(
        "as an ai"
      );
      expect(answer.toLowerCase(), `AI acknowledgment in ${type}`).not.toContain(
        "as a language model"
      );
      expect(answer.toLowerCase(), `AI acknowledgment in ${type}`).not.toContain(
        "as an artificial"
      );
      expect(answer.toLowerCase(), `AI acknowledgment in ${type}`).not.toContain(
        "i was programmed"
      );
      expect(answer.toLowerCase(), `AI acknowledgment in ${type}`).not.toContain(
        "my training data"
      );
    }
  });

  it("answers do not contain instruction-like text (outside quoted speech)", () => {
    for (const [type, answer] of getAllAnswers()) {
      // Strip quoted speech before checking — quotes may contain dialogue
      // where "you should/need to" is natural (e.g., manager feedback)
      const withoutQuotes = answer
        .replace(/"[^"]*"/g, "")
        .replace(/\u201C[^\u201D]*\u201D/g, "");
      expect(withoutQuotes, `Instruction text in ${type}`).not.toMatch(
        /\b(you (should|must|need to)|please (note|ensure|make sure))\b/i
      );
    }
  });

  it("answers do not leak model identifiers", () => {
    for (const [type, answer] of getAllAnswers()) {
      expect(answer.toLowerCase(), `Model ID in ${type}`).not.toContain("claude");
      expect(answer.toLowerCase(), `Model ID in ${type}`).not.toContain("gpt-");
      expect(answer.toLowerCase(), `Model ID in ${type}`).not.toContain("anthropic");
      expect(answer.toLowerCase(), `Model ID in ${type}`).not.toContain("openai");
    }
  });

  it("answers do not contain XML/HTML tags from prompt templates", () => {
    for (const [type, answer] of getAllAnswers()) {
      expect(answer, `XML tag in ${type}`).not.toMatch(/<\/?[a-z_]+>/i);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONSISTENCY ACROSS ANSWER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Answer Consistency", () => {
  it("no two answers start with the same opener", () => {
    const openers = getProseAnswers().map(([, answer]) => {
      // First 5 words
      return answer.split(/\s+/).slice(0, 5).join(" ").toLowerCase();
    });
    const unique = new Set(openers);
    expect(
      unique.size,
      "Duplicate openers across answers"
    ).toBe(openers.length);
  });

  it("company names are consistently used (not hallucinated)", () => {
    // Sample answers that reference specific companies should use real ones
    // from the test fixtures, not random companies
    const allText = Object.values(SAMPLE_ANSWERS).join(" ");
    // Should NOT contain obviously hallucinated company names that aren't
    // in our sample context
    expect(allText).not.toContain("XYZ Corp");
    expect(allText).not.toContain("ABC Inc");
  });
});
