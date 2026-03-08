import type { RoleType } from "@/types";

export interface SampleAnswer {
  contextName: string;
  contextRole: string;
  contextCompany: string;
  tellMeAboutYourself: string;
  secondQuestion: string;
  secondAnswer: string;
}

export const SAMPLE_ANSWERS: Record<RoleType, SampleAnswer> = {
  sdr_bdr: {
    contextName: "Marcus Chen",
    contextRole: "SDR",
    contextCompany: "Gong",
    tellMeAboutYourself:
      "I spent 2 years in hospitality managing a team of 12 at the Marriott, where I learned that great service is really about reading what people need before they say it. That instinct led me to tech sales — I joined Outreach as a BDR 14 months ago and hit 138% of my activity targets by building a multi-channel outbound sequence focused on mid-market fintech accounts.\n\nWhat excites me about Gong is that your Revenue Intelligence platform is exactly the tool I used to self-coach on my cold calls. I'd love to help other sales teams see that same impact at scale.",
    secondQuestion: "Why this company?",
    secondAnswer:
      "I've been tracking Gong's expansion into the forecasting space since last quarter's product launch. Your focus on helping revenue teams make data-driven decisions aligns with how I already sell — I use call analytics to refine my approach every week, so joining the team that builds that technology feels like a natural fit.",
  },

  account_executive: {
    contextName: "Sarah Torres",
    contextRole: "AE",
    contextCompany: "Salesforce",
    tellMeAboutYourself:
      "I've spent the last 3 years closing mid-market SaaS deals, most recently as an AE at HubSpot where I carried a $1.4M annual quota and finished at 127% last year. My strength is running multi-threaded deal cycles — my average deal had 4.2 stakeholders involved, and I built a discovery framework that cut my sales cycle from 68 to 41 days.\n\nSalesforce's push into the AI-powered CRM space is what drew me in. After seeing Einstein GPT launch, I mapped your ICP to the same mid-market segment I've been selling to — and I'm confident I can ramp fast because I already know the buyer persona.",
    secondQuestion: "Why this company?",
    secondAnswer:
      "I've been following Salesforce's expansion into AI-powered CRM for the past year. After seeing the Einstein GPT launch, I mapped their ICP — it's exactly the mid-market segment I was selling to at my last company. The platform consolidation play makes the value prop straightforward to sell.",
  },

  account_manager_csm: {
    contextName: "Jordan Rivera",
    contextRole: "CSM",
    contextCompany: "Datadog",
    tellMeAboutYourself:
      "I've managed a $6.2M book of business across 45 enterprise accounts for the past 2 years at PagerDuty, maintaining a 94% gross retention rate and growing NRR to 118% through strategic expansion plays. My approach is treating every renewal as a re-sale — I run quarterly business reviews that tie product usage directly to the customer's KPIs, which makes the ROI conversation concrete rather than abstract.\n\nDatadog's observability platform is where the market is heading, and I've seen firsthand how my accounts struggle with tool sprawl. Helping customers consolidate onto a unified platform is the kind of strategic CSM work I want to do next.",
    secondQuestion: "Why this company?",
    secondAnswer:
      "My PagerDuty accounts constantly asked about broader observability. Datadog solves that exact problem — and your land-and-expand model means I'd get to do what I do best: grow relationships by solving real problems, not just managing renewals.",
  },

  other_sales: {
    contextName: "Alex Kim",
    contextRole: "Sales Engineer",
    contextCompany: "Snowflake",
    tellMeAboutYourself:
      "I've spent 4 years bridging the gap between technical and business stakeholders in pre-sales — most recently as an SE at Databricks supporting a team of 6 AEs across enterprise accounts. I ran 200+ technical demos last year with a 72% demo-to-opportunity conversion rate, and I built a reusable demo environment that cut our proof-of-concept timeline from 3 weeks to 5 days.\n\nWhat draws me to Snowflake is the data cloud vision — I've seen how customers struggle with data silos across cloud providers, and Snowflake's approach to cross-cloud data sharing solves a pain point I encountered in almost every deal at Databricks.",
    secondQuestion: "Why this company?",
    secondAnswer:
      "Every enterprise deal I supported at Databricks hit the same wall: data locked in one cloud provider. Snowflake's cross-cloud architecture solves that directly. I want to be on the side of the table that offers the solution, not the one working around the limitation.",
  },
};
