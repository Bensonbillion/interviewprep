/**
 * Test data factories — generate consistent test fixtures.
 */

let counter = 0;
function nextId() {
  counter++;
  return `00000000-0000-0000-0000-${String(counter).padStart(12, "0")}`;
}

export function resetFactoryCounter() {
  counter = 0;
}

export function buildUser(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    id,
    email: `user-${id.slice(-4)}@test.com`,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    company: "Acme Corp",
    targetRole: "Account Executive",
    roleType: "ae",
    stage: "phone_screen",
    jobDescription: "We are looking for a strong AE to join our team.",
    createdAt: Date.now(),
    ...overrides,
  };
}

export function buildResume(overrides: Record<string, unknown> = {}) {
  return {
    backgroundType: "direct_sales" as const,
    roles: [
      {
        title: "Account Executive",
        company: "Previous Corp",
        bullets: [
          {
            originalText: "Exceeded quota by 120% for 3 consecutive quarters",
            salesRelevanceScore: 9,
          },
        ],
      },
    ],
    skills: [
      { name: "Salesforce", salesRelevance: 8 },
      { name: "Cold calling", salesRelevance: 9 },
    ],
    ...overrides,
  };
}

export function buildCompanyProfile(overrides: Record<string, unknown> = {}) {
  return {
    name: "Acme Corp",
    productDescription: "B2B SaaS platform for sales teams",
    icp: {
      companySizes: ["Mid-market", "Enterprise"],
      industries: ["Technology", "Finance"],
      buyerPersonas: ["VP of Sales", "CRO"],
    },
    salesMotion: "outbound",
    competitors: ["Competitor A", "Competitor B"],
    techStack: ["Salesforce", "Outreach"],
    stage: "scale_up",
    recentNews: ["Series B funding"],
    cultureSignals: ["Fast-paced", "Remote-first"],
    ...overrides,
  };
}

export function buildReport(overrides: Record<string, unknown> = {}) {
  return {
    companyName: "Acme Corp",
    roleTitle: "Account Executive",
    stage: "phone_screen",
    interviewFormat: "video",
    durationMinutes: 30,
    difficultyRating: 3,
    experienceRating: 4,
    overallNotes: "Good interview, asked about quota history.",
    ...overrides,
  };
}
