import { describe, it, expect } from "vitest";
import {
  GenerateAnswerInputSchema,
  CreateSessionInputSchema,
  RateAnswerInputSchema,
  ResearchCompanyInputSchema,
  AnswerTypeSchema,
  InterviewStageSchema,
  RoleTypeSchema,
} from "@/lib/types/schemas";
import {
  sessionFeedbackSchema,
  explicitFeedbackSchema,
  answerFeedbackSchema,
  reportSchema,
  outcomeUpdateSchema,
  regenerateAnswerSchema,
  extractJobSchema,
  confidenceFeedbackSchema,
  voiceSampleSchema,
  eventFeedbackSchema,
  interviewerResearchSchema,
} from "@/lib/validation/schemas";

// ── Enum schemas ────────────────────────────────────────────────────────

describe("AnswerTypeSchema", () => {
  const validTypes = [
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
  ];

  for (const type of validTypes) {
    it(`accepts "${type}"`, () => {
      expect(AnswerTypeSchema.safeParse(type).success).toBe(true);
    });
  }

  it("rejects invalid type", () => {
    expect(AnswerTypeSchema.safeParse("invalid_type").success).toBe(false);
    expect(AnswerTypeSchema.safeParse("").success).toBe(false);
    expect(AnswerTypeSchema.safeParse(123).success).toBe(false);
  });
});

describe("InterviewStageSchema", () => {
  it("accepts all valid stages", () => {
    for (const stage of ["recruiter", "hiring_manager", "role_play", "panel"]) {
      expect(InterviewStageSchema.safeParse(stage).success).toBe(true);
    }
  });

  it("rejects invalid stage", () => {
    expect(InterviewStageSchema.safeParse("final_round").success).toBe(false);
  });
});

describe("RoleTypeSchema", () => {
  it("accepts all valid role types", () => {
    for (const role of ["sdr_bdr", "account_executive", "account_manager_csm", "other_sales"]) {
      expect(RoleTypeSchema.safeParse(role).success).toBe(true);
    }
  });

  it("rejects invalid role type", () => {
    expect(RoleTypeSchema.safeParse("ceo").success).toBe(false);
  });
});

// ── GenerateAnswerInputSchema ───────────────────────────────────────────

describe("GenerateAnswerInputSchema", () => {
  const valid = {
    sessionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    answerType: "tell_me_about_yourself",
  };

  it("accepts valid input", () => {
    expect(GenerateAnswerInputSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts valid input with customInstructions", () => {
    const result = GenerateAnswerInputSchema.safeParse({
      ...valid,
      customInstructions: "Make it shorter",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID sessionId", () => {
    expect(
      GenerateAnswerInputSchema.safeParse({ ...valid, sessionId: "not-a-uuid" }).success
    ).toBe(false);
  });

  it("rejects answerType with special characters", () => {
    expect(
      GenerateAnswerInputSchema.safeParse({
        ...valid,
        answerType: 'answer"; DROP TABLE--',
      }).success
    ).toBe(false);
  });

  it("rejects customInstructions over 500 chars", () => {
    expect(
      GenerateAnswerInputSchema.safeParse({
        ...valid,
        customInstructions: "A".repeat(501),
      }).success
    ).toBe(false);
  });

  it("allows customInstructions to be omitted", () => {
    const result = GenerateAnswerInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customInstructions).toBeUndefined();
    }
  });
});

// ── CreateSessionInputSchema ────────────────────────────────────────────

describe("CreateSessionInputSchema", () => {
  const valid = {
    resumeId: "00000000-0000-0000-0000-000000000000",
    companyId: "00000000-0000-0000-0000-000000000000",
    jobDescription:
      "We are looking for an experienced SDR to join our growing team",
    targetRole: "Sales Development Representative",
    roleType: "sdr_bdr",
    stage: "recruiter",
  };

  it("accepts valid session data", () => {
    expect(CreateSessionInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing required fields", () => {
    for (const field of Object.keys(valid)) {
      const partial = { ...valid };
      delete (partial as Record<string, unknown>)[field];
      expect(
        CreateSessionInputSchema.safeParse(partial).success,
        `should reject without ${field}`
      ).toBe(false);
    }
  });

  it("rejects non-UUID resumeId", () => {
    expect(
      CreateSessionInputSchema.safeParse({ ...valid, resumeId: "bad" }).success
    ).toBe(false);
  });

  it("rejects non-UUID companyId", () => {
    expect(
      CreateSessionInputSchema.safeParse({ ...valid, companyId: "bad" }).success
    ).toBe(false);
  });

  it("rejects too-short jobDescription (< 10 chars)", () => {
    expect(
      CreateSessionInputSchema.safeParse({ ...valid, jobDescription: "short" })
        .success
    ).toBe(false);
  });

  it("rejects too-long jobDescription (> 10000 chars)", () => {
    expect(
      CreateSessionInputSchema.safeParse({
        ...valid,
        jobDescription: "A".repeat(10001),
      }).success
    ).toBe(false);
  });

  it("rejects empty targetRole", () => {
    expect(
      CreateSessionInputSchema.safeParse({ ...valid, targetRole: "" }).success
    ).toBe(false);
  });

  it("rejects targetRole over 200 chars", () => {
    expect(
      CreateSessionInputSchema.safeParse({
        ...valid,
        targetRole: "A".repeat(201),
      }).success
    ).toBe(false);
  });

  it("rejects invalid roleType", () => {
    expect(
      CreateSessionInputSchema.safeParse({ ...valid, roleType: "ceo" }).success
    ).toBe(false);
  });

  it("rejects invalid stage", () => {
    expect(
      CreateSessionInputSchema.safeParse({ ...valid, stage: "final" }).success
    ).toBe(false);
  });
});

// ── RateAnswerInputSchema ───────────────────────────────────────────────

describe("RateAnswerInputSchema", () => {
  it("accepts valid up/down/none ratings", () => {
    for (const rating of ["up", "down", "none"]) {
      expect(
        RateAnswerInputSchema.safeParse({
          answerId: "00000000-0000-0000-0000-000000000000",
          rating,
        }).success
      ).toBe(true);
    }
  });

  it("rejects non-UUID answerId", () => {
    expect(
      RateAnswerInputSchema.safeParse({ answerId: "bad", rating: "up" }).success
    ).toBe(false);
  });

  it("rejects invalid rating value", () => {
    expect(
      RateAnswerInputSchema.safeParse({
        answerId: "00000000-0000-0000-0000-000000000000",
        rating: "love",
      }).success
    ).toBe(false);
  });
});

// ── ResearchCompanyInputSchema ──────────────────────────────────────────

describe("ResearchCompanyInputSchema", () => {
  it("accepts name only", () => {
    expect(
      ResearchCompanyInputSchema.safeParse({ companyName: "Salesforce" }).success
    ).toBe(true);
  });

  it("accepts name + URL + JD", () => {
    expect(
      ResearchCompanyInputSchema.safeParse({
        companyName: "Salesforce",
        companyUrl: "https://salesforce.com",
        jobDescription: "Looking for an SDR with SaaS experience",
      }).success
    ).toBe(true);
  });

  it("rejects empty companyName", () => {
    expect(
      ResearchCompanyInputSchema.safeParse({ companyName: "" }).success
    ).toBe(false);
  });

  it("rejects companyName over 200 chars", () => {
    expect(
      ResearchCompanyInputSchema.safeParse({ companyName: "A".repeat(201) })
        .success
    ).toBe(false);
  });

  it("rejects invalid URL", () => {
    expect(
      ResearchCompanyInputSchema.safeParse({
        companyName: "Test",
        companyUrl: "not-a-url",
      }).success
    ).toBe(false);
  });
});

// ── Feedback schemas ────────────────────────────────────────────────────

describe("sessionFeedbackSchema", () => {
  it("accepts minimal valid input", () => {
    expect(
      sessionFeedbackSchema.safeParse({ sessionId: "s1" }).success
    ).toBe(true);
  });

  it("accepts all optional fields", () => {
    expect(
      sessionFeedbackSchema.safeParse({
        sessionId: "s1",
        confidenceBefore: 3,
        confidenceAfter: 5,
        mostHelpfulCard: "cheat_sheet",
        wouldRecommend: true,
      }).success
    ).toBe(true);
  });

  it("rejects confidence outside 1-5", () => {
    expect(
      sessionFeedbackSchema.safeParse({ sessionId: "s1", confidenceBefore: 0 })
        .success
    ).toBe(false);
    expect(
      sessionFeedbackSchema.safeParse({ sessionId: "s1", confidenceAfter: 6 })
        .success
    ).toBe(false);
  });
});

describe("explicitFeedbackSchema", () => {
  const valid = {
    sessionId: "s1",
    answerType: "tell_me_about_yourself",
    rating: 4,
  };

  it("accepts valid input", () => {
    expect(explicitFeedbackSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts rating 1-5", () => {
    for (let r = 1; r <= 5; r++) {
      expect(
        explicitFeedbackSchema.safeParse({ ...valid, rating: r }).success
      ).toBe(true);
    }
  });

  it("rejects rating of 0", () => {
    expect(
      explicitFeedbackSchema.safeParse({ ...valid, rating: 0 }).success
    ).toBe(false);
  });

  it("rejects rating of 6", () => {
    expect(
      explicitFeedbackSchema.safeParse({ ...valid, rating: 6 }).success
    ).toBe(false);
  });

  it("accepts optional boolean fields", () => {
    expect(
      explicitFeedbackSchema.safeParse({
        ...valid,
        soundsNatural: true,
        tooLong: false,
        tooGeneric: true,
      }).success
    ).toBe(true);
  });
});

describe("answerFeedbackSchema", () => {
  it("accepts thumbs_up/thumbs_down/copy", () => {
    for (const type of ["thumbs_up", "thumbs_down", "copy"]) {
      expect(
        answerFeedbackSchema.safeParse({
          sessionId: "s1",
          answerType: "why_sales",
          feedbackType: type,
        }).success
      ).toBe(true);
    }
  });

  it("rejects invalid feedbackType", () => {
    expect(
      answerFeedbackSchema.safeParse({
        sessionId: "s1",
        answerType: "why_sales",
        feedbackType: "dislike",
      }).success
    ).toBe(false);
  });
});

describe("confidenceFeedbackSchema", () => {
  it("accepts valid input", () => {
    expect(
      confidenceFeedbackSchema.safeParse({
        sessionId: "s1",
        stage: "recruiter",
        score: 4,
      }).success
    ).toBe(true);
  });

  it("rejects score outside 1-5", () => {
    expect(
      confidenceFeedbackSchema.safeParse({
        sessionId: "s1",
        stage: "recruiter",
        score: 0,
      }).success
    ).toBe(false);
  });
});

describe("voiceSampleSchema", () => {
  it("accepts valid input", () => {
    expect(
      voiceSampleSchema.safeParse({
        sessionId: "s1",
        answerType: "tell_me_about_yourself",
        aiContentSnapshot: "AI generated this content for the user",
        userVersion:
          "This is what I would actually say in my own words and style",
      }).success
    ).toBe(true);
  });

  it("rejects userVersion under 10 chars", () => {
    expect(
      voiceSampleSchema.safeParse({
        sessionId: "s1",
        answerType: "why_sales",
        aiContentSnapshot: "AI content here",
        userVersion: "too short",
      }).success
    ).toBe(false);
  });
});

// ── Report schemas ──────────────────────────────────────────────────────

describe("reportSchema (extended)", () => {
  const valid = {
    companyName: "Salesforce",
    roleTitle: "SDR",
    stage: "recruiter",
  };

  it("accepts full report with questions", () => {
    expect(
      reportSchema.safeParse({
        ...valid,
        difficultyRating: 3,
        durationMinutes: 30,
        questions: [
          {
            questionText: "Tell me about yourself",
            questionCategory: "behavioral",
            wasExpected: true,
            feltPrepared: true,
          },
        ],
      }).success
    ).toBe(true);
  });

  it("rejects durationMinutes > 480", () => {
    expect(
      reportSchema.safeParse({ ...valid, durationMinutes: 500 }).success
    ).toBe(false);
  });

  it("rejects durationMinutes < 1", () => {
    expect(
      reportSchema.safeParse({ ...valid, durationMinutes: 0 }).success
    ).toBe(false);
  });
});

describe("outcomeUpdateSchema", () => {
  it("accepts valid outcome", () => {
    expect(
      outcomeUpdateSchema.safeParse({ reportId: "r1", outcome: "offer" })
        .success
    ).toBe(true);
  });

  it("accepts all outcome types", () => {
    for (const outcome of [
      "offer",
      "advanced",
      "rejected",
      "ghosted",
      "withdrew",
      "pending",
    ]) {
      expect(
        outcomeUpdateSchema.safeParse({ reportId: "r1", outcome }).success
      ).toBe(true);
    }
  });

  it("rejects invalid outcome", () => {
    expect(
      outcomeUpdateSchema.safeParse({ reportId: "r1", outcome: "hired" })
        .success
    ).toBe(false);
  });

  it("accepts optional salary fields", () => {
    expect(
      outcomeUpdateSchema.safeParse({
        reportId: "r1",
        outcome: "offer",
        offerBaseSalary: 75000,
        offerOte: 110000,
        offerCurrency: "USD",
      }).success
    ).toBe(true);
  });
});

// ── Generation schemas ──────────────────────────────────────────────────

describe("extractJobSchema", () => {
  it("accepts valid HTTPS URL", () => {
    expect(
      extractJobSchema.safeParse({ url: "https://linkedin.com/jobs/123" })
        .success
    ).toBe(true);
  });

  it("rejects non-URL string", () => {
    expect(extractJobSchema.safeParse({ url: "not-a-url" }).success).toBe(
      false
    );
  });

  it("rejects URL over 2000 chars", () => {
    expect(
      extractJobSchema.safeParse({
        url: "https://example.com/" + "a".repeat(2000),
      }).success
    ).toBe(false);
  });
});

describe("interviewerResearchSchema", () => {
  it("accepts valid input", () => {
    expect(
      interviewerResearchSchema.safeParse({
        name: "Jane Doe",
        companyName: "Salesforce",
        sessionId: "s1",
      }).success
    ).toBe(true);
  });

  it("accepts optional linkedinUrl", () => {
    expect(
      interviewerResearchSchema.safeParse({
        name: "Jane Doe",
        companyName: "Salesforce",
        sessionId: "s1",
        linkedinUrl: "https://linkedin.com/in/janedoe",
      }).success
    ).toBe(true);
  });

  it("rejects invalid linkedinUrl", () => {
    expect(
      interviewerResearchSchema.safeParse({
        name: "Jane Doe",
        companyName: "Salesforce",
        sessionId: "s1",
        linkedinUrl: "not-a-url",
      }).success
    ).toBe(false);
  });
});
