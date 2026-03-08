import { describe, it, expect } from "vitest";
import { detectRoleSeniority, getSeniorityInstructions } from "@/lib/ai/seniority";

// ── detectRoleSeniority ─────────────────────────────────────────────────

describe("detectRoleSeniority", () => {
  // ── Senior detection ──────────────────────────────────────────────────

  it("detects 'Senior SDR' as senior", () => {
    expect(detectRoleSeniority("Senior SDR")).toBe("senior");
  });

  it("detects 'Sr. BDR' as senior", () => {
    expect(detectRoleSeniority("Sr. BDR")).toBe("senior");
  });

  it("detects 'Lead SDR' as senior", () => {
    expect(detectRoleSeniority("Lead SDR")).toBe("senior");
  });

  it("detects 'Principal BDR' as senior", () => {
    expect(detectRoleSeniority("Principal BDR")).toBe("senior");
  });

  it("detects senior via JD signals (3+ years, proven track record)", () => {
    expect(
      detectRoleSeniority(
        "SDR",
        "Requires 3+ years of outbound sales experience and a proven track record of exceeding quota."
      )
    ).toBe("senior");
  });

  it("detects senior via 'transition to ae' in JD", () => {
    expect(
      detectRoleSeniority("SDR", "This role offers a clear transition to AE within 12 months.")
    ).toBe("senior");
  });

  it("detects senior via 'path to ae' in JD", () => {
    expect(
      detectRoleSeniority("BDR", "Clear path to ae for top performers.")
    ).toBe("senior");
  });

  it("detects senior via 'quota-carrying' in title", () => {
    expect(detectRoleSeniority("Quota-Carrying SDR")).toBe("senior");
  });

  // ── Entry detection ───────────────────────────────────────────────────

  it("detects 'Entry Level SDR' as entry", () => {
    expect(detectRoleSeniority("Entry Level SDR")).toBe("entry");
  });

  it("detects 'Entry-Level BDR' as entry", () => {
    expect(detectRoleSeniority("Entry-Level BDR")).toBe("entry");
  });

  it("detects 'Junior SDR' as entry", () => {
    expect(detectRoleSeniority("Junior SDR")).toBe("entry");
  });

  it("detects 'Jr. BDR' as entry", () => {
    expect(detectRoleSeniority("Jr. BDR")).toBe("entry");
  });

  it("detects entry via JD signals (no experience required)", () => {
    expect(
      detectRoleSeniority("SDR", "No experience required. This is a great first sales role.")
    ).toBe("entry");
  });

  it("detects entry via 'eager to learn' in JD", () => {
    expect(
      detectRoleSeniority("BDR", "We want someone who is eager to learn and grow.")
    ).toBe("entry");
  });

  it("detects entry via '0-1 year' in JD", () => {
    expect(
      detectRoleSeniority("SDR", "Ideal for candidates with 0-1 year of experience.")
    ).toBe("entry");
  });

  // ── Mid detection (default) ───────────────────────────────────────────

  it("defaults to mid for generic 'SDR' title with no JD", () => {
    expect(detectRoleSeniority("SDR")).toBe("mid");
  });

  it("defaults to mid for 'Account Executive' with no JD", () => {
    expect(detectRoleSeniority("Account Executive")).toBe("mid");
  });

  it("defaults to mid for 'BDR' with no signals in JD", () => {
    expect(
      detectRoleSeniority("BDR", "Join our sales team and help us grow.")
    ).toBe("mid");
  });

  // ── Tie-breaking ──────────────────────────────────────────────────────

  it("returns mid when senior and entry signals are equal", () => {
    // 1 senior signal + 1 entry signal = tie → mid
    expect(
      detectRoleSeniority("Senior SDR", "This is a great first sales role.")
    ).toBe("mid");
  });

  it("senior wins when senior signals outnumber entry signals", () => {
    expect(
      detectRoleSeniority(
        "Senior SDR",
        "Requires 3+ years of experience and a proven track record."
      )
    ).toBe("senior");
  });

  // ── Case insensitivity ────────────────────────────────────────────────

  it("is case-insensitive for title", () => {
    expect(detectRoleSeniority("SENIOR SDR")).toBe("senior");
    expect(detectRoleSeniority("junior bdr")).toBe("entry");
  });

  it("is case-insensitive for JD", () => {
    expect(
      detectRoleSeniority("SDR", "PROVEN TRACK RECORD of exceeding quota. Experienced closer.")
    ).toBe("senior");
  });

  // ── Edge cases ────────────────────────────────────────────────────────

  it("handles empty title and JD", () => {
    expect(detectRoleSeniority("")).toBe("mid");
  });

  it("handles undefined JD", () => {
    expect(detectRoleSeniority("SDR", undefined)).toBe("mid");
  });
});

// ── getSeniorityInstructions ────────────────────────────────────────────

describe("getSeniorityInstructions", () => {
  it("returns entry-level instructions for 'entry'", () => {
    const result = getSeniorityInstructions("entry");
    expect(result).toContain("ENTRY LEVEL");
    expect(result).toContain("transferable skills");
    expect(result).toContain("coachable");
    expect(result).toContain("DO NOT pretend");
  });

  it("returns senior-level instructions for 'senior'", () => {
    const result = getSeniorityInstructions("senior");
    expect(result).toContain("SENIOR LEVEL");
    expect(result).toContain("LEAD WITH METRICS");
    expect(result).toContain("MEDDIC");
    expect(result).toContain("OWNERSHIP");
  });

  it("returns mid-level instructions for 'mid'", () => {
    const result = getSeniorityInstructions("mid");
    expect(result).toContain("MID LEVEL");
    expect(result).toContain("specific sales metrics");
    expect(result).toContain("growth mindset");
  });

  it("returns non-empty string for all seniority levels", () => {
    for (const level of ["entry", "mid", "senior"] as const) {
      const result = getSeniorityInstructions(level);
      expect(result.length).toBeGreaterThan(100);
    }
  });

  it("returns different instructions for each level", () => {
    const entry = getSeniorityInstructions("entry");
    const mid = getSeniorityInstructions("mid");
    const senior = getSeniorityInstructions("senior");
    expect(entry).not.toBe(mid);
    expect(mid).not.toBe(senior);
    expect(entry).not.toBe(senior);
  });
});
