/**
 * Role seniority detection + instruction generation.
 * Used by all prompt builders to calibrate answer voice, depth, and tone.
 */

export type RoleSeniority = "entry" | "mid" | "senior";

/**
 * Detects seniority from the role title and/or job description.
 * Scores senior and entry signals against each other; defaults to mid.
 */
export function detectRoleSeniority(
  roleTitle: string,
  jobDescription?: string
): RoleSeniority {
  const title = roleTitle.toLowerCase();
  const jd = (jobDescription ?? "").toLowerCase();

  const seniorSignals = [
    "senior",
    "sr.",
    "sr ",
    "lead",
    "principal",
    "quota-carrying",
    "transition to ae",
    "path to ae",
    "2+ years",
    "3+ years",
    "2-3 years",
    "1.5-3 years",
    "experienced",
    "proven track record",
  ];

  const entrySignals = [
    "entry level",
    "entry-level",
    "junior",
    "jr.",
    "no experience required",
    "0-1 year",
    "first sales role",
    "eager to learn",
    "early in their career",
    "early in their sales career",
  ];

  const combined = `${title} ${jd}`;

  const seniorScore = seniorSignals.filter((s) => combined.includes(s)).length;
  const entryScore = entrySignals.filter((s) => combined.includes(s)).length;

  if (seniorScore > entryScore) return "senior";
  if (entryScore > seniorScore) return "entry";
  return "mid";
}

/**
 * Returns a detailed instruction block calibrating answer voice, depth,
 * and vocabulary to the candidate's role seniority level.
 * Inject this into every prompt builder that generates spoken/written answers.
 */
export function getSeniorityInstructions(seniority: RoleSeniority): string {
  switch (seniority) {
    case "entry":
      return `CANDIDATE SENIORITY — ENTRY LEVEL:
This is an entry-level role. The candidate may have limited or no direct SaaS/B2B sales experience. Answers must:
- Bridge transferable skills from other industries (retail, hospitality, customer service, food service) to sales concepts — frame them as an ADVANTAGE, not a gap
- Show eagerness to learn and be coached — this is a genuine selling point at entry level
- Emphasize raw traits: competitiveness, resilience, work ethic, communication under pressure
- Use language like "what I've learned from X is..." and "the way I see that translating to sales is..."
- DO NOT pretend to have SaaS or B2B sales experience they don't have
- DO NOT use advanced jargon (MEDDIC, BANT, SPIN, multi-threading) unless the resume shows they know it
- DO NOT make them sound senior — they should sound hungry, coachable, and specific about their transferable wins`;

    case "senior":
      return `CANDIDATE SENIORITY — SENIOR LEVEL:
This is a senior role (typically 2+ years expected, often a bridge to AE). Answers must:
- LEAD WITH METRICS: pipeline generated ($), quota attainment (%), meetings-to-opportunity conversion, average deal size influenced — these come first, not last
- Project OWNERSHIP and SELECTIVITY — this person is choosing this company, not hoping to get hired
- Show they already HAVE strong fundamentals and are ready for more responsibility — NOT that they're still learning the basics
- Reference sales methodologies they've actually used (MEDDIC, SPIN, Sandler, Challenger) when relevant to the target company's motion
- Show strategic thinking: territory prioritization, account tiering, multi-threading, pipeline management
- Think and speak like an AE-in-waiting: deal qualification, stakeholder mapping, late-stage deal strategy
- Use language like "what I've found works best is..." and "running several hundred discovery calls, I've learned..."
- DO NOT say "I'm eager to develop my skills" — say "I'm ready to own more of the cycle"
- DO NOT sound entry-level — no hedging, no "I believe I would be good at this", only assertions backed by data`;

    case "mid":
    default:
      return `CANDIDATE SENIORITY — MID LEVEL:
This is a mid-level role (1–2 years expected). Answers must:
- Reference specific sales metrics from their current/previous role: meetings booked, pipeline generated, conversion rates, quota attainment — include at least one per answer where relevant
- Show they understand the full sales process, not just prospecting — discovery, qualification, handoff quality, follow-up cadence
- Demonstrate they've been through the learning curve and have developed their own approach that produces results
- Balance confidence with genuine growth mindset — they know the basics, they're hungry to go deeper
- Use sales terminology naturally (follow-up sequences, discovery, objection handling) but not excessively or as a crutch`;
  }
}
