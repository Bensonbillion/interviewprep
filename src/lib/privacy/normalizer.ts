/**
 * Company name normalization for consistent matching across reports.
 *
 * Handles:
 * - Suffix stripping (Inc, Ltd, Corp, etc.)
 * - Common brand variations (Salesforce.com → salesforce)
 * - Case normalization
 * - Whitespace normalization
 */

// ─── Known alias map (top SaaS companies) ─────────────────────────────────────
// Maps common variations to canonical normalized names.

const COMPANY_ALIASES: Record<string, string> = {
  // Salesforce
  "sfdc": "salesforce",
  "salesforce.com": "salesforce",
  "salesforce inc": "salesforce",

  // HubSpot
  "hub spot": "hubspot",
  "hubspot inc": "hubspot",

  // Microsoft
  "msft": "microsoft",
  "microsoft corporation": "microsoft",

  // Google
  "alphabet": "google",
  "alphabet inc": "google",

  // Amazon
  "amzn": "amazon",
  "amazon.com": "amazon",
  "amazon web services": "aws",

  // Meta / Facebook
  "facebook": "meta",
  "fb": "meta",
  "meta platforms": "meta",

  // Oracle
  "oracle corporation": "oracle",

  // SAP
  "sap se": "sap",

  // Adobe
  "adobe systems": "adobe",
  "adobe inc": "adobe",

  // ServiceNow
  "service now": "servicenow",

  // Workday
  "workday inc": "workday",

  // Snowflake
  "snowflake inc": "snowflake",
  "snowflake computing": "snowflake",

  // Datadog
  "datadog inc": "datadog",

  // CrowdStrike
  "crowdstrike holdings": "crowdstrike",
  "crowd strike": "crowdstrike",

  // Palo Alto Networks
  "palo alto": "palo alto networks",
  "panw": "palo alto networks",

  // ZoomInfo
  "zoom info": "zoominfo",
  "zoominfo technologies": "zoominfo",

  // Gong
  "gong.io": "gong",

  // Outreach
  "outreach.io": "outreach",

  // Salesloft
  "sales loft": "salesloft",
  "salesloft inc": "salesloft",

  // Clari
  "clari inc": "clari",

  // Slack
  "slack technologies": "slack",

  // Zoom
  "zoom video": "zoom",
  "zoom video communications": "zoom",

  // Atlassian
  "atlassian corporation": "atlassian",

  // Twilio
  "twilio inc": "twilio",

  // Stripe
  "stripe inc": "stripe",

  // MongoDB
  "mongo db": "mongodb",
  "mongodb inc": "mongodb",

  // Cloudflare
  "cloudflare inc": "cloudflare",

  // Okta
  "okta inc": "okta",

  // Databricks
  "databricks inc": "databricks",

  // UiPath
  "ui path": "uipath",
  "uipath inc": "uipath",

  // DocuSign
  "docu sign": "docusign",
  "docusign inc": "docusign",

  // Toast
  "toast inc": "toast",

  // Braze
  "braze inc": "braze",

  // Klaviyo
  "klaviyo inc": "klaviyo",

  // monday.com
  "monday": "monday.com",

  // Couchbase
  "couchbase inc": "couchbase",
  "membase": "couchbase",

  // ValorC3
  "valor c3": "valorc3",
  "valor c3 data centers": "valorc3",
  "valorc3 data centers": "valorc3",
  "tonaquint": "valorc3",

  // Notion
  "notion labs": "notion",

  // Figma
  "figma inc": "figma",

  // Vercel
  "vercel inc": "vercel",

  // Airtable
  "airtable inc": "airtable",

  // Intercom
  "intercom inc": "intercom",

  // Zendesk
  "zendesk inc": "zendesk",

  // Freshworks
  "freshworks inc": "freshworks",
  "freshdesk": "freshworks",

  // Amplitude
  "amplitude inc": "amplitude",

  // LaunchDarkly
  "launch darkly": "launchdarkly",

  // Drata
  "drata inc": "drata",

  // Vanta
  "vanta inc": "vanta",

  // Rippling
  "rippling inc": "rippling",

  // Deel
  "deel inc": "deel",

  // LinkedIn
  "linked in": "linkedin",
  "linkedin corporation": "linkedin",

  // IBM
  "international business machines": "ibm",

  // Dell
  "dell technologies": "dell",
  "dell inc": "dell",

  // Cisco
  "cisco systems": "cisco",

  // VMware
  "vmware inc": "vmware",

  // Intuit
  "intuit inc": "intuit",

  // Square / Block
  "square": "block",
  "square inc": "block",
  "block inc": "block",

  // Shopify
  "shopify inc": "shopify",

  // HubSpot
  "hubspot.com": "hubspot",
};

// ─── Suffix patterns to strip ─────────────────────────────────────────────────

const SUFFIX_RE = /\s*[,.]?\s*\b(inc|ltd|corp|co|llc|plc|gmbh|ag|sa|pty|limited|corporation|incorporated|company|group|holdings|technologies|platforms|solutions|software|systems|labs|io)\.?\s*$/i;

// Strip ".com" domain suffix when it's part of a brand name (not a full URL)
const DOTCOM_BRAND_RE = /\.com$/i;

/**
 * Normalize a company name for consistent matching.
 *
 * This is the canonical implementation — other files should import from here.
 *
 * @example
 * normalizeCompanyName("Salesforce, Inc.") // → "salesforce"
 * normalizeCompanyName("SFDC")             // → "salesforce"
 * normalizeCompanyName("HubSpot Inc")      // → "hubspot"
 */
export function normalizeCompanyName(name: string): string {
  let normalized = name
    .toLowerCase()
    .trim()
    // Remove surrounding quotes
    .replace(/^["']|["']$/g, "");

  // Strip suffix (may need multiple passes for "Inc. Corp." type cases)
  for (let i = 0; i < 2; i++) {
    normalized = normalized.replace(SUFFIX_RE, "").trim();
  }

  // Strip trailing .com for brand names
  normalized = normalized.replace(DOTCOM_BRAND_RE, "").trim();

  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, " ");

  // Check alias map
  const alias = COMPANY_ALIASES[normalized];
  if (alias) return alias;

  return normalized;
}

/**
 * Check if two company names refer to the same company.
 */
export function isSameCompany(a: string, b: string): boolean {
  return normalizeCompanyName(a) === normalizeCompanyName(b);
}
