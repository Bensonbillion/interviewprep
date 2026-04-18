import { Factory } from "fishery";
import { faker } from "@faker-js/faker";

faker.seed(42); // deterministic

// User factory
export const userFactory = Factory.define(() => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  full_name: faker.person.fullName(),
  credits_remaining: 5,
  total_credits_purchased: 0,
  is_admin: false,
  created_at: faker.date.past().toISOString(),
}));

// Resume factory — SDR background
export const resumeFactory = Factory.define(() => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  parsed_data: {
    full_name: faker.person.fullName(),
    email: faker.internet.email(),
    current_role: "SDR",
    current_company: faker.company.name(),
    years_experience: faker.number.int({ min: 1, max: 5 }),
    summary: "SDR with 2 years of experience in SaaS sales",
    skills: ["Salesforce", "Outreach", "LinkedIn Sales Nav", "Cold calling"],
    experience: [
      {
        title: "SDR",
        company: "Samsara",
        start_date: "2022-01",
        end_date: "present",
        bullets: [
          "Sourced 127% of quota in Q3 2023",
          "Ran 40+ cold calls per day",
          "Booked 18 qualified meetings in one month",
        ],
      },
    ],
    education: [{ school: "University of Toronto", degree: "B.Comm", year: 2021 }],
    metrics: {
      quota_attainment: "127%",
      daily_call_volume: "40+",
      monthly_meetings: 18,
    },
  },
  background_type: "experienced_sales",
  created_at: faker.date.past().toISOString(),
}));

// Career switcher resume factory
export const careerSwitcherResumeFactory = Factory.define(() => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  parsed_data: {
    full_name: faker.person.fullName(),
    email: faker.internet.email(),
    current_role: "Retail Manager",
    current_company: "Best Buy",
    years_experience: 3,
    summary: "Retail manager transitioning to tech sales",
    skills: ["Customer service", "Team management", "Salesforce (learning)", "Excel"],
    experience: [
      {
        title: "Department Manager",
        company: "Best Buy",
        start_date: "2021-03",
        end_date: "present",
        bullets: [
          "Managed team of 12 sales associates",
          "Exceeded sales targets by 23% in 2023",
          "Handled customer escalations and objections daily",
        ],
      },
    ],
    education: [{ school: "Seneca College", degree: "Business Admin Diploma", year: 2020 }],
    metrics: {
      team_size: 12,
      sales_target_attainment: "123%",
    },
  },
  background_type: "career_switcher",
  created_at: faker.date.past().toISOString(),
}));

// Company profile factory
export const companyFactory = Factory.define<Record<string, unknown>>(({ params }) => ({
  id: faker.string.uuid(),
  company_name: params.company_name ?? "Gong",
  company_url: params.company_url ?? "https://gong.io",
  profile_data: {
    name: params.company_name ?? "Gong",
    description: "Revenue intelligence platform for B2B sales",
    icp: "Mid-market to enterprise B2B companies with sales teams of 10+",
    sales_methodology: "MEDDIC / Challenger",
    products: ["Revenue Intelligence", "Gong Engage", "Gong Forecast"],
    competitors: ["Chorus", "Salesloft", "Outreach"],
    recent_news: ["Series E funding of $250M", "Launched Gong Engage in 2023"],
    key_decision_makers: ["VP of Sales", "CRO", "Sales Operations Manager"],
    interview_process_notes: "Known for rigorous cold call roleplay in SDR interviews",
    values: ["Customer obsession", "Transparency", "Excellence"],
  },
  source: "scraped",
  created_at: faker.date.past().toISOString(),
}));

// Prep session factory
export const prepSessionFactory = Factory.define<Record<string, unknown>>(({ params }) => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  resume_id: faker.string.uuid(),
  company_id: faker.string.uuid(),
  target_role: params.target_role ?? "SDR",
  role_type: params.role_type ?? "sdr_bdr",
  stage: params.stage ?? "recruiter",
  stage_type: params.stage_type ?? "conversational",
  stage_name: params.stage_name ?? "Recruiter Screen",
  stage_order: 1,
  parent_session_id: null,
  take_home_content: null,
  intel_collected: false,
  created_at: faker.date.past().toISOString(),
}));

// Generated answer factory
export const generatedAnswerFactory = Factory.define<Record<string, unknown>>(({ params }) => ({
  id: faker.string.uuid(),
  session_id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  answer_type: params.answer_type ?? "tell_me_about_yourself",
  content: params.content ?? "Sample answer content for testing",
  metadata: {},
  rating: null,
  status: "complete",
  created_at: faker.date.past().toISOString(),
}));

// Take-home content factory (Klir-style)
export const takeHomeContentFactory = Factory.define(() => ({
  icp: {
    org_types: [
      "Municipal water utilities with 10,000+ service connections",
      "Regional water authorities managing multiple treatment facilities",
      "County water and sewer districts with NPDES permit obligations",
    ],
    pain_points: [
      "Compliance data scattered across spreadsheets and legacy systems",
      "Staff spending 60%+ of time on manual DMR reporting",
      "Institutional knowledge lost when experienced staff retire",
      "Four major regulatory deadlines landing simultaneously in 2026-2027",
    ],
    decision_makers: [
      "Compliance Manager / Director of Water Quality",
      "VP of Operations",
      "Environmental Health and Safety Manager",
    ],
    anti_icp: [
      "Private utilities without EPA reporting obligations",
      "Utilities under 5,000 service connections with minimal compliance burden",
    ],
  },
  prospects: [
    {
      company_name: "Louisville Water Company",
      why_they_fit: "Monitoring 25 PFAS compounds under UCMR 5 with results approaching federal limits",
      trigger_signal: "GenX spike at Crescent Hill plant documented in federal court filings",
      target_contact: { name: "Chris Bobay", title: "Manager of Water Quality and Compliance" },
      research_note: "Contact verified via Louisville Water employee spotlight and press releases",
    },
    {
      company_name: "Gwinnett County DWR",
      why_they_fit: "Managing 4+ NPDES permits simultaneously with county population hitting 1M",
      trigger_signal: "$125M infrastructure project added new permit conditions in Oct 2024",
      target_contact: { name: "Kevin Middlebrooks", title: "Deputy Director of Technical Services" },
      research_note: "Contact verified via gwinnettcounty.com org chart",
    },
    {
      company_name: "NEORSD",
      why_they_fit: "Under federal consent decree requiring multi-regulator reporting to EPA, DOJ, Ohio EPA, and Ohio AG",
      trigger_signal: "Consent decree amended for 5th time in July 2024",
      target_contact: { name: "John Rhoades", title: "NPDES Compliance and Pretreatment Manager" },
      research_note: "Contact found in NEORSD published meeting minutes",
    },
  ],
  cold_email: {
    subject: "Louisville Water's PFAS",
    body: `Saw that you handle water quality and compliance at Louisville Water, and have also seen that you're now monitoring 25 PFAS compounds under UCMR 5 across both plants, with some results getting close to the new federal limits after the GenX spike at Crescent Hill in December.

Klir actually helps with this by pulling all sampling data, permit conditions, and compliance status into one system, so your team always has a clear picture without rebuilding it at reporting time.

Southern Nevada Water Authority manages 300,000+ water quality samples on Klir every year.

Would you have 20 minutes next week? I'd love to learn more about how your team is managing it all.`,
    personalization_rationale: "Opening references verifiable UCMR 5 monitoring data and court-documented GenX spike, not a generic pain statement",
  },
  discovery_questions: [
    { question: "Walk me through how your team manages compliance today — what systems are you using?", category: "current_state", what_it_uncovers: "Current tech stack and manual workarounds" },
    { question: "What made you take this call today?", category: "urgency", what_it_uncovers: "Triggering event and level of urgency" },
    { question: "When a DMR submission deadline gets missed, who is accountable for that?", category: "personal_pain", what_it_uncovers: "Personal stake and decision-maker identification" },
    { question: "What does it cost in time and headcount to pull together a full compliance picture from scratch?", category: "business_pain", what_it_uncovers: "Quantified cost of status quo" },
    { question: "With PFAS, LCRI, and eReporting all hitting in the next 18 months, which is creating the most immediate pressure?", category: "regulatory_urgency", what_it_uncovers: "Prioritized pain and external deadline" },
    { question: "Is your procurement typically done through cooperative purchasing — Sourcewell or NASPO ValuePoint?", category: "buying_process", what_it_uncovers: "Procurement path and potential to accelerate cycle" },
  ],
}));
