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

export type InterviewStage =
  | "recruiter"
  | "hiring_manager"
  | "role_play"
  | "panel"
  | "take_home";

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
  | "competitor_battle_card";

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

// ─── Credits ──────────────────────────────────────────────────────────────────

export interface CreditState {
  balance: number; // synced from Supabase users.credit_balance (or localStorage for anon)
  used: number;
  sessions: string[]; // sessionIds generated
}
