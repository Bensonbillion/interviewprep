// ─── Resume Types ────────────────────────────────────────────────────────────

export type BackgroundType =
  | "career_switcher"
  | "experienced_sales"
  | "new_grad"
  | "other";

export type RoleType =
  | "sdr_bdr"
  | "account_executive"
  | "account_manager_csm"
  | "other_sales";

export type BulletCategory =
  | "metric"
  | "responsibility"
  | "tool"
  | "soft_skill"
  | "leadership";

export interface ResumeBullet {
  originalText: string;
  category: BulletCategory;
  salesRelevanceScore: number; // 0–10
  quantified: boolean;
  extractedMetrics: string[];
}

export interface ResumeRole {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  bullets: ResumeBullet[];
}

export interface ParsedResume {
  rawText: string;
  personalInfo: {
    name?: string;
    email?: string;
    linkedin?: string;
  };
  roles: ResumeRole[];
  skills: Array<{
    name: string;
    category: "tool" | "methodology" | "soft_skill" | "certification";
    salesRelevance: number; // 0–10
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year?: string;
  }>;
  backgroundType: BackgroundType;
  narrativeSummary: string; // AI-generated 2–3 sentence profile
  suggestedRoleType?: RoleType; // AI-inferred from job titles + experience level
}

// ─── Extracted Resume (security-hardened, grounded facts only) ───────────────

export interface ExtractedResumeRole {
  company: string | null;
  title: string | null;
  start: string | null;
  end: string | null;
  duration_months: number | null;
  responsibilities: string[];
  wins: string[];
  metrics: string[];
  tools: string[];
  promotion: boolean;
  stories: {
    ownership: string[];
    resilience: string[];
    teamwork: string[];
    learning: string[];
    industry_knowledge: string[];
  };
}

export interface ExtractedResume {
  candidate: {
    name: string | null;
    location: string | null;
    current_title: string | null;
    years_experience_estimate: number | null;
    industries: string[];
    sales_motion: string | null;
    tools_used: string[];
  };
  roles: ExtractedResumeRole[];
  education: string[];
  certifications: string[];
  missing_but_important: string[];
}

// ─── Company Profile ──────────────────────────────────────────────────────────

export type SalesMotion =
  | "inbound"
  | "outbound"
  | "plg"
  | "hybrid"
  | "channel"
  | "unknown";

export type CompanyStage =
  | "startup"
  | "scale_up"
  | "public"
  | "enterprise"
  | "unknown";

export interface CompanyProfile {
  name: string;
  productDescription: string;
  icp: {
    companySizes: string[];
    industries: string[];
    buyerPersonas: string[];
  };
  salesMotion: SalesMotion;
  competitors: string[];
  techStack: string[];
  stage: CompanyStage;
  recentNews: string[];
  cultureSignals: string[];
}

// ─── Relevance Map ────────────────────────────────────────────────────────────

export interface RelevanceMap {
  strongMatches: Array<{
    resumeItem: string;
    relevance: string;
  }>;
  gaps: Array<{
    gap: string;
    bridgingStrategy: string;
  }>;
  leadStories: string[]; // Top 2–3 resume stories to lead with
  careerSwitcherBridges?: Array<{
    originalExperience: string;
    salesTranslation: string;
  }>;
}

// ─── Interview Stage ──────────────────────────────────────────────────────────

/** Legacy stage enum — kept for backward compatibility with existing sessions. */
export type InterviewStage =
  | "recruiter"
  | "hiring_manager"
  | "role_play"
  | "panel"
  | "take_home";

/** New flexible stage type — drives answer slot mapping and content contracts. */
export type { StageType, StageConfig } from "@/lib/types/stages";

// ─── Mock Call Sub-Types ─────────────────────────────────────────────────────

export type MockCallType =
  | "cold_call"
  | "discovery"
  | "demo"
  | null;

export type MockCallPersona =
  | "safety_manager"
  | "fleet_manager"
  | "vp_operations"
  | "cfo"
  | "owner"
  | null;

// ─── Answer Types ─────────────────────────────────────────────────────────────

export type AnswerType =
  | "tell_me_about_yourself"
  | "why_sales"
  | "why_this_company"
  | "behavioral_star"
  | "comp_expectations"
  | "role_play_script"
  | "objection_response"
  | "company_brief"
  | "cheat_sheet"
  | "questions_to_ask"
  | "coachability_coaching"
  | "coachability_game_plan"
  | "career_switcher_bridge"
  | "resume_walkthrough"
  | "constructive_feedback"
  | "cold_email"
  | "pain_point_analysis"
  | "assignment_guide"
  | "competitor_battle_card"
  | "discovery_hypothesis"
  | "discovery_questions_technical"
  | "discovery_questions_personal"
  | "discovery_questions_business"
  | "discovery_trap_questions"
  | "discovery_scoring_guide"
  | "discovery_pain_recap"
  | "discovery_opener"
  | "discovery_recommendation"
  | "discovery_close";

// ─── Answer Slot (locked / loading / unlocked states) ─────────────────────────

export type AnswerSlotStatus = "locked" | "loading" | "unlocked";

export interface AnswerSlot {
  type: AnswerType;
  label: string;
  description: string;
  status: AnswerSlotStatus;
  content?: string;
  answerId?: string; // generated_answers.id once unlocked
  rating?: "up" | "down";
  versions?: string[]; // Previous content versions (oldest first); slot.content is always latest
  regenCount?: number; // Number of times this answer has been regenerated
}

// ─── Cheat Sheet (every stage) ───────────────────────────────────────────────

export interface CheatSheet {
  keyPoints: string[];
  companyFacts: string[];
  strongestStory: string;
  criticalTip: string;
}

// ─── Stage-Specific Prep Kits ─────────────────────────────────────────────────

export interface RecruiterPrepKit {
  stage: "recruiter";
  tmay: string; // 60–90 sec "Tell Me About Yourself" narrative
  filterAnswers: Array<{ question: string; answer: string }>;
  recruiterDecoder: string; // What this round actually evaluates
  cheatSheet: CheatSheet;
}

export interface HiringManagerPrepKit {
  stage: "hiring_manager";
  starAnswers: Array<{
    question: string;
    answer: string;
    resumeSource: string; // Which resume bullet this draws from
  }>;
  careerSwitcherBridges?: Array<{
    situation: string;
    bridge: string;
  }>;
  questionsToAsk: string[];
  cheatSheet: CheatSheet;
}

export interface RolePlayPrepKit {
  stage: "role_play";
  coldCallScript: {
    opener: string;
    qualifyingQuestions: string[];
    valueProp: string;
    objectionResponses: Array<{ objection: string; response: string }>;
    close: string;
  };
  coachabilityCoaching: string;
  practicePrompts: string[];
  cheatSheet: CheatSheet;
}

export interface PanelPrepKit {
  stage: "panel";
  researchTalkingPoints: string[];
  questionsToAsk: Array<{ question: string; why: string }>;
  presenceCoaching: string;
  closeTheInterviewer: string;
  cheatSheet: CheatSheet;
}

export type PrepKit =
  | RecruiterPrepKit
  | HiringManagerPrepKit
  | RolePlayPrepKit
  | PanelPrepKit;

// ─── Session ──────────────────────────────────────────────────────────────────

export interface PrepSession {
  id: string;
  userId?: string;
  resumeId?: string;
  companyId?: string;
  resume: ParsedResume;
  extractedResume?: ExtractedResume;
  jobDescription: string;
  companyName: string;
  companyUrl?: string;
  targetRole: string;
  roleType: RoleType;
  roleSeniority?: "entry" | "mid" | "senior"; // Pre-computed from role title + JD; derived on the fly if absent
  stage: InterviewStage;
  company: CompanyProfile;
  relevanceMap: RelevanceMap;
  answerSlots: AnswerSlot[];
  createdAt: number;
  interviewDate?: string; // ISO date string, e.g. "2025-03-06"
  interviewers?: InterviewerInput[];
  interviewerDossiers?: InterviewerDossier[];
  personalContext?: string; // Optional "what makes you YOU" — hobbies, side projects, etc.
  mockCallType?: MockCallType;
  mockCallPersona?: MockCallPersona;
  interviewerName?: string;
  interviewContext?: string;
  mockAccountName?: string;
  mockAccountContext?: string;
  previousRoundContext?: string;
  isFirstRound?: boolean;
  // ─── New stage architecture (null for legacy sessions) ─────────────────
  stageType?: import("@/lib/types/stages").StageType;
  stageName?: string;
  stageOrder?: number;
  parentSessionId?: string;
  takeHomeContent?: import("@/lib/types/stages").TakeHomeContent;
  takeHomeSubmissionText?: string;
  intelCollected?: boolean;
}

// ─── Interviewer Research ─────────────────────────────────────────────────────

export interface InterviewerInput {
  name: string;
  linkedinUrl?: string;
  roleTitle?: string;
}

export interface InterviewerDossier {
  name: string;
  roleTitle?: string;
  background: string; // 2-3 sentence professional background
  likelyFocusAreas: string[]; // What they tend to assess in interviews
  suggestedTopicsToReference: string[]; // Things that would resonate with this person
  likelyQuestions: string[]; // Questions they are likely to ask
  conversationalStyle?: string; // How they interview (formal, rapid-fire, case-based, etc.)
}

// ─── Positioning Engine ───────────────────────────────────────────────────────
//
// Computes the candidate→target-company relationship and (for competitive
// cases) the shared company-vs-company competitive intel. The brief is
// injected into every answer prompt downstream. See migration 041 and
// src/lib/positioning/*.

export type PositioningType =
  | "direct_competitor"
  | "adjacent_player"
  | "ecosystem"
  | "category_switcher"
  | "industry_switcher"
  | "early_career";

export type PositioningResearchDepth =
  | "none"
  | "minimal"
  | "moderate"
  | "comprehensive";

export type CompetitiveSourceType =
  | "marketing"
  | "g2"
  | "repvue"
  | "bravado"
  | "reddit"
  | "glassdoor";

export type ClassificationSignal =
  | "company_profile_competitors"
  | "haiku_classification";

// v4: split the engine's output into two categorically different shapes.
// substantiated_facts are about the COMPANY (sourced, safe to state);
// interrogation_lines are STAR-shaped questions for the CANDIDATE
// (never claims). See migration 042 and src/lib/ai/positioning-prompts.ts.

export interface SubstantiatedFact {
  fact: string;
  about: "target" | "anchor" | "both";
  use_in: AnswerType[];
  source: string | null;
  source_type: CompetitiveSourceType | null;
  confidence: number; // 0..1
}

export interface InterrogationLine {
  question: string;
  why_it_matters: string;
  targets: AnswerType[];
  star_slot_hint: string;
  hypothesis: string | null; // engine's labeled guess; never a claim
  directionality_note: string;
}

export interface CompetitivePoint {
  point: string;
  detail: string;
  confidence: number; // 0..1
}

export interface CompetitiveSource {
  url: string;
  title: string;
  source_type: CompetitiveSourceType | string;
}

export interface TransferableBridge {
  from: string;
  to: string;
  why_it_maps: string;
}

export interface PositioningClassification {
  positioning_type: PositioningType;
  anchor_employer: string | null;
  anchor_employer_role: string | null;
  classification_reasoning: string;
  classification_confidence: number; // 0..1
  classification_signal: ClassificationSignal;
}

export interface CompetitiveDynamic {
  id: string;
  anchor_company_id: string;
  target_company_id: string;
  competitive_relationship: string | null;
  target_company_wedge: string | null;
  anchor_company_wedge: string | null;
  where_target_wins: CompetitivePoint[];
  where_anchor_wins: CompetitivePoint[];
  shared_buyers: string[];
  substantiated_facts: SubstantiatedFact[];
  interrogation_lines: InterrogationLine[];
  research_depth: PositioningResearchDepth;
  sources: CompetitiveSource[];
  intel_refreshed_at: string;
  truths_refreshed_at: string;
}

export interface PositioningBrief {
  id: string;
  session_id: string;

  positioning_type: PositioningType;
  anchor_employer: string | null;
  anchor_employer_role: string | null;
  classification_reasoning: string;
  classification_confidence: number;
  classification_signal: ClassificationSignal;

  competitive_dynamic_id: string | null;
  competitive_dynamic?: CompetitiveDynamic; // joined on read

  transferable_bridges: TransferableBridge[];
  domain_gap_to_close: string | null;

  company_hook: string;

  generated_at: string;
}

// ─── Insight Interview ────────────────────────────────────────────────────────
//
// Captures the candidate's STAR-shaped answers to interrogation_lines from
// the Positioning Engine. See migration 043 and src/lib/insight/*.

export type InsightInterviewStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

export type AnswerQuality = "unanswered" | "thin" | "substantive";

export interface STARCoverage {
  s: boolean;
  t: boolean;
  a: boolean;
  r: boolean;
}

export interface AnswerEvaluation {
  star_coverage: STARCoverage;
  quality: AnswerQuality;
  /** Empty string when quality is "substantive" or "unanswered". */
  thin_reason: string;
  /** Generated only when quality is "thin". Null otherwise. */
  follow_up_question: string | null;
}

export interface CapturedInsight {
  id: string;
  session_id: string;

  /** Index into competitive_dynamics.interrogation_lines at capture time. */
  interrogation_line_index: number;
  /** Denormalized copy — survives a cache refresh that reorders the array. */
  interrogation_question: string;
  star_slot_hint: string;

  raw_answer: string | null;
  drilled_answer: string | null;
  /** drilled_answer when present, else raw_answer. The downstream input. */
  final_answer: string | null;

  answer_quality: AnswerQuality;
  star_coverage: STARCoverage | null;
  follow_up_question: string | null;
  follow_up_dismissed: boolean;

  created_at: string;
  updated_at: string;
}

// ─── Narrative Spine ──────────────────────────────────────────────────────────
//
// One per-session synthesis the candidate's coherent interview narrative
// is built from. Generated once at the end of the Insight Interview
// (POST /api/insight-interview/complete). Every answer card reads it so
// the kit reads as one person's coherent story rather than six
// independently-generated cards. See migration 044 and src/lib/spine/*.

export interface StarProofPoint {
  label: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  /** True only when all four slots are filled with real specifics. */
  star_complete: boolean;
  source: "captured_insight" | "resume" | "blended";
  /** Honest list of what's missing or weak; non-empty when star_complete is false. */
  gaps: string[];
}

export interface SpineCompetitiveTruth {
  /** The truth as sourced from the candidate's captured answer. */
  truth: string;
  use_in: AnswerType[];
  /** Close to how the candidate actually phrased it. */
  candidate_phrasing: string;
  /** Index into signature_proof_points if this truth has a backing proof; else null. */
  star_proof_ref: number | null;
}

export interface PositioningFrame {
  type: PositioningType;
  frame_statement: string;
}

export interface NarrativeSpineBuiltFrom {
  has_positioning_brief: boolean;
  captured_insight_count: number;
  positioning_type: PositioningType | null;
  insight_interview_status: string;
}

export interface NarrativeSpine {
  id: string;
  session_id: string;
  core_thesis: string;
  signature_proof_points: StarProofPoint[];
  competitive_truths: SpineCompetitiveTruth[];
  company_hook: string | null;
  positioning_frame: PositioningFrame;
  narrative_risks: string[];
  built_from: NarrativeSpineBuiltFrom;
  generated_at: string;
}

// ─── Credits ──────────────────────────────────────────────────────────────────

export interface CreditState {
  balance: number; // synced from Supabase users.credit_balance (or localStorage for anon)
  used: number;
  sessions: string[]; // sessionIds generated
}
