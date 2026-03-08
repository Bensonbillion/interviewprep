import { describe, it, expect } from "vitest";
import { normalizeCompanyName, isSameCompany } from "@/lib/privacy/normalizer";

// ── normalizeCompanyName ────────────────────────────────────────────────

describe("normalizeCompanyName", () => {
  // ── Basic normalization ───────────────────────────────────────────────

  it("lowercases the name", () => {
    expect(normalizeCompanyName("SALESFORCE")).toBe("salesforce");
  });

  it("trims whitespace", () => {
    expect(normalizeCompanyName("  Salesforce  ")).toBe("salesforce");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeCompanyName("Palo   Alto   Networks")).toBe("palo alto networks");
  });

  // ── Suffix stripping ──────────────────────────────────────────────────

  it("strips Inc suffix", () => {
    expect(normalizeCompanyName("Salesforce Inc")).toBe("salesforce");
  });

  it("strips Inc. suffix with period", () => {
    expect(normalizeCompanyName("Salesforce Inc.")).toBe("salesforce");
  });

  it("strips , Inc. suffix with comma", () => {
    expect(normalizeCompanyName("Salesforce, Inc.")).toBe("salesforce");
  });

  it("strips Ltd suffix", () => {
    expect(normalizeCompanyName("Acme Ltd")).toBe("acme");
  });

  it("strips Corp suffix", () => {
    expect(normalizeCompanyName("Dell Corp")).toBe("dell");
  });

  it("strips LLC suffix", () => {
    expect(normalizeCompanyName("Acme LLC")).toBe("acme");
  });

  it("strips Corporation suffix", () => {
    expect(normalizeCompanyName("Microsoft Corporation")).toBe("microsoft");
  });

  it("strips GmbH suffix", () => {
    expect(normalizeCompanyName("SAP GmbH")).toBe("sap");
  });

  it("strips multiple suffixes (Inc Corp)", () => {
    // Two passes of SUFFIX_RE handle chained suffixes
    expect(normalizeCompanyName("Acme Technologies Inc")).toBe("acme");
  });

  it("strips Technologies suffix", () => {
    expect(normalizeCompanyName("Dell Technologies")).toBe("dell");
  });

  it("strips Platforms suffix", () => {
    expect(normalizeCompanyName("Meta Platforms")).toBe("meta");
  });

  it("strips Solutions suffix", () => {
    expect(normalizeCompanyName("Acme Solutions")).toBe("acme");
  });

  it("strips Software suffix", () => {
    expect(normalizeCompanyName("Acme Software")).toBe("acme");
  });

  it("strips Labs suffix", () => {
    expect(normalizeCompanyName("Notion Labs")).toBe("notion");
  });

  it("strips Holdings suffix", () => {
    expect(normalizeCompanyName("CrowdStrike Holdings")).toBe("crowdstrike");
  });

  // ── .com stripping ────────────────────────────────────────────────────

  it("strips trailing .com", () => {
    expect(normalizeCompanyName("gong.com")).toBe("gong");
  });

  it("strips .com from brand names", () => {
    expect(normalizeCompanyName("Outreach.io")).toBe("outreach");
  });

  // ── Quote removal ────────────────────────────────────────────────────

  it("removes surrounding double quotes", () => {
    expect(normalizeCompanyName('"Salesforce"')).toBe("salesforce");
  });

  it("removes surrounding single quotes", () => {
    expect(normalizeCompanyName("'HubSpot'")).toBe("hubspot");
  });

  // ── Alias map resolution ──────────────────────────────────────────────

  it("resolves SFDC to salesforce", () => {
    expect(normalizeCompanyName("SFDC")).toBe("salesforce");
  });

  it("resolves Salesforce.com to salesforce", () => {
    expect(normalizeCompanyName("Salesforce.com")).toBe("salesforce");
  });

  it("resolves Hub Spot to hubspot", () => {
    expect(normalizeCompanyName("Hub Spot")).toBe("hubspot");
  });

  it("resolves MSFT to microsoft", () => {
    expect(normalizeCompanyName("MSFT")).toBe("microsoft");
  });

  it("resolves Alphabet to google", () => {
    expect(normalizeCompanyName("Alphabet")).toBe("google");
  });

  it("resolves Facebook to meta", () => {
    expect(normalizeCompanyName("Facebook")).toBe("meta");
  });

  it("resolves FB to meta", () => {
    expect(normalizeCompanyName("FB")).toBe("meta");
  });

  it("resolves Amazon Web Services to aws", () => {
    expect(normalizeCompanyName("Amazon Web Services")).toBe("aws");
  });

  it("resolves Square to block", () => {
    expect(normalizeCompanyName("Square")).toBe("block");
  });

  it("resolves Crowd Strike to crowdstrike", () => {
    expect(normalizeCompanyName("Crowd Strike")).toBe("crowdstrike");
  });

  it("resolves PANW to palo alto networks", () => {
    expect(normalizeCompanyName("PANW")).toBe("palo alto networks");
  });

  it("resolves Freshdesk to freshworks", () => {
    expect(normalizeCompanyName("Freshdesk")).toBe("freshworks");
  });

  it("resolves International Business Machines to ibm", () => {
    expect(normalizeCompanyName("International Business Machines")).toBe("ibm");
  });

  it("resolves Monday to monday.com", () => {
    expect(normalizeCompanyName("Monday")).toBe("monday.com");
  });

  // ── No-match passthrough ──────────────────────────────────────────────

  it("passes through unknown names unchanged (lowercase + trimmed)", () => {
    expect(normalizeCompanyName("Unknown Startup")).toBe("unknown startup");
  });

  it("handles empty string", () => {
    expect(normalizeCompanyName("")).toBe("");
  });
});

// ── isSameCompany ───────────────────────────────────────────────────────

describe("isSameCompany", () => {
  it("matches identical names", () => {
    expect(isSameCompany("Salesforce", "Salesforce")).toBe(true);
  });

  it("matches different cases", () => {
    expect(isSameCompany("SALESFORCE", "salesforce")).toBe(true);
  });

  it("matches with vs without suffix", () => {
    expect(isSameCompany("Salesforce, Inc.", "Salesforce")).toBe(true);
  });

  it("matches alias to canonical name", () => {
    expect(isSameCompany("SFDC", "Salesforce")).toBe(true);
  });

  it("matches two different aliases for the same company", () => {
    expect(isSameCompany("FB", "Facebook")).toBe(true); // both → meta
  });

  it("matches .com variant to plain name", () => {
    expect(isSameCompany("Salesforce.com", "Salesforce")).toBe(true);
  });

  it("does not match different companies", () => {
    expect(isSameCompany("Salesforce", "HubSpot")).toBe(false);
  });

  it("does not match similar but different names", () => {
    expect(isSameCompany("Zoom", "ZoomInfo")).toBe(false);
  });
});
