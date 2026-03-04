/**
 * Job listing signal extraction + prompt injection.
 *
 * Parses structured signals from raw job listing text using regex and
 * pattern matching — no AI required since job listings follow predictable formats.
 * These signals are injected into generation prompts to make every answer
 * hyper-specific to what this company is looking for.
 */

import { detectRoleSeniority, type RoleSeniority } from "@/lib/ai/seniority";

export interface JobListingSignals {
  seniority: RoleSeniority;
  yearsRequired: string | null;
  compRange: string | null;
  compCurrency: string | null;
  compStructure: string | null;
  keySkills: string[];
  companyValues: string[];
  teamContext: string | null;
  careerPath: string | null;
  methodology: string | null;
  location: string | null;
  reportingTo: string | null;
  missionStatement: string | null;
  problemStatement: string | null;
  idealCandidateTraits: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function firstMatch(text: string, pattern: RegExp): string | null {
  const m = text.match(pattern);
  return m ? (m[1] ?? m[0]).trim() : null;
}

/** Extract bullet-point list items from the block of text following a section header */
function extractBullets(text: string, headerPattern: RegExp, maxItems = 8): string[] {
  const headerMatch = text.search(headerPattern);
  if (headerMatch === -1) return [];

  // Grab up to ~800 chars after the header
  const block = text.slice(headerMatch, headerMatch + 800);
  const lines = block.split(/\n/);
  const items: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    // Bullet item: starts with -, •, *, ·, or a digit
    const bulletMatch = line.match(/^[-•*·\u2022\u2023\u25e6]?\s*\d*\.?\s*(.{10,120})/);
    if (bulletMatch) {
      const content = bulletMatch[1].trim();
      // Stop if we've hit a new section header (all-caps line or ends with colon followed by newline)
      if (/^[A-Z][A-Z\s]{8,}$/.test(content)) break;
      items.push(content);
      if (items.length >= maxItems) break;
    }
    // Stop at blank line after we've started collecting
    if (items.length > 0 && line === "") break;
  }

  return items;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

export function parseJobListing(text: string): JobListingSignals {
  const t = text;
  const lower = t.toLowerCase();

  // ── Seniority ──────────────────────────────────────────────────────────────
  const seniority = detectRoleSeniority("", t); // pass full JD text

  // ── Years required ─────────────────────────────────────────────────────────
  const yearsRequired = firstMatch(t,
    /(\d+\.?\d*\s*[-–+]\s*\d*\.?\d*\s*years?(?:\s+of)?(?:\s+\w+){0,4}experience)/i
  ) ?? firstMatch(t, /(\d+\+?\s*years?\s+(?:of\s+)?(?:BDR|SDR|sales|SaaS|B2B|outbound)\s+experience)/i);

  // ── Comp range ─────────────────────────────────────────────────────────────
  // Matches: "$70,000 - $80,000", "CAD $70,000–$80,000", "$70k - $80k", "70,000 to 80,000"
  const compRaw = firstMatch(t,
    /(?:CAD|USD|GBP|EUR|AUD)?\s*\$\s*[\d,]+(?:[kK])?\s*(?:[-–]|to)\s*\$?\s*[\d,]+(?:[kK])?/
  );
  const compRange = compRaw ?? firstMatch(t,
    /(?:salary|compensation|comp|pay)[:\s]+(?:CAD|USD|GBP|EUR|AUD)?\s*\$?\s*[\d,]+(?:[kK])?(?:\s*[-–]\s*\$?\s*[\d,]+(?:[kK])?)?/i
  );

  // ── Comp currency ──────────────────────────────────────────────────────────
  const compCurrency = firstMatch(t, /\b(CAD|USD|GBP|EUR|AUD|NZD)\b/);

  // ── Comp structure ─────────────────────────────────────────────────────────
  const hasCommission = /\b(plus\s+commission|base\s*\+\s*(?:variable|commission|bonus|incentive)|OTE|on-target|total\s+compensation)/i.test(t);
  const compStructure = hasCommission
    ? (firstMatch(t, /\b(base\s*\+\s*(?:variable|commission)[^.]{0,60})/i) ??
       firstMatch(t, /(OTE[^.]{0,60})/i) ??
       "base + commission")
    : null;

  // ── Key skills ─────────────────────────────────────────────────────────────
  // Look in Requirements, Qualifications, What we're looking for sections
  const skillBullets = extractBullets(t,
    /(?:requirements?|qualifications?|what\s+we(?:'re|re)\s+looking\s+for|you(?:'ll)?\s+(?:have|bring|need))/i
  );
  // Filter to items that look like skills (short, contain a known tool/concept word)
  const SKILL_KEYWORDS = /\b(salesforce|hubspot|outreach|salesloft|gong|apollo|zoominfo|linkedin|crm|sdr|bdr|prospecting|cold\s*call|discovery|qualification|pipeline|sequence|cadence|demo|closing|meddic|spin|sandler|challenger|bant|outbound|inbound|saas|b2b|excel|google\s+sheets|slack|zoom|video|presentation|negotiation|account\s+mapping|territory)\b/i;
  const keySkills = skillBullets
    .filter(b => SKILL_KEYWORDS.test(b) || b.length < 80)
    .map(b => b.replace(/^(experience\s+with|proficiency\s+in|familiarity\s+with|knowledge\s+of)\s+/i, "").trim())
    .filter(b => b.length > 4)
    .slice(0, 8);

  // ── Company values ─────────────────────────────────────────────────────────
  const valueBullets = extractBullets(t,
    /(?:our\s+values?|core\s+values?|values?\s*:|company\s+values?|what\s+we\s+(?:stand\s+for|believe))/i,
    6
  );
  const companyValues = valueBullets
    .map(v => v.replace(/:.*$/, "").trim()) // strip explanations after colon
    .filter(v => v.length >= 3 && v.length <= 50);

  // ── Team context ───────────────────────────────────────────────────────────
  const teamContext = firstMatch(t,
    /(?:join(?:ing)?\s+our\s+(?:growing\s+)?[\w\s]{3,30}team|you(?:'ll)?\s+(?:be|join)\s+(?:a|our|the)[^.]{10,80})/i
  );

  // ── Career path ────────────────────────────────────────────────────────────
  const careerPath = firstMatch(t,
    /(?:path|transition|progress|grow|move|advance)\s+(?:to|into|toward)\s+(?:an?\s+)?([A-Za-z][\w\s]{3,35}(?:AE|Account Executive|Manager|Director|closer)?)/i
  ) ?? firstMatch(t,
    /(?:quota[- ]carrying|clear\s+path\s+to|next\s+step|ready\s+for\s+(?:an?\s+)?AE)\s*[:\-]?\s*([A-Za-z][\w\s]{3,30})/i
  );

  // ── Methodology ────────────────────────────────────────────────────────────
  const methodology = firstMatch(t,
    /\b(MEDDIC|MEDDPICC|SPIN(?:\s+Selling)?|Sandler|Challenger(?:\s+Sale)?|BANT|ValueSelling|Command\s+of\s+the\s+Message|Consultative\s+Selling)\b/i
  );

  // ── Location ───────────────────────────────────────────────────────────────
  const location = firstMatch(t,
    /(?:location|office|based\s+in|(?:hybrid|remote|on[- ]?site)\s+(?:in|from|based)?)\s*[:\-]?\s*([A-Za-z][^,.\n]{3,40}(?:,\s*[A-Za-z]{2,20})?)/i
  ) ?? firstMatch(t, /\b(hybrid|remote|on[- ]site|in[- ]office)\b/i);

  // ── Reporting to ──────────────────────────────────────────────────────────
  const reportingTo = firstMatch(t,
    /(?:report(?:ing|s)?\s+(?:to|directly\s+to)|managed\s+by|you['']?ll?\s+work\s+(?:with|under|alongside))\s+(?:the\s+|our\s+)?([A-Za-z][\w\s]{5,40}(?:Manager|Director|VP|Head|Lead|Leader|Coach)?)/i
  );

  // ── Mission statement ──────────────────────────────────────────────────────
  const missionStatement = firstMatch(t,
    /(?:our\s+mission(?:\s+is)?|mission\s*:)\s*["']?([^.\n]{20,200})[."']/i
  ) ?? firstMatch(t,
    /(?:we\s+exist\s+to|we(?:'re|\s+are)\s+on\s+a\s+mission\s+to)\s+([^.\n]{20,200})/i
  );

  // ── Problem statement (intro paragraph) ───────────────────────────────────
  // Grab the first substantive paragraph — usually the company/problem intro
  const introMatch = t.match(/^[\s\S]{0,300}?(?:About\s+\w+|Who\s+we\s+are)[:\s\n]+([^.]{30,300}\.)/im);
  const problemStatement = introMatch
    ? introMatch[1].trim()
    : firstMatch(t, /^([A-Z][^.]{60,300}\.)/m); // first long sentence

  // ── Ideal candidate traits ─────────────────────────────────────────────────
  const traitBullets = extractBullets(t,
    /(?:about\s+you|who\s+you\s+are|you\s+are|ideal\s+candidate|you(?:'re|\s+will\s+be)|we(?:'re|\s+are)\s+looking\s+for\s+someone)/i,
    6
  );
  // Also pick up inline trait adjectives
  const TRAIT_WORDS = /\b(coachable|curious|hungry|driven|resilient|competitive|eager|self[- ]motivated|organized|disciplined|results[- ]oriented|data[- ]driven|team[- ]player|communicat\w+|persistence|persistent|grit|ambitious|proactive|accountable|ownership)\b/gi;
  const inlineTraits = [...lower.matchAll(TRAIT_WORDS)].map(m => m[1]).filter(Boolean);
  const idealCandidateTraits = [
    ...traitBullets.map(b => b.replace(/^(you(?:'re|\s+are|\s+have)\s+)/i, "").trim()),
    ...inlineTraits,
  ]
    .filter((v, i, arr) => v.length > 3 && arr.indexOf(v) === i) // dedup
    .slice(0, 8);

  return {
    seniority,
    yearsRequired,
    compRange,
    compCurrency,
    compStructure,
    keySkills,
    companyValues,
    teamContext,
    careerPath,
    methodology,
    location,
    reportingTo,
    missionStatement,
    problemStatement,
    idealCandidateTraits,
  };
}

// ─── Prompt injection ─────────────────────────────────────────────────────────

/**
 * Builds a context block from parsed signals to inject into generation prompts.
 * Only includes non-null/non-empty signals — won't pollute prompts with empty values.
 */
export function buildJobListingContext(signals: JobListingSignals | undefined): string {
  if (!signals) return "";

  const parts: string[] = [];

  if (signals.careerPath) {
    parts.push(`CAREER PATH: This role is explicitly positioned as a path to ${signals.careerPath}. Answers should reflect awareness of this trajectory — show the candidate is already thinking like the next level up, not just trying to land the current role.`);
  }

  if (signals.companyValues.length > 0) {
    parts.push(`COMPANY VALUES: ${signals.companyValues.join(", ")}. Embody these in how the candidate talks about their work — don't name them explicitly (that sounds like you Googled it), but let them come through in stories and framing.`);
  }

  if (signals.missionStatement) {
    parts.push(`COMPANY MISSION: "${signals.missionStatement}". The "Why This Company" answer should connect to this mission with genuine understanding of the PROBLEM being solved — not just the product features.`);
  }

  if (signals.problemStatement && signals.problemStatement !== signals.missionStatement) {
    parts.push(`COMPANY PROBLEM CONTEXT: ${signals.problemStatement}. Use this to show the candidate understands WHY the company exists, not just WHAT it does. This is the difference between a generic answer and one that makes the interviewer think "this person actually gets it."`);
  }

  if (signals.keySkills.length > 0) {
    parts.push(`KEY SKILLS FROM LISTING: ${signals.keySkills.join(", ")}. Weave at least 2–3 of these into answers naturally — through stories and examples, not by listing them.`);
  }

  if (signals.methodology) {
    parts.push(`METHODOLOGY MENTIONED: The listing references ${signals.methodology}. If the candidate's resume shows relevant experience, reference this methodology by name and explain how they've applied it.`);
  }

  if (signals.idealCandidateTraits.length > 0) {
    parts.push(`TRAITS THEY'RE LOOKING FOR: ${signals.idealCandidateTraits.join(", ")}. Demonstrate these through stories and examples — never claim them directly. "I'm coachable" is empty. A story about implementing feedback under pressure is proof.`);
  }

  if (signals.yearsRequired) {
    parts.push(`EXPERIENCE REQUIRED: ${signals.yearsRequired}. Calibrate answer depth, terminology, and confidence to match this level.`);
  }

  return parts.length > 0 ? parts.join("\n\n") : "";
}

/**
 * Builds the special comp context block used only in the comp expectations answer.
 * When the listing states a comp range, coach the candidate on how to talk about it naturally.
 */
export function buildCompListingContext(signals: JobListingSignals | undefined): string {
  if (!signals?.compRange) return "";

  const rangeStr = [signals.compRange, signals.compCurrency, signals.compStructure]
    .filter(Boolean)
    .join(" ");

  return `
JOB LISTING COMP CONTEXT: The listing states the compensation as: ${rangeStr}.
Since the range is public, coach the candidate to acknowledge it naturally instead of dancing around it:
- Option 1 (transparent): "I saw the listing mentions ${signals.compRange} — that's actually in line with what I'd expect for this type of role at this stage."
- Option 2 (redirect to structure): "The base is in a range I'm comfortable with. What I'm more curious about is how the commission piece is structured — what does on-target look like for someone who's hitting quota?"
- NEVER negotiate hard at the recruiter stage — the goal is to qualify fit and move forward, not to anchor.
- If the range is lower than expected: don't show disappointment. Ask about OTE, accelerators, and path to promotion.`;
}
