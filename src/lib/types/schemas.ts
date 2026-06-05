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
  "discovery_hypothesis",
  "discovery_questions_technical",
  "discovery_questions_personal",
  "discovery_questions_business",
  "discovery_trap_questions",
  "discovery_scoring_guide",
  "discovery_pain_recap",
  "discovery_opener",
  "discovery_recommendation",
  "discovery_close",
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
export const StageTypeSchema = z.enum([
  "conversational",
  "deep_dive",
  "skills_demo",
  "take_home",
  "presentation_defense",
  "panel_executive",
]);

export const CreateSessionInputSchema = z.object({
  resumeId: z.string().uuid(),
  companyId: z.string().uuid(),
  jobDescription: z.string().min(10).max(10000),
  targetRole: z.string().min(1).max(200),
  roleType: RoleTypeSchema,
  stage: InterviewStageSchema,
  // ─── New flexible stage fields (optional — legacy sessions omit these) ────
  stageName: z.string().max(200).optional(),
  stageType: StageTypeSchema.optional(),
  stageOrder: z.number().int().min(1).max(20).optional(),
  parentSessionId: z.string().uuid().optional(),
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

// ─── Positioning Engine ───────────────────────────────────────────────────────

export const PositioningTypeSchema = z.enum([
  "direct_competitor",
  "adjacent_player",
  "ecosystem",
  "category_switcher",
  "industry_switcher",
  "early_career",
]);

export const PositioningResearchDepthSchema = z.enum([
  "none",
  "minimal",
  "moderate",
  "comprehensive",
]);

export const CompetitiveSourceTypeSchema = z.enum([
  "marketing",
  "g2",
  "repvue",
  "bravado",
  "reddit",
  "glassdoor",
]);

export const ClassificationSignalSchema = z.enum([
  "company_profile_competitors",
  "haiku_classification",
]);

// v4: substantiated_facts (company-level, sourced) + interrogation_lines
// (STAR-shaped questions for the candidate) replace v3's competitive_truths.

export const SubstantiatedFactSchema = z.object({
  fact: z.string().min(1),
  about: z.enum(["target", "anchor", "both"]),
  use_in: z.array(AnswerTypeSchema),
  source: z.string().nullable(),
  source_type: CompetitiveSourceTypeSchema.nullable(),
  confidence: z.number().min(0).max(1),
});

export const InterrogationLineSchema = z.object({
  question: z.string().min(1),
  why_it_matters: z.string().min(1),
  targets: z.array(AnswerTypeSchema),
  star_slot_hint: z.string().min(1),
  hypothesis: z.string().nullable(),
  directionality_note: z.string().min(1),
});

export const CompetitivePointSchema = z.object({
  point: z.string().min(1),
  detail: z.string(),
  confidence: z.number().min(0).max(1),
});

export const TransferableBridgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  why_it_maps: z.string().min(1),
});

// Classifier output. anchor_employer/role are nullable for early_career.
export const PositioningClassificationSchema = z.object({
  positioning_type: PositioningTypeSchema,
  anchor_employer: z.string().nullable(),
  anchor_employer_role: z.string().nullable(),
  classification_reasoning: z.string(),
  classification_confidence: z.number().min(0).max(1),
  classification_signal: ClassificationSignalSchema,
});

// Competitive synthesis (Sonnet) output — validated before upsert.
export const CompetitiveSynthesisSchema = z.object({
  competitive_relationship: z.string(),
  target_company_wedge: z.string(),
  anchor_company_wedge: z.string(),
  where_target_wins: z.array(CompetitivePointSchema),
  where_anchor_wins: z.array(CompetitivePointSchema),
  shared_buyers: z.array(z.string()),
  substantiated_facts: z.array(SubstantiatedFactSchema),
  interrogation_lines: z.array(InterrogationLineSchema),
  research_depth: PositioningResearchDepthSchema,
});

// Switcher synthesis (Haiku) output. interrogation_lines (added when the
// Insight Interview became universal) carry the switcher-shaped questions
// the candidate answers in /get-started/insight. Min 3 enforces the
// "interview always renders SOMETHING" guarantee for switcher sessions;
// the degrade path in switcher.ts uses a static fallback set, not this
// schema, so the floor here is real synthesis output only.
export const SwitcherBriefSchema = z.object({
  transferable_bridges: z.array(TransferableBridgeSchema).min(1),
  domain_gap_to_close: z.string(),
  company_hook: z.string().min(1),
  interrogation_lines: z.array(InterrogationLineSchema).min(3),
});

// Candidate-hook synthesis (Haiku) output.
export const CandidateHookSchema = z.object({
  company_hook: z.string().min(1),
});

// Read-side shape for the engine consumer — what comes back from
// positioning_briefs joined with competitive_dynamics. Matches the
// TypeScript PositioningBrief interface in src/types/index.ts.
export const CompetitiveDynamicSchema = z.object({
  id: z.string().uuid(),
  anchor_company_id: z.string().uuid(),
  target_company_id: z.string().uuid(),
  competitive_relationship: z.string().nullable(),
  target_company_wedge: z.string().nullable(),
  anchor_company_wedge: z.string().nullable(),
  where_target_wins: z.array(CompetitivePointSchema),
  where_anchor_wins: z.array(CompetitivePointSchema),
  shared_buyers: z.array(z.string()),
  substantiated_facts: z.array(SubstantiatedFactSchema),
  interrogation_lines: z.array(InterrogationLineSchema),
  research_depth: PositioningResearchDepthSchema,
  sources: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      source_type: z.string(),
    })
  ),
  intel_refreshed_at: z.string(),
  truths_refreshed_at: z.string(),
});

// Source of the interrogation lines surfaced on /get-started/insight.
// Persisted on positioning_briefs (migration 045) so the route renders
// honest UI copy without having to infer — switcher-synthesized lines
// and static fallback lines both live in fallback_interrogation_lines,
// but only the fallback case gets the "we couldn't fully research this
// matchup" header.
export const InterrogationSourceSchema = z.enum([
  "competitive",
  "switcher",
  "fallback",
]);

export const PositioningBriefSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  positioning_type: PositioningTypeSchema,
  anchor_employer: z.string().nullable(),
  anchor_employer_role: z.string().nullable(),
  classification_reasoning: z.string(),
  classification_confidence: z.number().min(0).max(1),
  classification_signal: ClassificationSignalSchema,
  competitive_dynamic_id: z.string().uuid().nullable(),
  competitive_dynamic: CompetitiveDynamicSchema.optional(),
  transferable_bridges: z.array(TransferableBridgeSchema),
  domain_gap_to_close: z.string().nullable(),
  company_hook: z.string(),
  fallback_interrogation_lines: z.array(InterrogationLineSchema).default([]),
  interrogation_source: InterrogationSourceSchema.default("competitive"),
  generated_at: z.string(),
});

// ─── Insight Interview ────────────────────────────────────────────────────────

export const InsightInterviewStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "skipped",
]);

export const AnswerQualitySchema = z.enum(["unanswered", "thin", "substantive"]);

export const STARCoverageSchema = z.object({
  s: z.boolean(),
  t: z.boolean(),
  a: z.boolean(),
  r: z.boolean(),
});

// Output of evaluateInsightAnswer — what the per-answer endpoint returns.
export const AnswerEvaluationSchema = z.object({
  star_coverage: STARCoverageSchema,
  quality: AnswerQualitySchema,
  thin_reason: z.string(),
  follow_up_question: z.string().nullable(),
});

// Read-side row shape returned from captured_insights.
export const CapturedInsightSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  interrogation_line_index: z.number().int().min(0),
  interrogation_question: z.string(),
  star_slot_hint: z.string(),
  raw_answer: z.string().nullable(),
  drilled_answer: z.string().nullable(),
  final_answer: z.string().nullable(),
  answer_quality: AnswerQualitySchema,
  star_coverage: STARCoverageSchema.nullable(),
  follow_up_question: z.string().nullable(),
  follow_up_dismissed: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

// API input schemas — used by the four insight-interview endpoints.
export const InsightAnswerInputSchema = z.object({
  session_id: z.string().uuid(),
  interrogation_line_index: z.number().int().min(0),
  raw_answer: z.string().min(1).max(10_000),
});

export const InsightDrillInputSchema = z.object({
  session_id: z.string().uuid(),
  interrogation_line_index: z.number().int().min(0),
  follow_up_answer: z.string().min(1).max(10_000),
});

export const InsightCompleteInputSchema = z.object({
  session_id: z.string().uuid(),
  skipped: z.boolean().optional(),
});

// ─── Narrative Spine ──────────────────────────────────────────────────────────

export const StarProofPointSchema = z.object({
  label: z.string().min(1),
  situation: z.string(),
  task: z.string(),
  action: z.string(),
  result: z.string(),
  star_complete: z.boolean(),
  source: z.enum(["captured_insight", "resume", "blended"]),
  gaps: z.array(z.string()),
});

export const SpineCompetitiveTruthSchema = z.object({
  truth: z.string().min(1),
  use_in: z.array(AnswerTypeSchema),
  candidate_phrasing: z.string(),
  star_proof_ref: z.number().int().min(0).nullable(),
});

export const PositioningFrameSchema = z.object({
  type: PositioningTypeSchema,
  frame_statement: z.string().min(1),
});

// Synthesis (Sonnet) output — validated before upsert. Excludes the
// server-managed fields (id, session_id, built_from, generated_at).
export const NarrativeSpineSynthesisSchema = z.object({
  core_thesis: z.string().min(1),
  signature_proof_points: z.array(StarProofPointSchema),
  competitive_truths: z.array(SpineCompetitiveTruthSchema),
  company_hook: z.string().nullable(),
  positioning_frame: PositioningFrameSchema,
  narrative_risks: z.array(z.string()),
});

// Read-side row shape — what comes back from narrative_spines.
export const NarrativeSpineSchema = NarrativeSpineSynthesisSchema.extend({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  built_from: z.object({
    has_positioning_brief: z.boolean(),
    captured_insight_count: z.number().int().min(0),
    positioning_type: PositioningTypeSchema.nullable(),
    insight_interview_status: z.string(),
  }),
  generated_at: z.string(),
});

// ─── Type exports ─────────────────────────────────────────────────────────────

export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;
export type GenerateAnswerInput = z.infer<typeof GenerateAnswerInputSchema>;
export type RateAnswerInput = z.infer<typeof RateAnswerInputSchema>;
export type ResearchCompanyInput = z.infer<typeof ResearchCompanyInputSchema>;
export type InsightAnswerInput = z.infer<typeof InsightAnswerInputSchema>;
export type InsightDrillInput = z.infer<typeof InsightDrillInputSchema>;
export type InsightCompleteInput = z.infer<typeof InsightCompleteInputSchema>;
