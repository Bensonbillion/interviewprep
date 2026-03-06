/**
 * Top SaaS companies for programmatic SEO pages.
 *
 * Used by sitemap, company x role pages, and OG image generation.
 * Ordered roughly by search volume for "[company] SDR interview questions".
 */

export interface CompanyEntry {
  slug: string;
  name: string;
  /** Short tagline for meta descriptions */
  tagline: string;
}

export const TOP_COMPANIES: CompanyEntry[] = [
  { slug: "salesforce", name: "Salesforce", tagline: "the world's #1 CRM" },
  { slug: "hubspot", name: "HubSpot", tagline: "inbound marketing and CRM platform" },
  { slug: "oracle", name: "Oracle", tagline: "enterprise cloud and database leader" },
  { slug: "aws", name: "AWS", tagline: "Amazon's cloud computing division" },
  { slug: "google-cloud", name: "Google Cloud", tagline: "Google's cloud platform" },
  { slug: "microsoft", name: "Microsoft", tagline: "enterprise software and cloud leader" },
  { slug: "datadog", name: "Datadog", tagline: "cloud monitoring and analytics" },
  { slug: "crowdstrike", name: "CrowdStrike", tagline: "cybersecurity platform" },
  { slug: "snowflake", name: "Snowflake", tagline: "cloud data platform" },
  { slug: "gong", name: "Gong", tagline: "revenue intelligence platform" },
  { slug: "outreach", name: "Outreach", tagline: "sales engagement platform" },
  { slug: "zoominfo", name: "ZoomInfo", tagline: "B2B data and intelligence" },
  { slug: "palo-alto-networks", name: "Palo Alto Networks", tagline: "cybersecurity leader" },
  { slug: "servicenow", name: "ServiceNow", tagline: "digital workflow platform" },
  { slug: "mongodb", name: "MongoDB", tagline: "developer data platform" },
  { slug: "twilio", name: "Twilio", tagline: "communications API platform" },
  { slug: "okta", name: "Okta", tagline: "identity and access management" },
  { slug: "cloudflare", name: "Cloudflare", tagline: "web performance and security" },
  { slug: "databricks", name: "Databricks", tagline: "data and AI platform" },
  { slug: "stripe", name: "Stripe", tagline: "payments infrastructure" },
  { slug: "adobe", name: "Adobe", tagline: "creative and experience cloud" },
  { slug: "sap", name: "SAP", tagline: "enterprise resource planning" },
  { slug: "workday", name: "Workday", tagline: "HR and finance cloud" },
  { slug: "salesloft", name: "Salesloft", tagline: "sales engagement platform" },
  { slug: "ramp", name: "Ramp", tagline: "corporate finance automation" },
  { slug: "braze", name: "Braze", tagline: "customer engagement platform" },
  { slug: "amplitude", name: "Amplitude", tagline: "product analytics" },
  { slug: "klaviyo", name: "Klaviyo", tagline: "marketing automation for ecommerce" },
  { slug: "toast", name: "Toast", tagline: "restaurant technology platform" },
  { slug: "monday-com", name: "monday.com", tagline: "work management platform" },
  { slug: "notion", name: "Notion", tagline: "all-in-one workspace" },
  { slug: "figma", name: "Figma", tagline: "collaborative design platform" },
  { slug: "intercom", name: "Intercom", tagline: "customer messaging platform" },
  { slug: "zendesk", name: "Zendesk", tagline: "customer service platform" },
  { slug: "freshworks", name: "Freshworks", tagline: "business software suite" },
  { slug: "docusign", name: "DocuSign", tagline: "agreement cloud platform" },
  { slug: "uipath", name: "UiPath", tagline: "enterprise automation" },
  { slug: "rippling", name: "Rippling", tagline: "HR and IT platform" },
  { slug: "deel", name: "Deel", tagline: "global payroll and compliance" },
  { slug: "vanta", name: "Vanta", tagline: "security and compliance automation" },
  { slug: "drata", name: "Drata", tagline: "compliance automation" },
  { slug: "launchdarkly", name: "LaunchDarkly", tagline: "feature management platform" },
  { slug: "airtable", name: "Airtable", tagline: "connected apps platform" },
  { slug: "clari", name: "Clari", tagline: "revenue platform" },
  { slug: "linkedin", name: "LinkedIn", tagline: "professional networking platform" },
  { slug: "cisco", name: "Cisco", tagline: "networking and security" },
  { slug: "dell", name: "Dell", tagline: "technology solutions" },
  { slug: "ibm", name: "IBM", tagline: "enterprise AI and cloud" },
  { slug: "shopify", name: "Shopify", tagline: "commerce platform" },
  { slug: "zoom", name: "Zoom", tagline: "video communications" },
];

export const ROLES = [
  { slug: "sdr", name: "SDR", fullName: "Sales Development Representative" },
  { slug: "bdr", name: "BDR", fullName: "Business Development Representative" },
  { slug: "account-executive", name: "AE", fullName: "Account Executive" },
  { slug: "account-manager", name: "AM", fullName: "Account Manager" },
  { slug: "customer-success-manager", name: "CSM", fullName: "Customer Success Manager" },
] as const;

export function getCompanyBySlug(slug: string): CompanyEntry | undefined {
  return TOP_COMPANIES.find((c) => c.slug === slug);
}

export function getRoleBySlug(slug: string) {
  return ROLES.find((r) => r.slug === slug);
}
