import { describe, it, expect } from "vitest";
import {
  parseJobListing,
  buildJobListingContext,
  buildCompListingContext,
  type JobListingSignals,
} from "@/lib/ai/job-listing";

// ── parseJobListing ─────────────────────────────────────────────────────

describe("parseJobListing", () => {
  // ── Seniority extraction ──────────────────────────────────────────────

  it("detects senior seniority from JD", () => {
    const signals = parseJobListing(
      "We are looking for an experienced SDR with 3+ years of outbound sales experience and a proven track record."
    );
    expect(signals.seniority).toBe("senior");
  });

  it("detects entry seniority from JD", () => {
    const signals = parseJobListing(
      "Entry-level SDR position. No experience required. This is a great first sales role for someone eager to learn."
    );
    expect(signals.seniority).toBe("entry");
  });

  it("defaults to mid when no signals present", () => {
    const signals = parseJobListing("Join our sales team and help us grow our business.");
    expect(signals.seniority).toBe("mid");
  });

  // ── Years required ────────────────────────────────────────────────────

  it("extracts years required (keyword format)", () => {
    const signals = parseJobListing(
      "Must have 2 years of SDR experience in a fast-paced environment."
    );
    expect(signals.yearsRequired).toBeTruthy();
    expect(signals.yearsRequired!).toContain("2 years");
  });

  it("extracts years required (plus format)", () => {
    const signals = parseJobListing("3+ years SaaS experience needed.");
    expect(signals.yearsRequired).toContain("3+");
  });

  it("returns null when no years mentioned", () => {
    const signals = parseJobListing("Join our growing team.");
    expect(signals.yearsRequired).toBeNull();
  });

  // ── Comp range ────────────────────────────────────────────────────────

  it("extracts comp range ($X - $Y format)", () => {
    const signals = parseJobListing(
      "Base salary: $70,000 - $80,000 plus commission."
    );
    expect(signals.compRange).toContain("$70,000");
    expect(signals.compRange).toContain("$80,000");
  });

  it("returns null when no comp mentioned", () => {
    const signals = parseJobListing("Join our team.");
    expect(signals.compRange).toBeNull();
  });

  // ── Comp currency ─────────────────────────────────────────────────────

  it("extracts USD currency", () => {
    const signals = parseJobListing("Salary: USD $70,000 - $80,000");
    expect(signals.compCurrency).toBe("USD");
  });

  it("extracts CAD currency", () => {
    const signals = parseJobListing("Compensation: CAD $60,000 - $70,000");
    expect(signals.compCurrency).toBe("CAD");
  });

  it("returns null when no currency mentioned", () => {
    const signals = parseJobListing("Competitive salary offered.");
    expect(signals.compCurrency).toBeNull();
  });

  // ── Comp structure ────────────────────────────────────────────────────

  it("detects base + commission structure", () => {
    const signals = parseJobListing(
      "Compensation is base + commission with an OTE of $120,000."
    );
    expect(signals.compStructure).toBeTruthy();
  });

  it("returns null when no commission structure mentioned", () => {
    const signals = parseJobListing("Salary only position.");
    expect(signals.compStructure).toBeNull();
  });

  // ── Methodology ───────────────────────────────────────────────────────

  it("extracts MEDDIC methodology", () => {
    const signals = parseJobListing(
      "Experience with MEDDIC sales methodology preferred."
    );
    expect(signals.methodology).toContain("MEDDIC");
  });

  it("extracts SPIN methodology", () => {
    const signals = parseJobListing("We use SPIN Selling across the org.");
    expect(signals.methodology).toContain("SPIN");
  });

  it("extracts Sandler methodology", () => {
    const signals = parseJobListing("Sandler trained reps preferred.");
    expect(signals.methodology).toContain("Sandler");
  });

  it("extracts Challenger methodology", () => {
    const signals = parseJobListing("We follow the Challenger Sale approach.");
    expect(signals.methodology).toContain("Challenger");
  });

  it("returns null when no methodology mentioned", () => {
    const signals = parseJobListing("Standard sales process.");
    expect(signals.methodology).toBeNull();
  });

  // ── Location ──────────────────────────────────────────────────────────

  it("extracts hybrid location", () => {
    const signals = parseJobListing("This is a hybrid in San Francisco role.");
    expect(signals.location).toBeTruthy();
  });

  it("extracts remote location", () => {
    const signals = parseJobListing("Location: remote");
    expect(signals.location).toBeTruthy();
  });

  // ── Key skills ────────────────────────────────────────────────────────

  it("extracts key skills from requirements section", () => {
    const jd = `Requirements:
- Experience with Salesforce CRM
- Strong cold calling and prospecting skills
- Experience with outbound sequence tools like Outreach or Salesloft`;
    const signals = parseJobListing(jd);
    expect(signals.keySkills.length).toBeGreaterThan(0);
  });

  it("returns empty array when no skills section", () => {
    const signals = parseJobListing("Join our team.");
    expect(signals.keySkills).toEqual([]);
  });

  // ── Company values ────────────────────────────────────────────────────

  it("extracts company values", () => {
    const jd = `Our values:
- Transparency
- Customer First
- Innovation`;
    const signals = parseJobListing(jd);
    expect(signals.companyValues.length).toBeGreaterThan(0);
  });

  // ── Ideal candidate traits ────────────────────────────────────────────

  it("extracts inline traits (coachable, driven, resilient)", () => {
    const signals = parseJobListing(
      "We want someone who is coachable, driven, and resilient."
    );
    expect(signals.idealCandidateTraits).toEqual(
      expect.arrayContaining(["coachable", "driven", "resilient"])
    );
  });

  it("extracts traits from 'About You' section", () => {
    const jd = `About you:
- You are hungry and competitive
- You have strong communication skills
- You are self-motivated and accountable`;
    const signals = parseJobListing(jd);
    expect(signals.idealCandidateTraits.length).toBeGreaterThan(0);
  });

  it("deduplicates traits", () => {
    const signals = parseJobListing(
      "We need someone coachable and coachable and coachable."
    );
    const coachableCount = signals.idealCandidateTraits.filter(
      (t) => t === "coachable"
    ).length;
    expect(coachableCount).toBeLessThanOrEqual(1);
  });

  // ── Return structure ──────────────────────────────────────────────────

  it("returns all expected signal fields", () => {
    const signals = parseJobListing("Any job description text.");
    expect(signals).toHaveProperty("seniority");
    expect(signals).toHaveProperty("yearsRequired");
    expect(signals).toHaveProperty("compRange");
    expect(signals).toHaveProperty("compCurrency");
    expect(signals).toHaveProperty("compStructure");
    expect(signals).toHaveProperty("keySkills");
    expect(signals).toHaveProperty("companyValues");
    expect(signals).toHaveProperty("teamContext");
    expect(signals).toHaveProperty("careerPath");
    expect(signals).toHaveProperty("methodology");
    expect(signals).toHaveProperty("location");
    expect(signals).toHaveProperty("reportingTo");
    expect(signals).toHaveProperty("missionStatement");
    expect(signals).toHaveProperty("problemStatement");
    expect(signals).toHaveProperty("idealCandidateTraits");
  });

  it("keySkills and companyValues are always arrays", () => {
    const signals = parseJobListing("Minimal text.");
    expect(Array.isArray(signals.keySkills)).toBe(true);
    expect(Array.isArray(signals.companyValues)).toBe(true);
    expect(Array.isArray(signals.idealCandidateTraits)).toBe(true);
  });
});

// ── buildJobListingContext ───────────────────────────────────────────────

describe("buildJobListingContext", () => {
  it("returns empty string for undefined signals", () => {
    expect(buildJobListingContext(undefined)).toBe("");
  });

  it("returns empty string when all signals are empty/null", () => {
    const empty: JobListingSignals = {
      seniority: "mid",
      yearsRequired: null,
      compRange: null,
      compCurrency: null,
      compStructure: null,
      keySkills: [],
      companyValues: [],
      teamContext: null,
      careerPath: null,
      methodology: null,
      location: null,
      reportingTo: null,
      missionStatement: null,
      problemStatement: null,
      idealCandidateTraits: [],
    };
    expect(buildJobListingContext(empty)).toBe("");
  });

  it("includes career path when present", () => {
    const signals: JobListingSignals = {
      seniority: "mid",
      yearsRequired: null,
      compRange: null,
      compCurrency: null,
      compStructure: null,
      keySkills: [],
      companyValues: [],
      teamContext: null,
      careerPath: "Account Executive",
      methodology: null,
      location: null,
      reportingTo: null,
      missionStatement: null,
      problemStatement: null,
      idealCandidateTraits: [],
    };
    const result = buildJobListingContext(signals);
    expect(result).toContain("CAREER PATH");
    expect(result).toContain("Account Executive");
  });

  it("includes company values when present", () => {
    const signals: JobListingSignals = {
      seniority: "mid",
      yearsRequired: null,
      compRange: null,
      compCurrency: null,
      compStructure: null,
      keySkills: [],
      companyValues: ["Transparency", "Innovation"],
      teamContext: null,
      careerPath: null,
      methodology: null,
      location: null,
      reportingTo: null,
      missionStatement: null,
      problemStatement: null,
      idealCandidateTraits: [],
    };
    const result = buildJobListingContext(signals);
    expect(result).toContain("COMPANY VALUES");
    expect(result).toContain("Transparency");
    expect(result).toContain("Innovation");
  });

  it("includes methodology when present", () => {
    const signals: JobListingSignals = {
      seniority: "mid",
      yearsRequired: null,
      compRange: null,
      compCurrency: null,
      compStructure: null,
      keySkills: [],
      companyValues: [],
      teamContext: null,
      careerPath: null,
      methodology: "MEDDIC",
      location: null,
      reportingTo: null,
      missionStatement: null,
      problemStatement: null,
      idealCandidateTraits: [],
    };
    const result = buildJobListingContext(signals);
    expect(result).toContain("METHODOLOGY MENTIONED");
    expect(result).toContain("MEDDIC");
  });

  it("includes key skills when present", () => {
    const signals: JobListingSignals = {
      seniority: "mid",
      yearsRequired: null,
      compRange: null,
      compCurrency: null,
      compStructure: null,
      keySkills: ["Salesforce", "cold calling"],
      companyValues: [],
      teamContext: null,
      careerPath: null,
      methodology: null,
      location: null,
      reportingTo: null,
      missionStatement: null,
      problemStatement: null,
      idealCandidateTraits: [],
    };
    const result = buildJobListingContext(signals);
    expect(result).toContain("KEY SKILLS");
    expect(result).toContain("Salesforce");
  });

  it("includes ideal candidate traits when present", () => {
    const signals: JobListingSignals = {
      seniority: "mid",
      yearsRequired: null,
      compRange: null,
      compCurrency: null,
      compStructure: null,
      keySkills: [],
      companyValues: [],
      teamContext: null,
      careerPath: null,
      methodology: null,
      location: null,
      reportingTo: null,
      missionStatement: null,
      problemStatement: null,
      idealCandidateTraits: ["coachable", "driven"],
    };
    const result = buildJobListingContext(signals);
    expect(result).toContain("TRAITS");
    expect(result).toContain("coachable");
  });

  it("includes years required when present", () => {
    const signals: JobListingSignals = {
      seniority: "mid",
      yearsRequired: "3+ years of SaaS experience",
      compRange: null,
      compCurrency: null,
      compStructure: null,
      keySkills: [],
      companyValues: [],
      teamContext: null,
      careerPath: null,
      methodology: null,
      location: null,
      reportingTo: null,
      missionStatement: null,
      problemStatement: null,
      idealCandidateTraits: [],
    };
    const result = buildJobListingContext(signals);
    expect(result).toContain("EXPERIENCE REQUIRED");
    expect(result).toContain("3+ years");
  });
});

// ── buildCompListingContext ──────────────────────────────────────────────

describe("buildCompListingContext", () => {
  it("returns empty string for undefined signals", () => {
    expect(buildCompListingContext(undefined)).toBe("");
  });

  it("returns empty string when compRange is null", () => {
    const signals: JobListingSignals = {
      seniority: "mid",
      yearsRequired: null,
      compRange: null,
      compCurrency: null,
      compStructure: null,
      keySkills: [],
      companyValues: [],
      teamContext: null,
      careerPath: null,
      methodology: null,
      location: null,
      reportingTo: null,
      missionStatement: null,
      problemStatement: null,
      idealCandidateTraits: [],
    };
    expect(buildCompListingContext(signals)).toBe("");
  });

  it("includes comp range when present", () => {
    const signals: JobListingSignals = {
      seniority: "mid",
      yearsRequired: null,
      compRange: "$70,000 - $80,000",
      compCurrency: "USD",
      compStructure: "base + commission",
      keySkills: [],
      companyValues: [],
      teamContext: null,
      careerPath: null,
      methodology: null,
      location: null,
      reportingTo: null,
      missionStatement: null,
      problemStatement: null,
      idealCandidateTraits: [],
    };
    const result = buildCompListingContext(signals);
    expect(result).toContain("$70,000 - $80,000");
    expect(result).toContain("JOB LISTING COMP CONTEXT");
  });

  it("includes currency and structure in the context", () => {
    const signals: JobListingSignals = {
      seniority: "mid",
      yearsRequired: null,
      compRange: "$70,000 - $80,000",
      compCurrency: "CAD",
      compStructure: "base + commission",
      keySkills: [],
      companyValues: [],
      teamContext: null,
      careerPath: null,
      methodology: null,
      location: null,
      reportingTo: null,
      missionStatement: null,
      problemStatement: null,
      idealCandidateTraits: [],
    };
    const result = buildCompListingContext(signals);
    expect(result).toContain("CAD");
    expect(result).toContain("base + commission");
  });
});
