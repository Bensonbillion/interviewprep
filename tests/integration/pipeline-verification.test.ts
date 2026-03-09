/**
 * Pipeline verification test — validates that all 5 prompts are wired correctly
 * and the quality check catches anti-patterns.
 *
 * Tests prompt CONSTRUCTION (no API calls) + quality checking on sample answers.
 */

import { describe, it, expect } from "vitest";
import { buildPromptForAnswerType } from "@/lib/ai/prompts";
import { checkAnswerQuality } from "@/lib/ai/quality-check";
import type { AnswerType } from "@/types";

// ── Test Personas ─────────────────────────────────────────────────────────────

const salesforceSDR = {
  resume: {
    rawText: "",
    personalInfo: { name: "Alex Chen" },
    roles: [
      {
        company: "Local Retail Store",
        title: "Sales Associate",
        startDate: "2022-06",
        endDate: "2024-01",
        durationMonths: 19,
        bullets: [
          { originalText: "Ranked #2 in store for customer satisfaction (4.8/5)", category: "metric" as const, salesRelevanceScore: 7, quantified: true, extractedMetrics: ["#2", "4.8/5"] },
          { originalText: "Upsold accessories to 40% of customers through consultative approach", category: "metric" as const, salesRelevanceScore: 8, quantified: true, extractedMetrics: ["40%"] },
        ],
      },
    ],
    skills: [{ name: "Communication", category: "soft_skill" as const, salesRelevance: 7 }],
    education: [{ institution: "State University", degree: "B.A. Business" }],
    backgroundType: "new_grad" as const,
    narrativeSummary: "Recent grad with retail sales background. Competitive and customer-facing.",
  },
  company: {
    name: "Salesforce",
    productDescription: "Cloud-based CRM platform for sales, service, and marketing",
    icp: { companySizes: ["Enterprise", "Mid-Market"], industries: ["Technology", "Financial Services"], buyerPersonas: ["VP of Sales", "CRO"] },
    salesMotion: "hybrid" as const,
    competitors: ["HubSpot", "Microsoft Dynamics", "Oracle"],
    techStack: ["Salesforce", "Tableau", "Slack"],
    stage: "public" as const,
    recentNews: ["AI expansion announcement"],
    cultureSignals: ["Competitive", "Innovation-focused"],
  },
  relevanceMap: {
    strongMatches: [{ resumeItem: "Sales Associate rankings", relevance: "Competitive spirit matches Salesforce culture" }],
    gaps: [{ gap: "No SaaS experience", bridgingStrategy: "Retail upselling → discovery and qualification" }],
    leadStories: ["#2 ranking through consultative selling"],
  },
  jobDescription: "Entry Level SDR at Salesforce",
  targetRole: "Sales Development Representative",
  roleType: "sdr_bdr" as const,
  stage: "recruiter" as const,
  seniority: "entry" as const,
};

const hubspotTeacher = {
  resume: {
    rawText: "",
    personalInfo: { name: "Jordan Smith" },
    roles: [
      {
        company: "Lincoln Middle School",
        title: "8th Grade English Teacher",
        startDate: "2018-09",
        endDate: "2024-06",
        durationMonths: 70,
        bullets: [
          { originalText: "Led fundraising campaign raising $50,000 from parents, businesses, and district", category: "metric" as const, salesRelevanceScore: 9, quantified: true, extractedMetrics: ["$50,000"] },
          { originalText: "Increased student test scores by 18% through targeted intervention", category: "metric" as const, salesRelevanceScore: 6, quantified: true, extractedMetrics: ["18%"] },
        ],
      },
    ],
    skills: [{ name: "Persuasion", category: "soft_skill" as const, salesRelevance: 8 }],
    education: [{ institution: "University of Michigan", degree: "B.A. English Education" }],
    backgroundType: "career_switcher" as const,
    narrativeSummary: "Career-switching educator with 6+ years of persuasion and stakeholder management.",
  },
  company: {
    name: "HubSpot",
    productDescription: "All-in-one CRM, marketing automation, and sales enablement platform",
    icp: { companySizes: ["SMB", "Mid-Market"], industries: ["SaaS", "Technology"], buyerPersonas: ["Marketing Manager", "Sales Manager"] },
    salesMotion: "inbound" as const,
    competitors: ["Salesforce", "Marketo", "Pipedrive"],
    techStack: ["HubSpot", "Slack"],
    stage: "public" as const,
    recentNews: ["New AI assistant launch"],
    cultureSignals: ["Culture Code", "Transparency", "Remote-first"],
  },
  relevanceMap: {
    strongMatches: [{ resumeItem: "$50K fundraising campaign", relevance: "Full prospecting → qualifying → pitching → closing cycle" }],
    gaps: [{ gap: "No B2B or SaaS experience", bridgingStrategy: "Fundraising = outbound prospecting. Parent conferences = discovery calls." }],
    leadStories: ["Convincing skeptical principal to approve fundraising campaign"],
    careerSwitcherBridges: [
      { originalExperience: "Classroom management with 120 students", salesTranslation: "Pipeline management and prioritization" },
      { originalExperience: "Parent conferences for behavior change", salesTranslation: "Discovery calls and consultative selling" },
    ],
  },
  jobDescription: "SDR at HubSpot — background flexible, love for connecting with people required",
  targetRole: "Sales Development Representative",
  roleType: "sdr_bdr" as const,
  stage: "recruiter" as const,
  seniority: "entry" as const,
};

const gongBDR = {
  resume: {
    rawText: "",
    personalInfo: { name: "Sarah Williams" },
    roles: [
      {
        company: "Outreach",
        title: "Senior BDR",
        startDate: "2022-03",
        endDate: "2024-12",
        durationMonths: 33,
        bullets: [
          { originalText: "Generated $1.8M in qualified pipeline through outbound prospecting", category: "metric" as const, salesRelevanceScore: 10, quantified: true, extractedMetrics: ["$1.8M"] },
          { originalText: "Maintained 142% to quota for 4 consecutive quarters", category: "metric" as const, salesRelevanceScore: 10, quantified: true, extractedMetrics: ["142%"] },
          { originalText: "Mentored 3 junior BDRs — 2 promoted to senior, 1 to AE", category: "leadership" as const, salesRelevanceScore: 8, quantified: true, extractedMetrics: ["3", "2", "1"] },
        ],
      },
      {
        company: "Intercom",
        title: "BDR",
        startDate: "2020-06",
        endDate: "2022-02",
        durationMonths: 20,
        bullets: [
          { originalText: "Hit 118% quota in first full year with zero territory history", category: "metric" as const, salesRelevanceScore: 9, quantified: true, extractedMetrics: ["118%"] },
        ],
      },
    ],
    skills: [
      { name: "Outreach", category: "tool" as const, salesRelevance: 10 },
      { name: "Salesforce", category: "tool" as const, salesRelevance: 9 },
      { name: "MEDDIC", category: "methodology" as const, salesRelevance: 8 },
    ],
    education: [{ institution: "UC Davis", degree: "B.A. Business" }],
    backgroundType: "experienced_sales" as const,
    narrativeSummary: "High-performing BDR with 4+ years SaaS sales, $1.8M+ pipeline, 142% quota attainment.",
  },
  company: {
    name: "Gong",
    productDescription: "Revenue Intelligence platform that records, transcribes, and analyzes customer conversations",
    icp: { companySizes: ["Mid-Market", "Enterprise"], industries: ["SaaS", "Technology"], buyerPersonas: ["VP of Sales", "Revenue Leader"] },
    salesMotion: "outbound" as const,
    competitors: ["Chorus.ai", "Clari", "Dialpad"],
    techStack: ["Gong", "Salesforce", "Outreach"],
    stage: "scale_up" as const,
    recentNews: ["$200M Series D funding"],
    cultureSignals: ["Data-driven", "Execution-focused", "Competitive"],
  },
  relevanceMap: {
    strongMatches: [
      { resumeItem: "$1.8M pipeline at Outreach", relevance: "Same ICP/motion as Gong" },
      { resumeItem: "142% quota × 4 quarters", relevance: "Exceptional consistency" },
    ],
    gaps: [{ gap: "No recording tool experience", bridgingStrategy: "Strong MEDDIC and discovery skills transfer directly" }],
    leadStories: ["Custom Outreach playbook that lifted team conversion 27%"],
  },
  jobDescription: "Senior BDR at Gong — own a territory, mentor others, drive revenue",
  targetRole: "Senior BDR",
  roleType: "sdr_bdr" as const,
  stage: "hiring_manager" as const,
  seniority: "senior" as const,
};

// ── Helper ────────────────────────────────────────────────────────────────────

function buildPrompt(persona: typeof salesforceSDR, answerType: AnswerType) {
  return buildPromptForAnswerType(answerType, persona);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Prompt 1+3: Company intel and golden examples appear in prompts", () => {
  it("Salesforce cheat sheet prompt references competitive energy", () => {
    const { user } = buildPrompt(salesforceSDR, "cheat_sheet");
    expect(user).toContain("Salesforce");
    expect(user).toContain("recruiter");
    // Should have the quick talk track section
    expect(user).toContain("quickTalkTrack");
    expect(user).toContain("grandmotherCompanyDescription");
    expect(user).toContain("thirtySecondTmay");
  });

  it("HubSpot cheat sheet includes Culture Code in company context", () => {
    const { user } = buildPrompt(hubspotTeacher, "cheat_sheet");
    expect(user).toContain("HubSpot");
    expect(user).toContain("Culture Code");
  });

  it("Gong cheat sheet references coachability testing", () => {
    const { system, user } = buildPrompt(gongBDR, "cheat_sheet");
    const combined = system + user;
    // The hiring manager intelligence block mentions coachability
    expect(combined).toContain("coachability");
  });
});

describe("Prompt 2: Prompt builders include real-world patterns", () => {
  it("TMAY recruiter prompt includes moment-based opener instruction", () => {
    const { user } = buildPrompt(salesforceSDR, "tell_me_about_yourself");
    expect(user).toContain("MOMENT");
    expect(user).toContain("REALIZATION");
    // Should ban the invisible opener
    expect(user).toContain("I am a [role] with X years of experience");
  });

  it("TMAY hiring manager prompt includes turning point instruction", () => {
    const { user } = buildPrompt(gongBDR, "tell_me_about_yourself");
    expect(user).toContain("TURNING POINT");
    expect(user).toContain("decision RATIONALE");
  });

  it("Why sales prompt includes career switcher bridges for teacher", () => {
    const { user } = buildPrompt(hubspotTeacher, "why_sales");
    expect(user).toContain("Teachers");
    expect(user).toContain("classroom management");
    expect(user).toContain("Hospitality/retail");
  });

  it("Why this company prompt includes grandmother test", () => {
    const { user } = buildPrompt(salesforceSDR, "why_this_company");
    expect(user).toContain("grandmother test");
    expect(user).toContain("SPECIFIC customers");
  });

  it("Questions to ask prompt includes real hired-candidate questions", () => {
    const { user } = buildPrompt(gongBDR, "questions_to_ask");
    expect(user).toContain("top performer do differently");
    expect(user).toContain("coach me on something");
    expect(user).toContain("CLOSE");
  });

  it("Comp expectations prompt includes deflection pattern", () => {
    const { user } = buildPrompt(salesforceSDR, "comp_expectations");
    expect(user).toContain("What is budgeted for the role");
    expect(user).toContain("weakness signal");
  });

  it("Cold call script prompt includes self-assessment and coachability", () => {
    const { user } = buildPrompt(salesforceSDR, "role_play_script");
    expect(user).toContain("self-assessment");
    expect(user).toContain("coaching");
    // Should reference the two-attempt pattern
    expect(user).toContain("TWO attempts");
  });

  it("Behavioral STAR prompt includes rejection story structure", () => {
    const { user } = buildPrompt(gongBDR, "behavioral_star");
    expect(user).toContain("rejection story structure");
    expect(user).toContain("reflection layer matters more than the result");
  });
});

describe("Prompt 4: Quality check catches anti-patterns", () => {
  it("catches 'I am passionate about'", () => {
    const result = checkAnswerQuality(
      "I am passionate about sales because I love connecting with people.",
      "why_sales",
      "entry"
    );
    expect(result.criticalCount).toBeGreaterThan(0);
    expect(result.shouldRegenerate).toBe(true);
    expect(result.issues.some((i) => i.pattern.includes("passionate"))).toBe(true);
  });

  it("catches 'thrive in fast-paced environments'", () => {
    const result = checkAnswerQuality(
      "I thrive in fast-paced environments and I'm a self-starter who is results-driven.",
      "tell_me_about_yourself",
      "mid"
    );
    expect(result.criticalCount).toBeGreaterThanOrEqual(1);
    expect(result.issues.some((i) => i.pattern.includes("fast-paced"))).toBe(true);
  });

  it("catches 'As a...' opener", () => {
    const result = checkAnswerQuality(
      "As a dedicated sales professional with 3 years of experience, I have consistently exceeded quota.",
      "tell_me_about_yourself",
      "mid"
    );
    expect(result.issues.some((i) => i.pattern.includes("As a"))).toBe(true);
  });

  it("catches no contractions in spoken answer", () => {
    const result = checkAnswerQuality(
      "I am currently working at a technology company where I have been responsible for generating pipeline. I have built relationships with enterprise accounts and I have consistently hit my targets. It is something I am proud of and it has taught me a great deal about persistence. I would love to bring this experience to your team.",
      "tell_me_about_yourself",
      "mid"
    );
    expect(result.issues.some((i) => i.pattern.includes("contraction"))).toBe(true);
  });

  it("catches 'leverage' and 'utilize'", () => {
    const result = checkAnswerQuality(
      "I've been able to leverage my experience and utilize various tools to drive results.",
      "tell_me_about_yourself",
      "mid"
    );
    expect(result.issues.some((i) => i.pattern.includes("leverage"))).toBe(true);
    expect(result.issues.some((i) => i.pattern.includes("utilize"))).toBe(true);
  });

  it("catches 'Furthermore' and 'Moreover'", () => {
    const result = checkAnswerQuality(
      "I've hit 120% to quota. Furthermore, I've built strong relationships. Moreover, I've mentored two junior reps.",
      "behavioral_star",
      "mid"
    );
    expect(result.issues.some((i) => i.pattern.includes("Furthermore"))).toBe(true);
    expect(result.issues.some((i) => i.pattern.includes("Moreover"))).toBe(true);
  });

  it("catches chronological TMAY opener", () => {
    const result = checkAnswerQuality(
      "I graduated from State University in 2020 with a degree in Business Administration. After that I got my first job at a startup.",
      "tell_me_about_yourself",
      "entry"
    );
    expect(result.issues.some((i) => i.pattern.includes("education chronology"))).toBe(true);
  });

  it("catches Googleable questions", () => {
    const result = checkAnswerQuality(
      "So one thing I'd love to know — how many employees does your company have? And is the company remote or in-office?",
      "questions_to_ask",
      "mid"
    );
    expect(result.issues.some((i) => i.pattern.includes("Googleable"))).toBe(true);
  });

  it("catches 'I am flexible' in comp expectations", () => {
    const result = checkAnswerQuality(
      "Honestly, I'm flexible on compensation. I'll take whatever you think is fair for the role.",
      "comp_expectations",
      "entry"
    );
    expect(result.criticalCount).toBeGreaterThan(0);
  });

  it("passes clean spoken answer with no issues", () => {
    const result = checkAnswerQuality(
      "So right now I'm at Outreach running about 80 outbound calls a day, and honestly the thing I love most is the discovery piece — figuring out what someone actually needs before they can even articulate it. I've been doing this for about two years and I've hit 142% to quota four quarters running. The reason I'm looking at Gong specifically is the revenue intelligence angle — I've used Gong as a rep and I think selling it would be a completely different level of interesting.",
      "tell_me_about_yourself",
      "senior"
    );
    expect(result.criticalCount).toBe(0);
  });
});

describe("Prompt 5: Cheat sheet structure verification", () => {
  it("cheat sheet includes quick talk track with all 4 components", () => {
    const { user } = buildPrompt(salesforceSDR, "cheat_sheet");
    expect(user).toContain("30-SECOND TMAY");
    expect(user).toContain("GRANDMOTHER-TEST COMPANY DESCRIPTION");
    expect(user).toContain("ONE PREPARED METRIC");
    expect(user).toContain("CLOSING LINE");
  });

  it("cheat sheet includes seniority calibration", () => {
    const entryPrompt = buildPrompt(salesforceSDR, "cheat_sheet");
    expect(entryPrompt.user).toContain("entry-level");
    expect(entryPrompt.user.toLowerCase()).toContain("coaching tone");

    const seniorPrompt = buildPrompt(gongBDR, "cheat_sheet");
    expect(seniorPrompt.user).toContain("senior");
    expect(seniorPrompt.user).toContain("strategic");
  });

  it("cheat sheet includes THREE MISTAKES section with real HM quotes", () => {
    const { user } = buildPrompt(salesforceSDR, "cheat_sheet");
    expect(user).toContain("VPM candidate");
    expect(user).toContain("Elric Legloire");
    expect(user).toContain("HubSpot hiring manager");
  });

  it("cheat sheet includes closing line instruction", () => {
    const { user } = buildPrompt(salesforceSDR, "cheat_sheet");
    expect(user).toContain("Based on everything we've discussed");
    expect(user).toContain("hold you back from moving me forward");
  });

  it("cheat sheet maxTokens increased to 1000", () => {
    const result = buildPrompt(salesforceSDR, "cheat_sheet");
    expect(result.maxTokens).toBe(1000);
  });
});

describe("Cross-cutting: career switcher bridges in prompts", () => {
  it("HubSpot teacher TMAY prompt includes career switcher structure", () => {
    const { user } = buildPrompt(hubspotTeacher, "tell_me_about_yourself");
    // The recruiter variant should mention pivot/career switching in some form
    const lower = user.toLowerCase();
    expect(lower.includes("career switcher") || lower.includes("pivot") || lower.includes("non-traditional")).toBe(true);
  });

  it("HubSpot teacher why_sales prompt has career switcher context", () => {
    const { user } = buildPrompt(hubspotTeacher, "why_sales");
    // Should include the career switcher bridge patterns
    expect(user).toContain("Teachers");
  });
});
