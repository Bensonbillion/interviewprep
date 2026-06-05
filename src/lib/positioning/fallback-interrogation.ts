/**
 * Static fallback interrogation lines — served when the Positioning
 * Engine could not run (unresolvable company profile, classification
 * failure, synthesis exception). The promise on /get-started/insight is
 * "the interview step always renders SOMETHING"; this file is what makes
 * that promise survive engine failures.
 *
 * IMPORTANT: these questions DO NOT pass through the Haiku quality-check
 * loop the live synthesis output does. They were drafted and manually
 * verified against the RED_FLAG_PHRASES + structural rules in
 * src/lib/ai/quality-check.ts (no "passionate", "leverage", "utilize",
 * "quick learner", "throughout my career", "additionally", etc.). Voice
 * was approved on the launch-build review before merge — edit cautiously
 * and re-run the manual phrase scan if you add new ones.
 *
 * These questions are deliberately UNIVERSAL — they work for any (stage,
 * roleType, positioning_type) combo. The function picks 4 per request,
 * with one role-flavored swap when we have a sharper question for the
 * role.
 */

import type { InterrogationLine, InterviewStage, RoleType } from "@/types";

// ─── The universal core (always-eligible) ─────────────────────────────────
const CORE: InterrogationLine[] = [
  {
    question:
      "Walk me through the deal you're proudest of — what was the situation when you picked it up, what specifically did *you* do that mattered, and how did it end?",
    why_it_matters:
      "The proudest-deal answer is the most-asked behavioral question in tech sales and the single best Action probe — what the candidate personally did is what hiring managers screen for.",
    targets: ["behavioral_star", "tell_me_about_yourself"],
    star_slot_hint:
      "S = the named deal/account/moment you picked it up; T = the objective or the conflict; A = the specific moves YOU made (not the team's); R = the named outcome (closed/lost/expanded), with a number if you have one.",
    hypothesis: null,
    directionality_note:
      "Works for SDR (one qualified meeting), AE (one deal), CSM (one renewal), and industry-switcher (an analogous moment from prior customer-facing work).",
  },
  {
    question:
      "Tell me about a deal you lost — what did you misread, what would you do differently now, and what did the buyer actually tell you?",
    why_it_matters:
      "Strong candidates can name a specific loss without flinching and show how it changed their playbook. Inability to do this is a Day-1 red flag.",
    targets: ["behavioral_star", "coachability_coaching"],
    star_slot_hint:
      "S = the specific deal; T = what you were trying to achieve; A = what you did that didn't work AND the specific change you've made since; R = the loss and how you've operationalized the lesson.",
    hypothesis: null,
    directionality_note:
      "Works regardless of seniority — the moment of self-correction is what's load-bearing.",
  },
  {
    question:
      "The most direct critical feedback you've ever gotten — who gave it to you, what specifically did they say, and what did you do about it?",
    why_it_matters:
      "Coachability is the single biggest pre-hire predictor of ramp success. Vague or defensive answers here are a hiring manager's clearest disqualifier.",
    targets: ["coachability_coaching", "behavioral_star"],
    star_slot_hint:
      "S = the context and the person who said it; T = the specific gap they named; A = the change you made (with a timeline — within a week, within a quarter); R = how you know the change stuck.",
    hypothesis: null,
    directionality_note: "Universally relevant — every candidate has had this conversation.",
  },
  {
    question:
      "Why this company, in one or two sentences — and what's the next-best alternative on your list right now?",
    why_it_matters:
      "Tests whether the candidate has a real reason to be here vs. a generic search. The alternative half catches the candidate who can't differentiate.",
    targets: ["why_this_company"],
    star_slot_hint:
      "S = where you are in your search; T = what you've concluded about this category and this team specifically; A = the specific thing that pulled you toward THIS one (the product, the GTM, a person, the buyer); R = the angle you'd plant once you're in seat.",
    hypothesis: null,
    directionality_note:
      "Doesn't require lived competitive experience — works for any positioning type.",
  },
  {
    question:
      "The skill you taught yourself fastest in the last twelve months — what specifically did you do, and how did you know you'd actually learned it?",
    why_it_matters:
      "Learning agility under your own initiative is what separates a 4-month ramp from a 7-month ramp. The proof-of-learning half forces a concrete test.",
    targets: ["coachability_coaching", "behavioral_star"],
    star_slot_hint:
      "S = the moment you decided to learn it and why; T = the standard you were trying to hit; A = what you actually did (a course, shadowed someone, built something); R = the specific test that proved you could do it.",
    hypothesis: null,
    directionality_note:
      "Works for early-career, switcher, and experienced — surfaces real learning agility, not credentials.",
  },
];

// ─── Role-flavored swaps ──────────────────────────────────────────────────
// One sharper question per role that replaces CORE[5] when we have it.
const ROLE_SWAPS: Partial<Record<RoleType, InterrogationLine>> = {
  sdr_bdr: {
    question:
      "The best prospecting sequence or play you've run — what made you choose it for that segment, what reply rate did you see, and what did you change after the first ten attempts?",
    why_it_matters:
      "Forces iteration evidence rather than a recital of a sequence. Strong SDRs can name a number AND a change; weak ones can name neither.",
    targets: ["behavioral_star", "role_play_script"],
    star_slot_hint:
      "S = the segment and the play; T = the hypothesis you were testing; A = the iteration you ran after early data came in; R = the outcome — bookings or what you learned for the next round.",
    hypothesis: null,
    directionality_note: "SDR-specific — replaces a generic prospecting question with one that forces iteration evidence.",
  },
  account_executive: {
    question:
      "Walk me through a deal where the buyer's stated objection wasn't the real one — how did you figure that out, who told you, and how did it change the path of the deal?",
    why_it_matters:
      "Tests discovery instinct under deal pressure. The 'who told you' half forces a real moment — a champion conversation, a stakeholder map, a specific question that surfaced it.",
    targets: ["behavioral_star", "objection_response", "discovery_hypothesis"],
    star_slot_hint:
      "S = the deal and the stated objection; T = what you suspected was underneath; A = the specific move that surfaced the real issue (a question, a champion, a stakeholder you brought in); R = the outcome.",
    hypothesis: null,
    directionality_note: "AE-specific — tests discovery instinct under deal pressure.",
  },
  account_manager_csm: {
    question:
      "The renewal or expansion you were most worried about — what was the warning signal, what specifically did you do across the quarter, and how did it land?",
    why_it_matters:
      "CSM/AM work happens over weeks, not minutes. This question forces a multi-touch playbook rather than a single heroic save.",
    targets: ["behavioral_star"],
    star_slot_hint:
      "S = the account and the warning signal; T = what was at stake (revenue, reference, expansion path); A = the multi-week playbook you ran — what you did, who you brought in, when; R = the renewal/expansion outcome and the relationship state after.",
    hypothesis: null,
    directionality_note: "CSM/AM-specific — substitutes for save-story prompts.",
  },
  other_sales: {
    question:
      "The most sales-like thing you've done in your current role — the specific moment you had to read a person, propose something they didn't ask for, and either land it or learn from it not landing.",
    why_it_matters:
      "For candidates whose resume doesn't read as classic tech sales, this surfaces the actual sales instinct in the work they've done — not a hypothetical.",
    targets: ["career_switcher_bridge", "behavioral_star"],
    star_slot_hint:
      "S = the named situation (a customer, a teammate, a stakeholder); T = the unstated need you read; A = what you actually proposed and how; R = the outcome.",
    hypothesis: null,
    directionality_note: "Bridges any customer-facing role to discovery + closing skill.",
  },
};

/**
 * Return 5 fallback interrogation lines for a session: 4 universal core
 * questions + 1 role-flavored swap when we have one for the roleType
 * (falls through to a universal-flavored 5th when not).
 *
 * stage is currently unused — the surface renders the same set for every
 * stage. We accept it in the signature so future stage-specific tuning
 * (e.g. take-home assignments may want a writing-sample probe) doesn't
 * become a breaking change for callers.
 */
export function getFallbackInterrogationLines(
  _stage: InterviewStage,
  roleType: RoleType
): InterrogationLine[] {
  const roleSwap = ROLE_SWAPS[roleType];
  // CORE[0..3] are universal and always-on. Slot 4 is the role-flavored
  // question when we have a match for this roleType — otherwise we fall
  // through to CORE[4] (the "skill you taught yourself" line, which is
  // universal-flavored).
  const slot4 = roleSwap ?? CORE[4];
  return [CORE[0], CORE[1], CORE[2], CORE[3], slot4];
}
