// ─── Layer 1: Implicit behavioral signals ─────────────────────────────────────

export type EditType =
  | "none"
  | "minor_rewording"
  | "significant_edit"
  | "complete_rewrite"
  | "addition"
  | "deletion";

export interface AnswerInteraction {
  id: string;
  sessionId: string;
  answerId?: string;
  userId?: string;
  answerType: string;

  // Edit tracking
  originalText?: string;
  editedText?: string;
  editDistanceChars?: number;
  editDistanceWords?: number;
  editType?: EditType;

  // Behavioral signals
  timeOnCardSeconds?: number;
  cardExpanded: boolean;
  cardCollapsedWithoutReading: boolean;
  copiedToClipboard: boolean;
  regenerationCount: number;
  regenerationWithPromptChange?: boolean;

  // Quality signal
  explicitRating?: number; // 1–5

  createdAt: string;
}

// ─── Layer 2a: Explicit answer feedback ───────────────────────────────────────

export interface AnswerExplicitFeedback {
  id: string;
  answerId?: string;
  sessionId: string;
  userId?: string;
  answerType: string;

  rating: 1 | 2 | 3 | 4 | 5;

  // Optional dimensions
  soundsNatural?: boolean;
  tooLong?: boolean;
  tooShort?: boolean;
  tooGeneric?: boolean;
  missingDetail?: boolean;

  // Training gold
  howWouldYouSayIt?: string;
  whatWouldImprove?: string;

  createdAt: string;
}

// Payload sent to POST /api/feedback/explicit
export interface AnswerExplicitFeedbackPayload {
  sessionId: string;
  answerId?: string;
  answerType: string;
  rating: number;
  soundsNatural?: boolean;
  tooLong?: boolean;
  tooShort?: boolean;
  tooGeneric?: boolean;
  missingDetail?: boolean;
  howWouldYouSayIt?: string;
  whatWouldImprove?: string;
}

// ─── Layer 2b: Session-level feedback ─────────────────────────────────────────

export type DisappointmentLevel =
  | "very_disappointed"
  | "somewhat_disappointed"
  | "not_disappointed";

export interface SessionFeedback {
  id: string;
  sessionId: string;
  userId?: string;

  confidenceBefore?: number; // 1–10
  confidenceAfter?: number;  // 1–10

  mostHelpfulCard?: string;   // AnswerType
  leastHelpfulCard?: string;  // AnswerType
  wouldRecommend?: boolean;

  disappointmentWithout?: DisappointmentLevel;

  whatElseWouldHelp?: string;

  createdAt: string;
}

export interface SessionFeedbackPayload {
  sessionId: string;
  confidenceBefore?: number;
  confidenceAfter?: number;
  mostHelpfulCard?: string;
  leastHelpfulCard?: string;
  wouldRecommend?: boolean;
  disappointmentWithout?: DisappointmentLevel;
  whatElseWouldHelp?: string;
}

// ─── Layer 3: Post-interview report ───────────────────────────────────────────

export type InterviewOutcome =
  | "advanced"
  | "offer"
  | "rejected"
  | "ghosted"
  | "withdrew"
  | "pending";

export type InterviewFormat = "phone" | "video" | "in_person" | "async";

export type InterviewerSeniority =
  | "peer"
  | "manager"
  | "director"
  | "vp"
  | "c_level";

export interface InterviewReport {
  id: string;
  prepSessionId?: string;
  userId?: string;

  companyName: string;
  companyNameNormalized: string;
  roleTitle: string;
  roleType?: string;

  interviewDate?: string;     // ISO date
  stage: string;              // InterviewStage value
  interviewFormat?: InterviewFormat;
  durationMinutes?: number;

  interviewerTitle?: string;
  interviewerSeniority?: InterviewerSeniority;

  totalStagesInProcess?: number;
  currentStageNumber?: number;
  dayssinceApplication?: number;

  outcome?: InterviewOutcome;
  outcomeUpdatedAt?: string;

  offerBaseSalary?: number;
  offerOte?: number;
  offerCurrency?: string;

  difficultyRating?: number;  // 1–5
  experienceRating?: "positive" | "neutral" | "negative";

  overallNotes?: string;
  adviceForOthers?: string;

  isAnonymized: boolean;
  anonymizedAt?: string;

  processedForPlaybook: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Layer 3: Reported interview questions ────────────────────────────────────

export type QuestionCategory =
  | "behavioral"
  | "situational"
  | "technical"
  | "roleplay"
  | "case_study"
  | "culture_fit"
  | "closing"
  | "curveball";

export interface InterviewQuestionReported {
  id: string;
  reportId: string;
  userId?: string;

  questionText: string;
  questionCategory?: QuestionCategory;

  interviewStage: string;
  wasExpected?: boolean;

  feltPrepared?: boolean;
  answerQualitySelfRating?: number; // 1–5

  // Only returned by API when the requesting user is the submitter
  whatIActuallySaid?: string;
  whatIWishISaid?: string;

  matchedAnswerType?: string;
  ourAnswerWasHelpful?: boolean;

  isVerified: boolean;
  verificationCount: number;

  companyNameNormalized: string;
  roleType?: string;

  createdAt: string;
}

export interface ReportedQuestionPayload {
  questionText: string;
  questionCategory?: QuestionCategory;
  interviewStage: string;
  wasExpected?: boolean;
  feltPrepared?: boolean;
  answerQualitySelfRating?: number;
  whatIActuallySaid?: string;
  whatIWishISaid?: string;
  matchedAnswerType?: string;
  ourAnswerWasHelpful?: boolean;
}

// ─── Company playbooks ────────────────────────────────────────────────────────

export type PlaybookConfidenceLevel = "low" | "medium" | "high";

export interface PlaybookStage {
  stage: string;
  format: InterviewFormat;
  avgDurationMinutes: number;
  frequencyPct: number;
}

export interface PlaybookQuestion {
  question: string;
  frequency: number;
  category: QuestionCategory;
}

export interface PlaybookSuccessSignals {
  highCorrelation: string[];
  commonInOffers: string[];
  redFlags: string[];
}

export interface CompanyPlaybook {
  id: string;
  companyNameNormalized: string;
  companyDisplayName: string;

  totalReports: number;
  avgProcessDurationDays?: number;
  avgDifficulty?: number;
  positiveExperiencePct?: number;
  offerRatePct?: number;

  typicalStages?: PlaybookStage[];
  topQuestionsByStage?: Record<string, PlaybookQuestion[]>;

  salaryRangeLow?: number;
  salaryRangeHigh?: number;
  salaryCurrency?: string;
  avgOte?: number;

  successSignals?: PlaybookSuccessSignals;

  lastUpdated: string;
  reportThresholdMet: boolean;
  confidenceLevel?: PlaybookConfidenceLevel;

  createdAt: string;
}

// ─── Prompt quality metrics ───────────────────────────────────────────────────

export interface PromptQualityMetrics {
  id: string;
  answerType: string;
  weekStart: string; // ISO date

  totalGenerations?: number;
  avgExplicitRating?: number;
  editRate?: number;
  avgEditDistance?: number;
  regenerationRate?: number;
  copyRate?: number;
  avgTimeOnCardSeconds?: number;
  avgOutcomeScore?: number;

  promptVersion?: string;
  promptHash?: string;

  createdAt: string;
}
