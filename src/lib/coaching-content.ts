import type { AnswerType } from "@/types";

export interface CoachingData {
  strong: string[];
  improve: string[];
  listeningFor: string[];
  timeTarget: string | null;
  stage: string;
}

export const COACHING_CONTENT: Partial<Record<AnswerType, CoachingData>> = {
  tell_me_about_yourself: {
    stage: "Recruiter is listening for",
    strong: ["Opens with a strong metric hook", "Clear present-past-future structure", "Connects directly to this role"],
    improve: ["Keep to 60-90 seconds — recruiters filter fast", "End with why THIS company, not just sales"],
    listeningFor: ["Can they communicate clearly in under 90 seconds", "Is there a logical career narrative", "Do they understand what this role requires", "Do they sound genuinely motivated for THIS job"],
    timeTarget: "60-90 seconds",
  },
  why_sales: {
    stage: "Recruiter is listening for",
    strong: ["Rooted in a specific story or moment", "Shows genuine motivation not just money", "Connects to a sales-adjacent skill they already have"],
    improve: ["Avoid 'I'm a people person' — too generic", "Anchor to a real experience that proved you can sell"],
    listeningFor: ["Is the motivation authentic or rehearsed", "Do they have a real story behind the interest", "Would they survive a bad month", "Do they connect their past to sales behaviors"],
    timeTarget: "45-60 seconds",
  },
  why_this_company: {
    stage: "Hiring manager is listening for",
    strong: ["References specific product or market position", "Shows understanding of their ICP", "Connects company mission to personal motivation"],
    improve: ["Add a competitive reference — shows market awareness", "Mention something recent — news, funding, launch"],
    listeningFor: ["Did they actually research us", "Do they understand what we sell and who we sell to", "Is this flattery or genuine fit", "Could they sell our product with conviction"],
    timeTarget: "45-60 seconds",
  },
  behavioral_star: {
    stage: "Hiring manager is listening for",
    strong: ["Clear situation with specific context", "Actions focused on what YOU did — not the team", "Quantified result with a number"],
    improve: ["The Result needs a metric — what was the actual outcome", "Keep Action section to what YOU specifically did"],
    listeningFor: ["Is the result quantified", "Is the action theirs or the team's", "Does the story show sales-relevant behavior", "Is it specific enough to be believable"],
    timeTarget: "90-120 seconds",
  },
  comp_expectations: {
    stage: "Recruiter is listening for",
    strong: ["Gives a range based on real market data", "Doesn't anchor too low or too high", "Shows willingness to discuss OTE structure"],
    improve: ["Lead with OTE curiosity, not base demands", "Frame as flexible — show you want the opportunity"],
    listeningFor: ["Are they in budget range", "Do they understand how sales comp works", "Are they inflexible or collaborative", "Do they seem money-motivated in a risky way"],
    timeTarget: "30-45 seconds",
  },
  questions_to_ask: {
    stage: "Interviewer is listening for",
    strong: ["Questions show you've done real research", "Asks about what success looks like in the role", "At least one question demonstrates sales instinct"],
    improve: ["Don't ask about things on their website", "Avoid 'what's the culture like' — too generic"],
    listeningFor: ["Did they prepare or just wing it", "Are they thinking like a seller or a job-seeker", "Do their questions show curiosity about the business", "Would this person represent us well with customers"],
    timeTarget: null,
  },
  company_brief: {
    stage: "Reference material",
    strong: ["Company description in your own words", "ICP and sales motion clearly understood", "Competitive landscape awareness"],
    improve: ["Can you deliver the 30-second pitch confidently", "Know 1-2 recent news items to reference naturally"],
    listeningFor: ["Can you explain what we do to a stranger", "Do you know who we sell to", "Do you know our competitors", "Could you run a discovery call with this knowledge"],
    timeTarget: null,
  },
  cheat_sheet: {
    stage: "Key reminders",
    strong: ["Stage-specific coaching captured", "Critical do's and don'ts visible", "Most important thing to remember is clear"],
    improve: ["Read this within 10 minutes of the interview", "Highlight the single most important point"],
    listeningFor: ["Are you prepared for what this round tests", "Do you know what question is most likely", "Are you ready for the hardest part of this stage", "Do you have a clear close in mind"],
    timeTarget: null,
  },
  coachability_game_plan: {
    stage: "Grader is listening for",
    strong: ["Clear framework for the roleplay structure", "Understands what coachability actually means", "Has a plan for the debrief, not just the call"],
    improve: ["The debrief is 50% of the score — prepare for it", "When they give feedback: 'got it, let me try again'"],
    listeningFor: ["Do they have a call structure in mind", "Will they take feedback immediately and visibly", "Do they sound like someone who can be coached", "Will they ask smart questions after the debrief"],
    timeTarget: null,
  },
  role_play_script: {
    stage: "Grader is listening for",
    strong: ["Clear opener with reason for the call", "Asks a qualifying question before pitching", "Has a specific ask at the end"],
    improve: ["Don't pitch before you've asked one question", "Get to the ask within 3 minutes"],
    listeningFor: ["Can they open naturally without reading a script", "Do they control the call or get controlled", "Is there a real next step proposed", "How do they handle the first objection"],
    timeTarget: "3 minutes",
  },
  objection_response: {
    stage: "Grader is listening for",
    strong: ["Acknowledges the objection before responding", "Isolates to confirm it's the real concern", "Redirects with a question, not a counter-argument"],
    improve: ["Don't fight objections — acknowledge, isolate, redirect", "'That's fair — let me ask you...' beats any argument"],
    listeningFor: ["Do they stay calm under pushback", "Do they acknowledge before responding", "Do they ask a question or give a speech", "Do they sound confident, not desperate"],
    timeTarget: "30-45 seconds each",
  },
  competitor_battle_card: {
    stage: "Reference material",
    strong: ["Knows key differentiators per competitor", "Has a discovery question for each competitor", "Understands switching triggers"],
    improve: ["Acknowledge one competitor strength before positioning", "Never bash — differentiate through capability language"],
    listeningFor: ["Do they know the competitive landscape", "Can they handle 'we use [competitor]' without flinching", "Do they differentiate or just dismiss", "Can they turn a competitor mention into a discovery question"],
    timeTarget: null,
  },
  coachability_coaching: {
    stage: "Grader is listening for",
    strong: ["Shows visible implementation of feedback", "Asks clarifying questions about the feedback", "Second attempt is noticeably different from first"],
    improve: ["75% of candidates lose on coachability, not the call", "Take feedback fast, implement visibly — that's the test"],
    listeningFor: ["Do they get defensive or curious", "Do they implement feedback on the second try", "Do they ask smart follow-up questions", "Does their response to coaching predict on-the-job behavior"],
    timeTarget: null,
  },
  resume_walkthrough: {
    stage: "Hiring manager is listening for",
    strong: ["Each transition explained with decision rationale", "At least one metric per role", "Arc leads naturally to THIS company"],
    improve: ["This is longer than TMAY — 2-3 minutes is right", "Own every career decision — never sound apologetic"],
    listeningFor: ["Does the career arc make logical sense", "Do they own their decisions or seem reactive", "Are there unexplained gaps or pivots", "Does their history predict success in this role"],
    timeTarget: "2-3 minutes",
  },
  constructive_feedback: {
    stage: "Hiring manager is listening for",
    strong: ["Specific and real — not 'I work too hard'", "Shows self-awareness without undermining confidence", "Ends with what you've done to address it"],
    improve: ["The improvement action matters as much as the gap", "Be specific — vague answers signal low self-awareness"],
    listeningFor: ["Are they self-aware", "Is the gap real or performative humility", "Are they working to improve it", "Would this gap be a problem in this role"],
    timeTarget: "45-60 seconds",
  },
  career_switcher_bridge: {
    stage: "Recruiter is listening for",
    strong: ["Reframes background as sales-relevant", "Confident, not apologetic about the transition", "Bridges specific skills to this role"],
    improve: ["Don't explain your background — reframe it", "The bridge should feel inevitable, not defensive"],
    listeningFor: ["Do they own the transition or apologize for it", "Can they name a specific transferable skill", "Is the bridge to sales convincing", "Would I bet on this person ramping quickly"],
    timeTarget: "60-90 seconds",
  },
  cold_email: {
    stage: "Reference material",
    strong: ["Personalized trigger in first line", "Under 150 words total", "Clear CTA with low commitment"],
    improve: ["Lead with a trigger — hiring signal, funding, news", "Don't start with 'I came across your profile'"],
    listeningFor: ["Is the email personalized or templated", "Would you reply to this", "Is the CTA clear and low-friction", "Does it show understanding of the prospect's world"],
    timeTarget: null,
  },
  pain_point_analysis: {
    stage: "Reference material",
    strong: ["Anchors on one specific pain point", "Connects pain to business outcome", "Uses real data or proof points"],
    improve: ["One deep pain beats three shallow ones", "Operational and specific beats broad and safe"],
    listeningFor: ["Do they understand the ICP's real challenges", "Can they articulate why this matters now", "Is the analysis actionable or academic", "Could they use this in a real prospecting conversation"],
    timeTarget: null,
  },
  assignment_guide: {
    stage: "Reference material",
    strong: ["Covers all required deliverables", "Shows depth of research beyond the obvious", "Structured with clear sections"],
    improve: ["Read the checklist before submitting, not after", "The most common failure is great writing with zero research depth"],
    listeningFor: ["Did they follow the brief", "Is there original research or just surface-level work", "Does the submission show sales thinking", "Would you hire based on this work product"],
    timeTarget: null,
  },
  discovery_opener: {
    stage: "Grader is listening for",
    strong: ["Acknowledges prior relationship without re-pitching", "Sets clear agenda before asking first question", "Gets permission before starting discovery"],
    improve: ["Don't skip the agenda — it's what separates AEs from SDRs", "Bridge into discovery naturally from the agenda"],
    listeningFor: ["Do they set an agenda or just start asking", "Do they acknowledge the history with this account", "Do they get permission or just take over", "Does it feel consultative or salesy"],
    timeTarget: "45-60 seconds",
  },
  discovery_hypothesis: {
    stage: "Grader is listening for",
    strong: ["Frames as assumption to validate, not a fact", "References industry-specific pain", "No product mention"],
    improve: ["Deliver measured pace — this sets the frame", "Pause after to let them react"],
    listeningFor: ["Did they do account research", "Does the hypothesis show industry knowledge", "Is it an assumption or a pitch", "Does it make the prospect want to engage"],
    timeTarget: "30 seconds",
  },
  discovery_questions_technical: {
    stage: "Grader is listening for",
    strong: ["Questions are open-ended — Walk me through / Tell me", "Each has a built-in follow-up probe", "Covers current tools, process, and visible gaps"],
    improve: ["Spend max 3 minutes here before moving to personal", "Every answer should get 'say more about that'"],
    listeningFor: ["Are questions open-ended or yes/no", "Do they follow the thread or move on", "Do they map current state before diagnosing", "Do they show genuine curiosity"],
    timeTarget: null,
  },
  discovery_questions_personal: {
    stage: "Grader is listening for",
    strong: ["Connects technical gap to personal frustration", "Asks about their personal time cost", "Gives space for the prospect to vent"],
    improve: ["This layer is where most candidates stay too shallow", "Mirror every answer before asking next question"],
    listeningFor: ["Do they make the pain personal or keep it abstract", "Do they acknowledge answers before asking next", "Are they following the thread or running a script", "Does the prospect feel heard"],
    timeTarget: null,
  },
  discovery_questions_business: {
    stage: "Grader is listening for",
    strong: ["Gets a dollar number on the table", "Calculates cost together rather than telling them", "Connects to leadership pressure"],
    improve: ["Never leave without at least one quantified pain", "Let them do the math — don't give them the number"],
    listeningFor: ["Did they quantify the pain in dollars", "Did they calculate together or just assert a number", "Did they connect to leadership/business impact", "Did they land on business pain before transitioning"],
    timeTarget: null,
  },
  discovery_trap_questions: {
    stage: "Grader is listening for",
    strong: ["Question sounds like genuine curiosity", "Competitor gap is invisible in the question", "No product names used"],
    improve: ["Use only 1 trap per conversation — not all 3", "Ask naturally — if they can hear the product, it's leading"],
    listeningFor: ["Does the question sound natural", "Is the trap invisible to the prospect", "Does the prospect answer in their own words", "Is the required capability now in their language"],
    timeTarget: null,
  },
  discovery_pain_recap: {
    stage: "Grader is listening for",
    strong: ["Covers all 3 pain threads without skipping", "Uses the prospect's exact words where possible", "Gets explicit confirmation before moving on"],
    improve: ["Do NOT skip this — Luke scores it specifically", "Confirm with 'Did I capture that correctly?' before anything else"],
    listeningFor: ["Did they recap all 3 pain layers", "Did they use the prospect's language", "Did they get confirmation before recommending", "Was the pain stack compelling"],
    timeTarget: "60-90 seconds",
  },
  discovery_recommendation: {
    stage: "Grader is listening for",
    strong: ["Challenger teach moment comes before the bridge", "Uses 'my recommendation' — not 'let me show you'", "Capabilities described — no product names"],
    improve: ["Each capability must tie back to their stated pain", "The product name ban is absolute — describe what it DOES"],
    listeningFor: ["Did they use capability language or product names", "Is the bridge phrase 'my recommendation would be'", "Is each capability tied to a stated pain", "Did the Challenger teach come first"],
    timeTarget: "90-120 seconds",
  },
  discovery_close: {
    stage: "Grader is listening for",
    strong: ["Multi-threads to other stakeholders by name", "Confirms no remaining concerns before proposing", "Proposes a working session not a demo"],
    improve: ["Never close with 'let me know what works'", "Expanding scope is scored — name the other stakeholders"],
    listeningFor: ["Did they expand scope to other stakeholders", "Did they surface remaining concerns before closing", "Was the next step specific and concrete", "Did they close for the right type of meeting"],
    timeTarget: "60-90 seconds",
  },
  discovery_scoring_guide: {
    stage: "Reference material",
    strong: ["All scoring categories covered", "Winning moves captured per category", "Pain recap and recommendation language explicit"],
    improve: ["Review this in the 5 minutes before the call", "Focus on Business Pain — it's the hardest category"],
    listeningFor: ["Do you know what a 5/5 looks like for each category", "Have you internalized the pain recap requirement", "Do you have the recommendation bridge memorized", "Are you ready to expand scope at the close"],
    timeTarget: null,
  },
};

export const DEFAULT_COACHING: CoachingData = {
  stage: "Interviewer is listening for",
  strong: ["Content is specific to the company", "Shows preparation and research", "Structured and easy to follow"],
  improve: ["Review before the interview", "Practice saying it out loud"],
  listeningFor: ["Is the candidate prepared", "Do they understand the role", "Are they a good communicator", "Would they represent us well"],
  timeTarget: null,
};

export function getCoaching(answerType: AnswerType): CoachingData {
  return COACHING_CONTENT[answerType] ?? DEFAULT_COACHING;
}
