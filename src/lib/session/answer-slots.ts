/**
 * Builds the ordered list of AnswerSlots for a session.
 * Maps stage + backgroundType + roleType → which answer types to include.
 */

import type { AnswerSlot, AnswerType, InterviewStage, BackgroundType, RoleType, MockCallType } from "@/types";

// ─── Answer type metadata (base — may be overridden per roleType) ─────────────

const ANSWER_LABELS: Record<AnswerType, { label: string; description: string }> = {
  tell_me_about_yourself: {
    label: "Tell Me About Yourself",
    description: "Your 60–90 second narrative, built from your actual career arc and bridged to this company.",
  },
  why_sales: {
    label: "Why Sales?",
    description: "Your authentic reason for pursuing a sales career — specific to your background.",
  },
  why_this_company: {
    label: "Why This Company?",
    description: "Company-specific answer showing real research — not a generic \"I love the culture\" response.",
  },
  behavioral_star: {
    label: "Behavioral STAR Answers",
    description: "Full STAR-format stories drawn from your real resume, calibrated to the most common behavioral questions.",
  },
  comp_expectations: {
    label: "Comp Expectations",
    description: "A confident, market-aware comp answer that leaves room for negotiation.",
  },
  role_play_script: {
    label: "Cold Call Script",
    description: "Full cold call script with opener, discovery questions, value prop, and close — specific to this company's product.",
  },
  objection_response: {
    label: "Objection Responses",
    description: "Responses to the 5 most common cold call objections using the acknowledge → reframe → question framework.",
  },
  company_brief: {
    label: "Company Research Brief",
    description: "Everything you need to know about this company before walking into the interview.",
  },
  cheat_sheet: {
    label: "Stage Cheat Sheet",
    description: "Key points, company facts, strongest story, and the critical tip for this specific interview stage.",
  },
  questions_to_ask: {
    label: "Questions to Ask",
    description: "Sharp, sales-savvy questions that show genuine curiosity and research.",
  },
  coachability_coaching: {
    label: "Coachability Coaching",
    description: "The #1 differentiator in role play: how to receive feedback and immediately implement it.",
  },
  coachability_game_plan: {
    label: "Coachability Game Plan",
    description: "Your complete game plan for the roleplay: before, self-assessment, receiving feedback, the redo, and the meta-signal that wins the hire.",
  },
  career_switcher_bridge: {
    label: "Career Switcher Bridges",
    description: "Framings that connect your non-sales background to sales skills — confident, not apologetic.",
  },
  resume_walkthrough: {
    label: "Walk Me Through Your Resume",
    description: "Decision-arc career narrative — why you made each move, not just what you did.",
  },
  constructive_feedback: {
    label: "Constructive Feedback / Coachability",
    description: "The #1 HM test: show you receive feedback, implement it, and grow from it.",
  },
  cold_email: {
    label: "Cold Email Draft",
    description: "A personalized outreach email to the target buyer at this company — shows prospecting skill and product knowledge before you've even started.",
  },
  pain_point_analysis: {
    label: "Pain Point Analysis",
    description: "Research-backed breakdown of the ICP's top challenges and how this company's product solves them — the foundation of every great outreach.",
  },
  assignment_guide: {
    label: "Assignment Strategy Guide",
    description: "Step-by-step guide to completing your take-home — what to include, how to stand out, and what the hiring team is actually grading.",
  },
  competitor_battle_card: {
    label: "Competitor Battle Cards",
    description: "Structured competitive intel for each main competitor — their strengths, where you win, customer switching triggers, and a discovery question to use when a prospect names them.",
  },
  discovery_hypothesis: {
    label: "Business Hypothesis",
    description: "Your opening statement — a single sentence that frames the entire discovery call around a specific business pain.",
  },
  discovery_questions_technical: {
    label: "Technical Discovery Questions",
    description: "Questions that uncover current state, tools, and process gaps — the surface layer of the Iceberg Framework.",
  },
  discovery_questions_personal: {
    label: "Personal Discovery Questions",
    description: "Questions that make the pain personal — daily frustrations, time waste, and individual burden.",
  },
  discovery_questions_business: {
    label: "Business Discovery Questions",
    description: "Questions that quantify pain in dollars — cost of the status quo, leadership pressure, liability exposure.",
  },
  discovery_trap_questions: {
    label: "Trap Questions",
    description: "Discovery questions that position defensible differentiators as buyer requirements before competitors can claim alternatives.",
  },
  discovery_scoring_guide: {
    label: "Scoring Guide",
    description: "How you'll be evaluated — the 7 scoring categories, what excellence looks like, and the winning moves for each.",
  },
  discovery_pain_recap: {
    label: "Pain Recap Template",
    description: "The most critical moment in discovery — how to recap all pain threads and transition to your recommendation.",
  },
  discovery_opener: {
    label: "Call Opener",
    description: "How to open the call, set the agenda, and transition into discovery — the first 40 seconds that set the tone.",
  },
  discovery_recommendation: {
    label: "My Recommendation",
    description: "The Challenger teach moment and bridge phrase that transitions from pain recap to your recommendation.",
  },
  discovery_close: {
    label: "Close + Next Steps",
    description: "Multi-thread to other stakeholders, propose a concrete next step, and close the call.",
  },
};

// ─── AE-specific label overrides ──────────────────────────────────────────────

const AE_LABEL_OVERRIDES: Partial<Record<AnswerType, { label: string; description: string }>> = {
  why_sales: {
    label: "Why This Move?",
    description: "Your answer to \"Why are you leaving?\" and \"Why this company at this stage?\" — confident, forward-looking, not running away from something.",
  },
  behavioral_star: {
    label: "Deal STAR Stories",
    description: "Full STAR-format deal stories — largest deal, deal you lost, multi-threaded deals, and quota misses. Specific numbers required.",
  },
  role_play_script: {
    label: "Discovery Demo Script",
    description: "Full discovery demo script — agenda-setting opener, qualifying questions before pitching, pivot to demo, executive objection handling.",
  },
  objection_response: {
    label: "Executive Objection Responses",
    description: "Responses to enterprise buyer objections: existing vendor, procurement blockers, pricing, timeline, and multi-stakeholder concerns.",
  },
  coachability_coaching: {
    label: "Coachability Coaching",
    description: "How to handle real-time coaching during your discovery demo — the second attempt is what gets you the offer, not the first.",
  },
  coachability_game_plan: {
    label: "Coachability Game Plan",
    description: "Your complete game plan for the roleplay: before, self-assessment, receiving feedback, the redo, and the meta-signal that wins the hire.",
  },
};

// ─── Stage → answer type mapping ──────────────────────────────────────────────

const STAGE_SLOTS: Record<InterviewStage, AnswerType[]> = {
  recruiter: [
    "tell_me_about_yourself",
    "why_sales",
    "why_this_company",
    "comp_expectations",
    "questions_to_ask",   // A1: recruiters always ask "any questions for me?"
    "company_brief",
    "cheat_sheet",
  ],
  hiring_manager: [
    "tell_me_about_yourself", // A3: HM "walk me through your resume" variant
    "resume_walkthrough",     // B1: decision-arc career narrative (distinct from TMAY)
    "behavioral_star",
    "constructive_feedback",  // B2: coachability test — #1 HM evaluation trait
    "why_this_company",       // A3: HMs probe company motivation deeper than recruiters
    "competitor_battle_card", // E2: HMs test competitive awareness
    "questions_to_ask",
    "company_brief",
    "cheat_sheet",
  ],
  role_play: [
    "coachability_game_plan",  // Game plan first — candidate reads this before the call
    "role_play_script",
    "objection_response",
    "competitor_battle_card",  // E2: prospect will name a competitor mid-call
    "coachability_coaching",
    "cheat_sheet",
  ],
  panel: [
    "tell_me_about_yourself",
    "behavioral_star",        // A2: panel always includes behavioral STAR questions
    "questions_to_ask",
    "company_brief",
    "cheat_sheet",
  ],
  take_home: [
    "cold_email",             // D2: primary deliverable — personalized cold email
    "pain_point_analysis",    // D2: ICP pain point research to anchor the assignment
    "assignment_guide",       // D2: how to complete and stand out on the assignment
    "company_brief",
    "cheat_sheet",
  ],
};

// ─── Discovery call slot override (when mockCallType === 'discovery') ─────────

const DISCOVERY_ROLE_PLAY_SLOTS: AnswerType[] = [
  "discovery_opener",
  "discovery_hypothesis",
  "discovery_questions_technical",
  "discovery_questions_personal",
  "discovery_questions_business",
  "discovery_trap_questions",
  "discovery_pain_recap",
  "discovery_recommendation",
  "discovery_close",
  "discovery_scoring_guide",
];

// ─── Background-type additions ────────────────────────────────────────────────

const BACKGROUND_ADDITIONS: Partial<Record<BackgroundType, AnswerType[]>> = {
  career_switcher: ["career_switcher_bridge"],
};

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildAnswerSlots(
  stage: InterviewStage,
  backgroundType: BackgroundType,
  roleType?: RoleType,
  mockCallType?: MockCallType
): AnswerSlot[] {
  const baseTypes =
    stage === "role_play" && mockCallType === "discovery"
      ? DISCOVERY_ROLE_PLAY_SLOTS
      : STAGE_SLOTS[stage] ?? [];
  const extraTypes = BACKGROUND_ADDITIONS[backgroundType] ?? [];

  // Deduplicate (extras added after base list)
  const allTypes = [...new Set([...baseTypes, ...extraTypes])];

  const isAE = roleType === "account_executive";
  const overrides = isAE ? AE_LABEL_OVERRIDES : {};

  return allTypes.map((type) => {
    const base = ANSWER_LABELS[type];
    const override = overrides[type];
    return {
      type,
      label: override?.label ?? base.label,
      description: override?.description ?? base.description,
      status: "loading" as const,
    };
  });
}

export { ANSWER_LABELS };
