import { z } from "zod";

// ─── Shared enums ─────────────────────────────────────────────────────────────

export const InterviewStageSchema = z.enum([
  "recruiter",
  "hiring_manager",
  "role_play",
  "panel",
  "take_home",
]);

export const RoleTypeSchema = z.enum([
  "sdr_bdr",
  "account_executive",
  "account_manager_csm",
  "other_sales",
]);

export const BackgroundTypeSchema = z.enum([
  "career_switcher",
  "experienced_sales",
  "new_grad",
  "other",
]);

export const AnswerTypeSchema = z.enum([
  "tell_me_about_yourself",
  "why_sales",
  "why_this_company",
  "behavioral_star",
  "comp_expectations",
  "role_play_script",
  "objection_response",
  "company_brief",
  "cheat_sheet",
  "questions_to_ask",
  "coachability_coaching",
  "career_switcher_bridge",
]);

// ─── API input schemas ────────────────────────────────────────────────────────

// POST /api/upload-resume
export const UploadResumeInputSchema = z.object({
  // Validated as FormData in the route; this documents the expected fields
  file: z.any(), // File blob
});

// POST /api/research-company
export const ResearchCompanyInputSchema = z.object({
  companyName: z.string().min(1).max(200),
  companyUrl: z.string().url().optional(),
  jobDescription: z.string().min(10).max(10000).optional(),
});

// POST /api/create-session
export const CreateSessionInputSchema = z.object({
  resumeId: z.string().uuid(),
  companyId: z.string().uuid(),
  jobDescription: z.string().min(10).max(10000),
  targetRole: z.string().min(1).max(200),
  roleType: RoleTypeSchema,
  stage: InterviewStageSchema,
});

// POST /api/generate-answer
export const GenerateAnswerInputSchema = z.object({
  sessionId: z.string().uuid(),
  answerType: AnswerTypeSchema,
  // Optional overrides for retry
  customInstructions: z.string().max(500).optional(),
});

// POST /api/rate-answer
export const RateAnswerInputSchema = z.object({
  answerId: z.string().uuid(),
  rating: z.union([z.literal("up"), z.literal("down"), z.literal("none")]),
});

// ─── API output schemas ───────────────────────────────────────────────────────

export const ParsedResumeSchema = z.object({
  rawText: z.string(),
  personalInfo: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    linkedin: z.string().optional(),
  }),
  roles: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      durationMonths: z.number(),
      bullets: z.array(
        z.object({
          originalText: z.string(),
          category: z.enum(["metric", "responsibility", "tool", "soft_skill", "leadership"]),
          salesRelevanceScore: z.number().min(0).max(10),
          quantified: z.boolean(),
          extractedMetrics: z.array(z.string()),
        })
      ),
    })
  ),
  skills: z.array(
    z.object({
      name: z.string(),
      category: z.enum(["tool", "methodology", "soft_skill", "certification"]),
      salesRelevance: z.number().min(0).max(10),
    })
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      year: z.string().optional(),
    })
  ),
  backgroundType: BackgroundTypeSchema,
  narrativeSummary: z.string(),
});

export const CompanyProfileSchema = z.object({
  name: z.string(),
  productDescription: z.string(),
  icp: z.object({
    companySizes: z.array(z.string()),
    industries: z.array(z.string()),
    buyerPersonas: z.array(z.string()),
  }),
  salesMotion: z.enum(["inbound", "outbound", "plg", "hybrid", "channel", "unknown"]),
  competitors: z.array(z.string()),
  techStack: z.array(z.string()),
  stage: z.enum(["startup", "scale_up", "public", "enterprise", "unknown"]),
  recentNews: z.array(z.string()),
  cultureSignals: z.array(z.string()),
});

export const RelevanceMapSchema = z.object({
  strongMatches: z.array(
    z.object({ resumeItem: z.string(), relevance: z.string() })
  ),
  gaps: z.array(
    z.object({ gap: z.string(), bridgingStrategy: z.string() })
  ),
  leadStories: z.array(z.string()),
  careerSwitcherBridges: z
    .array(
      z.object({
        originalExperience: z.string(),
        salesTranslation: z.string(),
      })
    )
    .optional(),
});

export const AnswerSlotSchema = z.object({
  type: AnswerTypeSchema,
  label: z.string(),
  description: z.string(),
  status: z.enum(["locked", "loading", "unlocked"]),
  content: z.string().optional(),
  answerId: z.string().uuid().optional(),
  rating: z.enum(["up", "down"]).optional(),
});

export const PrepSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().optional(),
  resumeId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  resume: ParsedResumeSchema,
  jobDescription: z.string(),
  companyName: z.string(),
  companyUrl: z.string().optional(),
  targetRole: z.string(),
  roleType: RoleTypeSchema,
  stage: InterviewStageSchema,
  company: CompanyProfileSchema,
  relevanceMap: RelevanceMapSchema,
  answerSlots: z.array(AnswerSlotSchema),
  createdAt: z.number(),
});

// ─── Type exports ─────────────────────────────────────────────────────────────

export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;
export type GenerateAnswerInput = z.infer<typeof GenerateAnswerInputSchema>;
export type RateAnswerInput = z.infer<typeof RateAnswerInputSchema>;
export type ResearchCompanyInput = z.infer<typeof ResearchCompanyInputSchema>;
