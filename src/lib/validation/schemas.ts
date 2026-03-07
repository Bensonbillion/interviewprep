import { z } from "zod";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Trim + max length + strip script tags and javascript: URIs. */
const safeString = (maxLength = 1000) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((s) =>
      s
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/javascript:/gi, "")
    );

// ─── Feedback schemas ────────────────────────────────────────────────────────

export const sessionFeedbackSchema = z.object({
  sessionId: z.string().min(1).max(100),
  confidenceBefore: z.number().int().min(1).max(5).optional(),
  confidenceAfter: z.number().int().min(1).max(5).optional(),
  mostHelpfulCard: z.string().max(100).optional(),
  leastHelpfulCard: z.string().max(100).optional(),
  wouldRecommend: z.boolean().optional(),
  disappointmentWithout: z.string().max(500).optional(),
  whatElseWouldHelp: z.string().max(2000).optional(),
});

export const explicitFeedbackSchema = z.object({
  sessionId: z.string().min(1).max(100),
  answerId: z.string().max(100).nullable().optional(),
  answerType: z.string().min(1).max(50),
  rating: z.number().int().min(1).max(5),
  soundsNatural: z.boolean().optional(),
  tooLong: z.boolean().optional(),
  tooShort: z.boolean().optional(),
  tooGeneric: z.boolean().optional(),
  missingDetail: z.boolean().optional(),
  howWouldYouSayIt: safeString(5000).optional(),
  whatWouldImprove: safeString(2000).optional(),
});

export const interactionSchema = z.object({
  interactions: z
    .array(
      z.object({
        session_id: z.string().min(1).max(100),
        answer_id: z.string().max(100).nullable(),
        user_id: z.string().max(100).nullable(),
        answer_type: z.string().min(1).max(50),
        original_text: z.string().max(50000).nullable(),
        edited_text: z.string().max(50000).nullable(),
        edit_distance_chars: z.number().int().min(0).nullable(),
        edit_distance_words: z.number().int().min(0).nullable(),
        edit_type: z.string().max(50).nullable(),
        time_on_card_seconds: z.number().min(0).nullable(),
        card_expanded: z.boolean(),
        card_collapsed_without_reading: z.boolean(),
        copied_to_clipboard: z.boolean(),
        regeneration_count: z.number().int().min(0),
        regeneration_with_prompt_change: z.boolean().nullable(),
      })
    )
    .max(50),
});

export const interviewReportFeedbackSchema = z.object({
  prepSessionId: z.string().max(100).optional(),
  companyName: safeString(200),
  roleTitle: safeString(200),
  stage: z.string().min(1).max(50),
  interviewDate: z.string().max(30).optional(),
  outcome: z.string().max(50).optional(),
  durationMinutes: z.number().int().min(1).max(480).optional(),
  numInterviewers: z.number().int().min(1).max(20).optional(),
  interviewerRoles: z.array(z.string().max(100)).max(10).optional(),
  questionsAsked: z
    .array(
      z.object({
        question: safeString(1000),
        type: z.string().max(50),
        notes: safeString(2000).optional(),
      })
    )
    .max(20)
    .optional(),
  includedRoleplay: z.boolean().optional(),
  roleplayScenario: safeString(500).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  experience: z.string().max(50).optional(),
  notes: safeString(5000).optional(),
});

export const confidenceFeedbackSchema = z.object({
  sessionId: z.string().min(1).max(100),
  stage: z.string().min(1).max(50),
  companyName: z.string().max(200).optional(),
  score: z.number().int().min(1).max(5),
  blockerText: safeString(2000).optional(),
});

export const voiceSampleSchema = z.object({
  sessionId: z.string().min(1).max(100),
  answerType: z.string().min(1).max(50),
  aiContentSnapshot: z.string().min(1).max(50000),
  userVersion: z.string().min(10).max(50000),
  stage: z.string().max(50).optional(),
  roleType: z.string().max(50).optional(),
});

export const eventFeedbackSchema = z.object({
  sessionId: z.string().min(1).max(100),
  answerType: z.string().max(50).optional(),
  eventType: z.string().min(1).max(50),
  durationMs: z.number().int().min(0).optional(),
  editDistance: z.number().int().min(0).optional(),
  wordsChangedPct: z.number().min(0).max(100).optional(),
  regenSequence: z.number().int().min(0).optional(),
});

export const answerFeedbackSchema = z.object({
  sessionId: z.string().min(1).max(100),
  answerType: z.string().min(1).max(50),
  feedbackType: z.enum(["thumbs_up", "thumbs_down", "copy"]),
  issueCategory: z.string().max(100).nullable().optional(),
});

// ─── Report schemas ──────────────────────────────────────────────────────────

export const reportSchema = z.object({
  prepSessionId: z.string().max(100).optional(),
  companyName: safeString(200),
  roleTitle: safeString(200),
  stage: z.string().min(1).max(50),
  interviewFormat: z.string().max(50).optional(),
  durationMinutes: z.number().int().min(1).max(480).optional(),
  difficultyRating: z.number().int().min(1).max(5).optional(),
  experienceRating: z.string().max(50).optional(),
  overallNotes: safeString(5000).optional(),
  interviewerTitle: safeString(200).optional(),
  totalStagesInProcess: z.number().int().min(1).max(20).optional(),
  currentStageNumber: z.number().int().min(1).max(20).optional(),
  daysSinceApplication: z.number().int().min(0).max(365).optional(),
  outcome: z.string().max(50).optional(),
  questions: z
    .array(
      z.object({
        questionText: safeString(1000),
        questionCategory: z.string().max(50).optional(),
        wasExpected: z.boolean().optional(),
        feltPrepared: z.boolean().optional(),
        ourAnswerWasHelpful: z.boolean().nullable().optional(),
        whatIActuallySaid: safeString(5000).optional(),
        whatIWishISaid: safeString(5000).optional(),
        matchedAnswerType: z.string().max(50).optional(),
      })
    )
    .max(15)
    .optional(),
});

export const outcomeUpdateSchema = z.object({
  reportId: z.string().min(1).max(100),
  outcome: z.enum([
    "offer",
    "advanced",
    "rejected",
    "ghosted",
    "withdrew",
    "pending",
  ]),
  offerBaseSalary: z.number().min(0).optional(),
  offerOte: z.number().min(0).optional(),
  offerCurrency: z.string().max(10).optional(),
  rejectionFeedback: safeString(2000).optional(),
  whatWouldDoDifferently: safeString(2000).optional(),
  nextStage: z.string().max(100).optional(),
});

// ─── Generation schemas ──────────────────────────────────────────────────────

export const regenerateAnswerSchema = z.object({
  answerType: z.string().min(1).max(50),
  session: z.object({}).passthrough(), // Validated structurally by existing code
  quickAction: z
    .enum(["shorter", "more_confident", "add_metrics", "star_format"])
    .optional(),
  customInstructions: safeString(500).optional(),
});

export const generateFollowupSchema = z.object({
  session: z.object({}).passthrough(),
  notes: safeString(5000).optional(),
  interviewerIndex: z.number().int().min(0).max(20).optional(),
});

export const crossReferenceSchema = z.object({
  resume: z.object({}).passthrough(),
  company: z.object({}).passthrough(),
  jobDescription: z.string().min(1).max(15000),
  targetRole: safeString(200),
  roleType: z.string().max(50).optional(),
});

export const extractJobSchema = z.object({
  url: z.string().url().max(2000),
});

export const interviewerResearchSchema = z.object({
  name: safeString(200),
  linkedinUrl: z.string().url().max(500).optional(),
  roleTitle: z.string().max(200).optional(),
  companyName: safeString(200),
  sessionId: z.string().min(1).max(100),
});

export const metaCapiSchema = z.object({
  eventName: z.string().min(1).max(100),
  eventId: z.string().max(200).optional(),
  sourceUrl: z.string().max(2000).optional(),
  email: z.string().email().max(320).optional(),
  customData: z.record(z.string(), z.unknown()).optional(),
});
