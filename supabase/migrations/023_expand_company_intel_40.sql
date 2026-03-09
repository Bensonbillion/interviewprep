-- Expand company_interview_intel with compensation, culture, and process data.
-- Replaces migration 021 data with richer 30-company dataset + updates original 10.
-- Final count: 40 companies with full intelligence.

-- ── Step 1: Add new columns ──────────────────────────────────────────────────

ALTER TABLE company_interview_intel
  ADD COLUMN IF NOT EXISTS ote_range TEXT,
  ADD COLUMN IF NOT EXISTS base_range TEXT,
  ADD COLUMN IF NOT EXISTS quota_attainment DECIMAL(4,1),
  ADD COLUMN IF NOT EXISTS repvue_score DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS interview_difficulty DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS positive_experience_pct INT,
  ADD COLUMN IF NOT EXISTS promotion_path TEXT,
  ADD COLUMN IF NOT EXISTS culture_warnings TEXT[],
  ADD COLUMN IF NOT EXISTS company_category TEXT;

-- ── Step 2: Remove migration 021 data (replaced below with richer data) ─────

DELETE FROM company_interview_intel
WHERE company_name_normalized IN (
  'stripe', 'mongodb', 'cloudflare', 'palo alto networks', 'servicenow',
  'twilio', 'okta', 'splunk', 'confluent', 'hashicorp',
  'elastic', 'atlassian', 'monday', 'figma', 'amplitude',
  'braze', 'toast', 'klaviyo', 'deel', 'rippling',
  'oracle', 'sap', 'microsoft', 'google cloud', 'aws',
  'ibm', 'cisco', 'dell', 'vmware', 'adobe',
  'notion', 'vercel', 'postman', 'gitlab', 'grafana labs',
  'launchdarkly', 'snyk', 'miro', 'airtable'
);

-- ── Step 3: Insert 30 companies with full data ──────────────────────────────

INSERT INTO company_interview_intel (
  company_name, company_name_normalized, interview_rounds, avg_days_to_hire,
  key_test, unique_element, mock_call_format,
  common_questions, red_flags, tips, sdr_satisfaction_score,
  ote_range, base_range, quota_attainment, repvue_score,
  interview_difficulty, positive_experience_pct, promotion_path,
  culture_warnings, company_category
) VALUES

-- ── 1. Stripe ────────────────────────────────────────────────────────────────

('Stripe', 'stripe', 4, 17,
 'Mock cold call + 2-part written take-home project (3 business days to complete)',
 'Offers feedback calls even after rejection — rare in industry. Written project tests strategic thinking and written communication, not just phone presence.',
 'Standard mock cold call + written take-home',
 ARRAY['Why sales? Why Stripe?', 'Prioritization exercise', 'How would you approach a payments company prospect?', 'Walk me through your prospecting process'],
 ARRAY['Cannot articulate why fintech/payments specifically', 'Weak written communication in take-home', 'Not allocating enough time for written project'],
 ARRAY['The written take-home carries heavy weight — spend real time on it', 'Research Stripe Atlas, Stripe Connect, and Stripe Terminal products', 'Stripe culture values intellectual curiosity — show depth of thinking', '74% of SDRs hit quota — reference this in your questions'],
 4.0, '$75K-$95K', '$55K-$65K', 74.0, NULL, 3.4, 68,
 'SDR → Mid-Market AE (12-18 months typical)',
 ARRAY[]::TEXT[], 'infrastructure'),

-- ── 2. MongoDB ───────────────────────────────────────────────────────────────

('MongoDB', 'mongodb', 5, 18,
 '90-minute SDR Challenge — account strategy PowerPoint + live role play + operational strategy questions, all in one session',
 'Most comprehensive single assessment. Company offers a 30-minute prep call with hiring manager beforehand — take it.',
 'Role play within the 90-minute SDR Challenge',
 ARRAY['Present your account strategy for these target accounts', 'Territory management scenario', 'Why NoSQL over traditional databases?', 'Walk me through how you would prospect into a mid-market account'],
 ARRAY['Weak presentation skills', 'No understanding of MongoDB vs SQL databases', 'Cannot articulate document database value prop in simple terms'],
 ARRAY['Request and USE the 30-minute prep call with HM', 'Prepare a polished PowerPoint for the account strategy portion', 'Understand document databases at a basic level — watch MongoDB University free courses', 'New York bootcamp onboarding is considered best-in-class'],
 4.2, '$66K-$73K', '$47K-$52K', 58.0, 84.52, 3.2, 75,
 'SDR → BDR → Commercial AE (12-18 months)',
 ARRAY['Lowest base salary in infrastructure tier'], 'infrastructure'),

-- ── 3. Cloudflare ────────────────────────────────────────────────────────────

('Cloudflare', 'cloudflare', 5, 33,
 '20-minute role play + executive final interview — may include CEO Matthew Prince',
 'Up to 10 individual interviewers. Ends with executive conversation. Longest process in infrastructure tier at 33 days.',
 '20-minute structured role play',
 ARRAY['How would you describe Cloudflare to your grandmother?', 'What is a DDoS attack?', 'Why internet security?', 'Describe a time you had to learn something technical quickly'],
 ARRAY['Asking salary questions to non-recruiters', 'Cannot simplify technical concepts', 'Low energy in executive round'],
 ARRAY['Company philosophy: you can never overprepare but you can definitely underprepare', 'Practice the grandmother test for every product', 'BDR career progression is limited — rated 2.8/5', 'Understand basic concepts: CDN, WAF, DDoS, Zero Trust'],
 3.5, '$75K-$90K', '$53K-$60K', 63.0, NULL, 3.0, 60,
 'BDR → SDR → AE (limited — career path rated 2.8/5)',
 ARRAY['Culture and leadership rated only 2.7/5', 'Career progression for BDRs is a known weakness'], 'infrastructure'),

-- ── 4. Palo Alto Networks ────────────────────────────────────────────────────

('Palo Alto Networks', 'palo alto networks', 3, 25,
 'Role play with a panel of sales managers',
 'Simplest process in infrastructure tier — just 3 rounds. Interview difficulty only 2.8/5, easiest among these companies.',
 'Panel role play with multiple sales managers evaluating',
 ARRAY['What was one hardship you faced and how did you navigate that?', 'Why cybersecurity?', 'Mock cold call to a CISO', 'Describe a time you hit a challenging goal'],
 ARRAY['Insufficient cold calling experience — specifically cited as rejection reason', 'Not knowing competitive landscape', 'Cannot explain what a firewall does'],
 ARRAY['Know the competitive landscape cold — CrowdStrike, Fortinet, Zscaler', 'Commissions are capped — ask about this', 'Product-Market Fit rated 4.4/5 — reference specific products', 'Understand SASE, XDR, and Zero Trust at a basic level'],
 3.8, '$80K-$95K', '$55K-$65K', NULL, 85.81, 2.8, 65,
 'BDR → Inside Sales Rep → AE',
 ARRAY['Commissions are capped — multiple reviews call this unmotivating'], 'security'),

-- ── 5. ServiceNow ────────────────────────────────────────────────────────────

('ServiceNow', 'servicenow', 4, 22,
 'Behavioral interviews only — no standardized mock call or take-home for SDRs',
 'Highest RepVue score (87.92) in infrastructure tier. Most base-heavy pay at 72/28 split. No formal assessment test.',
 NULL,
 ARRAY['What does success look like to you?', 'Tell me about a time you exceeded expectations', 'Why ServiceNow?', 'Describe your daily prospecting routine'],
 ARRAY['Sounding too rehearsed — a candidate was specifically rejected for this', 'Not understanding ITSM or workflow automation', 'Being passive in the conversation'],
 ARRAY['Highest RepVue score in this tier — culture is genuinely strong', 'SDRs support 5-6 field reps and make ~35 calls and 45 emails daily', 'Understand ITSM, workflow automation, and digital transformation basics', 'Lead Development Rep → SDR → AE promotion path with 12-18 month timelines'],
 4.3, '$76K-$90K', '$55K-$70K', NULL, 87.92, 3.0, 65,
 'LDR → SDR → AE (12-18 months)',
 ARRAY[]::TEXT[], 'enterprise_saas'),

-- ── 6. Twilio ────────────────────────────────────────────────────────────────

('Twilio', 'twilio', 4, 25,
 'Twilio Magic values assessment + Bar Raiser interview by cross-team senior leader',
 'Bar Raiser system (borrowed from Amazon) — independent evaluator from outside hiring team. Every question maps to Twilio Magic principles. Offers arrive within 48 hours; 6-month cooling period if rejected.',
 'Values-based behavioral — may include scenario',
 ARRAY['Describe a time you dealt with a difficult stakeholder', 'How do you embody Draw the Owl?', 'Give an example of No Shenanigans', 'Tell me about a time you empowered someone else'],
 ARRAY['Not demonstrating alignment with Twilio Magic values', 'Generic answers not mapped to their principles', 'Not knowing the four Twilio Magic values'],
 ARRAY['Memorize and prepare STAR stories for each Twilio Magic value: Draw the Owl, Empower Others, Be Inclusive, No Shenanigans', 'The Bar Raiser has significant influence — treat that round seriously', '6-month cooling period means you only get one shot per half-year', 'Offers come fast — be ready to decide within 48 hours'],
 3.8, '$101K', '$62K-$65K', 62.2, 83.41, 3.2, 60,
 'SDR → AE (typical SaaS path)',
 ARRAY[]::TEXT[], 'developer_tools'),

-- ── 7. Okta ──────────────────────────────────────────────────────────────────

('Okta', 'okta', 3, 19,
 'Mock cold call — the make-or-break final round',
 'Fastest and leanest process at just 3 rounds and 19 days. Recently shifted to 5 days in-office.',
 'Cold call pitching Okta identity security to a CISO persona',
 ARRAY['Walk me through how you would cold call a CISO about identity security', 'Why Okta?', 'Tell me about yourself', 'How do you handle rejection on the phones?'],
 ARRAY['Low energy', 'Not understanding identity security basics', 'Being thrown off by the mock call pressure'],
 ARRAY['Only 41% quota attainment — ask pointed questions about quota setting', 'Reviews are sharply divided on culture — ask current SDRs directly', 'Recent shift to 5 days in-office is a major change', 'Understand SSO, MFA, and Zero Trust identity basics'],
 3.2, '$90K', '$58K-$64K', 41.0, NULL, 3.0, 55,
 'SDR → AE',
 ARRAY['Culture reviews sharply divided — some call it great, others say most horrific sales culture', 'Only 41% quota attainment', 'Shifted to 5 days in-office'], 'security'),

-- ── 8. Splunk ────────────────────────────────────────────────────────────────

('Splunk', 'splunk', 4, 23,
 'Cold call example + 30/60/90 day ramp plan presentation',
 'Highest BDR satisfaction at 4.6/5 Glassdoor. Recommends taking free Splunk Fundamentals 1 eLearning course before interview. BDR org reports to Marketing not Sales. Acquired by Cisco in 2024.',
 'Cold call example/walkthrough + prepared ramp plan',
 ARRAY['Walk me through a cold call you are proud of', 'Present your 30/60/90 day plan', 'Why data analytics/observability?', 'How would you prospect into a security operations team?'],
 ARRAY['Not having a prepared 30/60/90 plan', 'Zero knowledge of data analytics or SIEM', 'Not knowing about the Cisco acquisition'],
 ARRAY['Take the free Splunk Fundamentals 1 course — huge edge', 'Prepare a polished 30/60/90 day ramp plan', 'BDR team sits under Marketing not Sales — understand implications', 'Work-life balance rated 4.7/5 — one of the best', 'Now part of Cisco — interview process may route through Cisco systems'],
 4.6, '$95K', '$60K-$65K', NULL, NULL, 3.0, 70,
 'BDR → ISR → AE',
 ARRAY['Acquired by Cisco in 2024 — process may be changing'], 'developer_tools'),

-- ── 9. Confluent ─────────────────────────────────────────────────────────────

('Confluent', 'confluent', 5, 26,
 'Extensive take-home (~7 hours): territory plan, 10 target accounts, prospecting email, 6-month plan + mock customer call + 1.5 hour panel presentation',
 'Most time-intensive take-home in the industry at ~7 hours. Core question: Why buy Confluent Cloud when Apache Kafka is free? WARNING: May have eliminated SDR function as of 2024.',
 'Mock customer call + panel presentation of take-home work',
 ARRAY['Why should a customer buy Confluent Cloud when Apache Kafka is free?', 'Present your territory plan and 10 target accounts', 'Walk me through your prospecting email', 'How would you approach a data engineering leader?'],
 ARRAY['Weak take-home submission', 'Cannot answer the Kafka vs Confluent Cloud question', 'No understanding of event streaming'],
 ARRAY['The take-home takes ~7 hours — plan your week accordingly', 'Master the open source vs commercial answer — this is THE question', 'Verify the SDR function still exists before applying — reports say it was eliminated in 2024', 'Understand event streaming, Apache Kafka, and real-time data basics'],
 3.5, '$110K', '$60K', 43.1, NULL, 3.5, 50,
 'SDR → AE (if function still exists)',
 ARRAY['May have eliminated SDR function as of 2024 — verify before applying', '43% quota attainment is concerning', '7-hour take-home is excessive for entry-level'], 'developer_tools'),

-- ── 10. HashiCorp ────────────────────────────────────────────────────────────

('HashiCorp', 'hashicorp', 4, 25,
 'Principles-based behavioral interview evaluating 9 core principles: integrity, kindness, pragmatism, humility, and 5 others',
 'Process described as radically transparent — interviewers share what they are evaluating. Highest base in developer tools tier at $70K. Now part of IBM.',
 NULL,
 ARRAY['Give an example of when you demonstrated integrity under pressure', 'How do you embody pragmatism?', 'Tell me about a time you showed kindness in a professional setting', 'Why infrastructure automation?'],
 ARRAY['Cannot map experiences to their 9 principles', 'Not knowing about the IBM acquisition', 'Generic answers without principle alignment'],
 ARRAY['Study all 9 core principles and prepare STAR stories for each', 'IBM acquisition completed 2024 — significant culture change', 'Highest base at $70K but morale is reportedly low post-acquisition', 'Understand Terraform, Vault, Consul at a high level'],
 3.5, '$100K', '$70K', NULL, 82.96, 3.0, 60,
 'SDR → AE (uncertain post-IBM acquisition)',
 ARRAY['IBM acquisition has caused low morale and talent departures', 'Culture was praised pre-acquisition but has shifted significantly'], 'developer_tools'),

-- ── 11. Elastic ──────────────────────────────────────────────────────────────

('Elastic', 'elastic', 4, 14,
 'No formal test — behavioral interviews focused on motivation and curiosity about technology',
 'Explicitly values quality of interactions over quantity of calls — rare for SDR orgs. Fastest SDR-specific hire at 14 days. Best recruiter experience reported.',
 NULL,
 ARRAY['Tell me about a time you balanced lots of responsibilities', 'Why search and observability?', 'What drives your curiosity about technology?', 'How do you prioritize competing demands?'],
 ARRAY['Lack of intellectual curiosity', 'Only motivated by money', 'Cannot articulate interest in technology'],
 ARRAY['Quality over quantity mindset — align your answers accordingly', '68% quota attainment is strong', 'Understand Elasticsearch, Kibana, and observability basics', 'Recruiter experience praised as best ever — be prepared for fast process'],
 3.8, '$80K-$90K', '$55K-$60K', 68.0, 83.48, 2.8, 70,
 'SDR → Commercial AE',
 ARRAY['Quotas reportedly increasing ~30% quarter over quarter'], 'developer_tools'),

-- ── 12. Atlassian ────────────────────────────────────────────────────────────

('Atlassian', 'atlassian', 5, 17,
 'Mock cold call + dedicated values interview round that can be conducted by anyone in the company (Marketing, Engineering, etc.)',
 'Values interview is heavily weighted and conducted by cross-functional team member. Enterprise Dev Rep pays $93K-$105K OTE — among highest SDR comp.',
 'Mock cold call + separate values assessment round',
 ARRAY['Give a STAR example for Open Company No Bullshit', 'How do you embody Dont F the Customer?', 'Mock cold call selling Jira/Confluence', 'Tell me about a time you played as a team', 'Walk me through how you would approach an enterprise prospect'],
 ARRAY['Not knowing Atlassian 5 values', 'Generic stories not mapped to specific values', 'Not understanding product-led growth model'],
 ARRAY['Prepare STAR stories for each of 5 values including Open Company No Bullshit', 'Values interviewer can be from ANY department — treat all rounds equally', 'Top performers earn $150K-$200K', 'Understand PLG motion and how SDR fits into a product-led company'],
 3.8, '$93K-$105K', '$60K-$75K', NULL, NULL, 3.3, 80,
 'EDR → Sr EDR → AE',
 ARRAY['Unrealistic expectations reported', '30% quota increases quarter over quarter'], 'enterprise_saas'),

-- ── 13. Monday.com ───────────────────────────────────────────────────────────

('Monday.com', 'monday', 6, 21,
 '3-page take-home questionnaire (find 5 contacts, create outreach cadence, draft 2 emails, respond to 4 sales scenarios) + mock cold call + on-the-spot email writing',
 'Most criticized process — widely called hours of free labor for an entry-level role. SDR comp satisfaction at 2.6/5 is lowest across all companies.',
 'Mock cold call + live email writing exercise',
 ARRAY['Complete the 3-page take-home assignment', 'Mock cold call selling monday.com to a VP Operations', 'Write a prospecting email on the spot', 'Why project management software?'],
 ARRAY['Half-hearted take-home submission', 'Cannot write a compelling email under pressure', 'Not understanding the work management space'],
 ARRAY['Take-home is extensive — budget 3-4 hours minimum', '67% of SDRs hit quota despite low satisfaction', 'Comp satisfaction is 2.6/5 — ask hard questions about OTE and ramp', 'Understand the competitive landscape: Asana, ClickUp, Notion, Smartsheet'],
 3.0, '$70K-$95K', '$50K-$75K', 67.0, NULL, 3.5, 50,
 'SDR → AE (process unclear)',
 ARRAY['SDR comp satisfaction at 2.6/5 — lowest across all companies', 'Process widely criticized as excessive for entry-level', 'Take-home described as hours of free labor'], 'enterprise_saas'),

-- ── 14. Figma ────────────────────────────────────────────────────────────────

('Figma', 'figma', 5, 25,
 'Mock discovery call/role play',
 'Exceptional product-market fit at 4.7/5. Pre-IPO equity adds significant upside. Getting a referral reportedly critical for getting into the process.',
 'Mock discovery call',
 ARRAY['Tell me about a deal that slipped', 'Why design tools?', 'How would you prospect into a design team at a Fortune 500?', 'Walk me through your approach to multi-threading'],
 ARRAY['Asking too many questions during sales scenario — one candidate was rejected for this', 'Not having a referral', 'No understanding of design tools market'],
 ARRAY['Getting a referral is reportedly critical', 'Product-Market Fit 4.7/5 — reference specific product capabilities', 'BDR segment is growing fast with clear AE promotion path', 'Pre-IPO equity makes total comp potentially very significant'],
 4.0, '$110K', '$65K', NULL, NULL, 3.5, 65,
 'BDR → AE (growing team with clear path)',
 ARRAY[]::TEXT[], 'product'),

-- ── 15. Braze ────────────────────────────────────────────────────────────────

('Braze', 'braze', 4, 23,
 '48-hour BDR email challenge — prospecting exercise under deadline',
 'Most variable-heavy comp split at 53/47. No brilliant jerks philosophy. Only 39% meet quota with that aggressive split.',
 '48-hour take-home email challenge',
 ARRAY['What data did you use to influence a campaign?', 'Why marketing automation/customer engagement?', 'Walk me through your email challenge submission', 'How would you prospect into a VP Marketing?'],
 ARRAY['Generic email in the challenge', 'Not understanding customer engagement platforms', 'No data-driven thinking in examples'],
 ARRAY['53/47 base-to-variable split means variable is nearly half your pay', 'Only 39% of reps meet quota — ask hard questions about quota setting', 'No brilliant jerks philosophy — show collaboration', 'Understand push notifications, in-app messaging, and customer engagement'],
 3.5, '$85K-$95K', '$50K-$55K', 39.0, 84.74, 3.0, 60,
 'BDR → AE',
 ARRAY['53/47 comp split is most aggressive — high risk if quota is hard to hit', 'Only 39% meet quota'], 'martech'),

-- ── 16. Toast ────────────────────────────────────────────────────────────────

('Toast', 'toast', 4, 25,
 'Mock cold call on a restaurant + sales pitch preparation (Super Day format with 2 managers + 1 associate)',
 'Industry-specific mock call — you role-play calling a restaurant about switching POS systems. Company provides Sandler Sales PDF to review. Managers give coaching feedback after mock call.',
 'Industry-specific mock cold call to restaurant owner/manager',
 ARRAY['Mock cold call to a restaurant about POS switch', 'Why restaurant technology?', 'How would you handle a restaurant owner who says they are too busy?', 'Tell me about a time you were persistent'],
 ARRAY['No restaurant industry knowledge', 'Not reviewing the provided Sandler Sales PDF', 'Cannot handle objections specific to restaurant owners'],
 ARRAY['Review the Sandler Sales PDF they provide — its a test of preparation', 'Research restaurant industry pain points: labor, margins, tech adoption', 'Managers give coaching feedback after mock call — be visibly coachable', 'RepVue score 87.20 and culture/leadership 4.0/5 — genuinely good environment'],
 4.2, '$75K-$85K', '$45K-$55K', NULL, 87.20, 2.8, 65,
 'SDR → AE (clear path in restaurant vertical)',
 ARRAY['Lowest comp in this tier at $75K-$85K', 'PTO requests can be rejected if not hitting quota'], 'vertical_saas'),

-- ── 17. Klaviyo ──────────────────────────────────────────────────────────────

('Klaviyo', 'klaviyo', 4, 23,
 'Mock cold call + prospecting email — NO provided value props or scripts, must independently research everything',
 'Hardest mock call because candidates receive zero canned scripts. Requires 2-5 hours of independent research. No brilliant jerks policy from CEO Andrew Bialecki.',
 'Unscripted mock cold call — fully self-researched',
 ARRAY['Mock cold call with zero provided scripts', 'Tell me about a deal where you fell short and why', 'Why e-commerce marketing?', 'How would you approach a DTC brand about email marketing?'],
 ARRAY['Not doing independent research on product and personas', 'Relying on generic cold call frameworks without customization', 'Not understanding e-commerce marketing basics'],
 ARRAY['Spend 2-5 hours researching Klaviyo product, personas, and competitors before mock call', 'You get NO scripts or value props — everything must be self-researched', 'Top performers earn up to $128K', 'Recruiter communication is inconsistent — follow up proactively'],
 3.5, '$75K', '$50K', NULL, NULL, 3.5, 55,
 'SDR → AE',
 ARRAY['Recruiter communication inconsistent — ghosting reported'], 'martech'),

-- ── 18. Deel ─────────────────────────────────────────────────────────────────

('Deel', 'deel', 4, 18,
 'Mock discovery call + take-home test + video recordings',
 'Deel Speed is a core value — process often concludes in under 2 weeks. 89% of SDRs recommend Deel. Fully remote. Some positions are contractor roles.',
 'Mock discovery call with specific scenario (e.g., company called Rocket Labs)',
 ARRAY['Mock discovery call with Rocket Labs scenario', 'Why global HR/payroll?', 'How would you prospect into a company expanding internationally?', 'Tell me about a time you moved fast on an opportunity'],
 ARRAY['Not demonstrating urgency and speed', 'Not understanding international hiring and payroll complexities', 'Slow communication during the process'],
 ARRAY['89% of SDRs recommend Deel — satisfaction is genuinely high', 'Ask whether the position is employee or contractor — big difference', 'Deel Speed means respond fast to every communication', 'Research the recent espionage allegations and RICO lawsuits — be informed'],
 4.4, '$80K-$90K', '$48K-$55K', NULL, NULL, 3.0, 70,
 'SDR → AE (fast-growth environment)',
 ARRAY['Some positions are contractor roles without traditional employment benefits', 'Recent espionage allegations and RICO lawsuits — research before joining'], 'hr_tech'),

-- ── 19. Rippling ─────────────────────────────────────────────────────────────

('Rippling', 'rippling', 4, 22,
 'Mock cold call with senior manager/director in final round',
 'Strong pay and training but polarizing culture. 80 cold calls per day expected. Unofficial guidance: dont take PTO for first 4 months. One candidate rejected because HM didnt like their outfit.',
 'Mock cold call with senior leadership',
 ARRAY['Mock cold call to an HR director about workforce platform', 'Why HR tech?', 'Tell me about a time you worked under extreme pressure', 'How do you stay motivated during high-volume cold calling?'],
 ARRAY['Low energy or enthusiasm', 'Not being ready for intense pace', 'Appearance and presentation — one candidate rejected for outfit', 'Answers that are too direct without warmth'],
 ARRAY['Training and enablement are second to none — genuinely best-in-class', 'Pre-IPO equity adds significant upside', 'This is a high-risk high-reward environment — 12+ hour days reported', 'Ask about the 80 calls/day expectation and PTO culture openly', 'Dress professionally — appearance was cited as rejection reason'],
 3.2, '$85K-$120K', '$60K', NULL, NULL, 3.5, 50,
 'SDR → AE (fast track if you survive)',
 ARRAY['Work-life balance rated 2.6/5', '80 cold calls per day expected', 'Unofficial guidance: dont take PTO for first 4 months', 'Culture described as toxic and churn-and-burn by some', 'SDR recommend rate only 39%, down 29% in past year'], 'hr_tech'),

-- ── 20. Oracle ───────────────────────────────────────────────────────────────

('Oracle', 'oracle', 4, 21,
 'Elevator pitch in front of 20+ candidates on group Zoom, case study mock call, panel Q&A with current BDCs',
 'Group interview format with 20+ candidates giving elevator pitches simultaneously. Being first to ask a question during BDC panel reportedly matters.',
 'Case study mock call + group elevator pitch',
 ARRAY['Give your elevator pitch (in front of 20+ other candidates)', 'Case study mock call', 'Why Oracle?', 'Questions for current BDC panel'],
 ARRAY['Asking about growth beyond BDR — was penalized in one report', 'Being passive in the group format', 'Not standing out among 20+ candidates'],
 ARRAY['Be first to ask a question during BDC panel — it gets noticed', 'Promotion rate is only 5-10% internally — most leave for external roles after 1-2 years', 'Oracle has been known to rescind offers', 'Practice your elevator pitch to be crisp in 60 seconds'],
 3.0, '$75K-$80K', '$52K-$58K', NULL, NULL, 3.0, 55,
 'BDC → AE (only 5-10% promote internally — most leave externally)',
 ARRAY['Promotion described as total free for all — only 5-10% advance internally', 'Has been known to rescind offers', 'Brand value for resume but not a long-term destination for most'], 'enterprise'),

-- ── 21. SAP ──────────────────────────────────────────────────────────────────

('SAP', 'sap', 4, 21,
 'Role play phone calls + live SDR call shadowing — candidates sit with current SDRs and listen to real calls',
 'Only company offering live call shadowing during the interview. Day-in-the-life element helps both sides assess fit.',
 'Role play + live call shadowing with current SDRs',
 ARRAY['What is your experience with cold calling?', 'How many calls per week do you make?', 'Mock phone call scenario', 'Why enterprise software?'],
 ARRAY['No cold calling experience or comfort with phones', 'Not asking questions during the shadowing session', 'Not understanding enterprise software basics'],
 ARRAY['SAP Concur SDR teams are considered a strong launchpad', 'Use the shadowing session to ask genuine questions — they are evaluating your curiosity', 'Interview culture described as friendly and relationship-focused', 'Understand ERP, CRM, and business process automation at a high level'],
 3.5, '$80K-$95K', '$60K-$70K', NULL, NULL, 2.8, 65,
 'SDR → ISR → AE',
 ARRAY[]::TEXT[], 'enterprise'),

-- ── 22. Microsoft ────────────────────────────────────────────────────────────

('Microsoft', 'microsoft', 5, 28,
 'Presentation/mock demo + cultural pillars assessment (Create Clarity, Generate Energy, Deliver Success)',
 'Highest SDR compensation in the industry at $160K median OTE. Aspire Program is 2-year rotational entry for new grads. Growth mindset is assessed throughout.',
 'Presentation/mock demo format',
 ARRAY['How do you Create Clarity in ambiguous situations?', 'Give an example of Generating Energy on a team', 'How did you Deliver Success against a difficult goal?', 'Demonstrate a growth mindset moment'],
 ARRAY['Fixed mindset language', 'Not knowing the three cultural pillars', 'Cannot discuss Azure, Dynamics 365, or Microsoft 365 at a basic level'],
 ARRAY['$160K median OTE is #1 across all tech SDR roles — includes RSUs', 'Prepare stories for each of three pillars: Create Clarity, Generate Energy, Deliver Success', 'Aspire Program for new grads is a 2-year rotational program', 'Internal mobility is exceptional — you can move across the entire company'],
 4.0, '$115K-$200K', '$70K-$90K', NULL, NULL, 3.5, 65,
 'Aspire → DSS → AE (or lateral moves across Microsoft)',
 ARRAY['Entry-level Aspire SDRs likely earn less than the $160K median which includes senior titles'], 'enterprise'),

-- ── 23. Google Cloud ─────────────────────────────────────────────────────────

('Google Cloud', 'google cloud', 4, 28,
 'Structured behavioral interviews + Role-Related Knowledge + Googleyness evaluation + hiring committee review',
 'Hiring committee model — decision is not made by hiring manager alone, reducing individual bias. Googleyness evaluates intellectual curiosity, collaboration, and humility.',
 NULL,
 ARRAY['Describe a time you influenced someone without authority', 'How do you demonstrate intellectual curiosity?', 'Tell me about a time you collaborated across teams', 'Why cloud computing?'],
 ARRAY['Using we instead of I in STAR stories', 'Hypothetical answers instead of real examples', 'Not preparing 8-10 STAR stories'],
 ARRAY['Prepare 8-10 STAR stories mapped to Googles four assessment areas', 'Googleyness is real — show genuine curiosity and humility', 'Hiring committee reviews all feedback — consistency across rounds matters', 'Cost cuts since 2024 have affected morale — ask about team stability'],
 4.1, '$90K-$130K', '$55K-$70K', NULL, NULL, 3.5, 60,
 'BDR → Account Strategist → AE',
 ARRAY['Cost cuts and headcount reductions since 2024 have affected morale', 'Some reviews note leadership with an Oracle mentality'], 'enterprise'),

-- ── 24. AWS ──────────────────────────────────────────────────────────────────

('AWS', 'aws', 5, 27,
 'The Loop — 4-5 consecutive hour-long interviews + Bar Raiser with veto power. Every question maps to 16 Leadership Principles using STAR method.',
 'Most structured and demanding interview. Bar Raiser has VETO power. 70% quota attainment is highest of any company. $145K median OTE.',
 NULL,
 ARRAY['Tell me about a time you demonstrated Customer Obsession', 'Give an example of Dive Deep', 'How have you shown Bias for Action?', 'Describe a time you Disagreed and Committed'],
 ARRAY['Using we instead of I', 'Vague answers without specific details', 'Hypothetical responses instead of real examples', 'Not knowing the 16 Leadership Principles'],
 ARRAY['Prepare 2-3 STAR stories for EACH of the 16 Leadership Principles', 'The Loop is a mental marathon — 4-5 consecutive hours', 'Bar Raiser has veto power — that round is critical', '70% quota attainment is best in this guide — quotas are achievable', 'Commission structure may be weighted toward base + RSUs rather than traditional variable'],
 3.8, '$145K', '$85K', 70.0, NULL, 3.8, 60,
 'BDR → ISR → AE (structured path within Amazon)',
 ARRAY['The Loop format is mentally exhausting — prepare your stamina', 'Commission structure is atypical — may be RSU-heavy'], 'enterprise'),

-- ── 25. IBM ──────────────────────────────────────────────────────────────────

('IBM', 'ibm', 3, 30,
 'Resume deep-dive + case question — simplest process among enterprise companies',
 'Uses Digital Sales Specialist titles for many SDR-type roles. Surprisingly strong compensation at $125K median OTE with $85K base.',
 NULL,
 ARRAY['Walk me through your resume in detail', 'Case question on a business scenario', 'Why IBM?', 'How would you position Watson AI to a CTO?'],
 ARRAY['Cannot handle detailed resume probing', 'No interest in AI or enterprise technology', 'Generic answers to case questions'],
 ARRAY['$125K OTE with $85K base is very competitive for entry-level', 'Professional development scores in 85th percentile', 'AI and watsonx initiatives provide strong product narrative', 'Process is simple — just 2-3 rounds — but dont underprepare'],
 3.5, '$125K', '$85K', 60.0, NULL, 2.8, 60,
 'Digital Sales Specialist → Senior DSS → AE',
 ARRAY['Some describe culture as sales sweatshop with unrealistic quotas', 'Draconian performance management reported'], 'enterprise'),

-- ── 26. Cisco ────────────────────────────────────────────────────────────────

('Cisco', 'cisco', 3, 27,
 'Behavioral questions + mock call',
 'Best culture-to-compensation balance among enterprise companies. Won a RepVue Reppy award. Interviewers want you to succeed.',
 'Standard mock call',
 ARRAY['How do you stay motivated in a high-volume calling environment?', 'Tell me about yourself', 'Why networking/security technology?', 'Describe a time you bounced back from a setback'],
 ARRAY['Low energy', 'No understanding of networking basics', 'Cannot explain what Cisco does simply'],
 ARRAY['RepVue 86.28 and culture 3.8/5 are both strong — genuinely good place', 'Cisco Meraki subsidiary has even higher culture rating at 4.2/5', '63% SDR quota attainment is solid', 'Understand networking, security, and collaboration technology basics'],
 3.8, '$115K', '$65K', 63.0, 86.28, 2.8, 70,
 'BDR → ISR → AE',
 ARRAY[]::TEXT[], 'enterprise'),

-- ── 27. Dell Technologies ────────────────────────────────────────────────────

('Dell Technologies', 'dell', 3, 21,
 'AI-based pre-recorded video interview (5 questions, no live interviewer) + mock cold call/role play',
 'Uses AI video interviews as initial screen — record yourself answering 5 questions with no live interviewer. Training academy widely praised.',
 'AI video screen + mock cold call in later rounds',
 ARRAY['5 AI-screened video questions', 'Mock cold call for IT solutions', 'Why Dell?', 'Tell me about a time you went above and beyond'],
 ARRAY['Poor video recording quality or environment', 'Not preparing for asynchronous video format', 'Only interested in comp (lowest among enterprise)'],
 ARRAY['The AI video feels impersonal — prepare your environment carefully', 'Training academy is amazing and widely praised', 'Lowest enterprise comp at ~$75K OTE — best for training and resume brand', 'Dell caps commission and gives minimal raises on promotion'],
 3.2, '$75K', '$60K', NULL, 79.99, 2.5, 60,
 'ISR → AE (structured but slow)',
 ARRAY['Lowest compensation among enterprise companies', 'Commission capped', 'Minimal raises upon promotion'], 'enterprise'),

-- ── 28. Adobe ────────────────────────────────────────────────────────────────

('Adobe', 'adobe', 4, 28,
 'Multiple pre-recorded video submissions + product pitch role play scenario (provided ~1 week in advance) + sales case presentation',
 'Sales Academy (ASA) is primary entry path — structured multi-phase program. Flies candidates in for on-site finals with campus tours and meals.',
 'Product pitch scenario (provided in advance) + video submissions',
 ARRAY['Pre-recorded video answers (multiple rounds)', 'Product pitch role play (scenario given 1 week early)', 'Why Adobe?', 'Sales case presentation'],
 ARRAY['Poor video submissions', 'Not using the full preparation time for the role play scenario', 'Not knowing Adobe product suite'],
 ARRAY['Role play scenario is provided a week in advance — use every minute of prep time', 'ASA program is structured: SDR → BDR → ISR → AE', 'Culture is strong — they cared about me as an individual', 'Industry-leading benefits including parental leave'],
 3.8, '$90K-$100K', '$57K-$70K', NULL, 84.36, 3.0, 65,
 'ASA: SDR → BDR → ISR → AE (structured program)',
 ARRAY[]::TEXT[], 'enterprise_saas'),

-- ── 29. Notion ───────────────────────────────────────────────────────────────

('Notion', 'notion', 4, 28,
 'Prioritization interview (unique to Notion) — poorly explained, ask recruiter for clarification',
 'Highest RepVue score (88.47) and top performer ceiling ($250K) among high-growth companies. Shifting from inbound B2C to outbound B2B — opportunity for hunters.',
 'Prioritization interview + behavioral',
 ARRAY['How would you prioritize these competing opportunities?', 'Why Notion?', 'Tell me about yourself (expect to repeat 5+ times with equal energy)', 'How do you approach outbound prospecting in a product-led company?'],
 ARRAY['Running out of energy repeating stories across 5+ interviewers', 'Not understanding PLG to enterprise motion', 'Generic answers about why Notion'],
 ARRAY['Be prepared to repeat the same story 5+ times with equal energy', 'Ask recruiter to explain prioritization interview format — its poorly defined', 'Shifting from B2C to B2B creates opportunity for outbound hunters', 'Top performers earn $190K-$250K', 'Culture rated 3.9/5 — best company culture Ive been a part of'],
 4.5, '$100K-$120K', '$60K-$80K', NULL, 88.47, 3.3, 60,
 'SDR → AE (clear path as B2B team grows)',
 ARRAY[]::TEXT[], 'product'),

-- ── 30. Airtable ─────────────────────────────────────────────────────────────

('Airtable', 'airtable', 4, 29,
 'Mock discovery call done TWICE — first attempt, receive written feedback notes, then redo the call incorporating feedback. Purest coachability test across all 40 companies.',
 'Most innovative assessment design. Explicit coachability test through redo mechanism. BUT only 30.6% of reps hit quota — lowest in entire guide.',
 'Mock discovery call x2 with feedback between attempts',
 ARRAY['Mock discovery call (first attempt)', 'Incorporate written feedback (second attempt)', 'Describe the cloud as if I was your grandma', 'How do you use AI in your work?'],
 ARRAY['Not visibly improving between first and second mock call', 'Defensive response to feedback notes', 'Cannot simplify cloud concepts', 'No AI knowledge'],
 ARRAY['The redo mechanism is THE test — take detailed notes on feedback and implement every point', 'Only 30.6% of reps hit quota — ask very hard questions about quota setting', 'AI knowledge is increasingly tested — prepare examples', 'BDR-specific reviews praise best-in-class compensation and weekly training'],
 3.5, '$87K-$125K', '$60K', 30.6, NULL, 3.3, 55,
 'BDR → AE',
 ARRAY['Only 30.6% quota attainment — lowest in entire guide', 'Company may be setting unrealistic quotas'], 'product');

-- ── Step 4: Update original 10 companies with new columns ───────────────────

UPDATE company_interview_intel SET
  ote_range = '$85K-$110K', base_range = '$50K-$60K',
  promotion_path = 'BDR → SDR → AE (12-18 months)',
  culture_warnings = ARRAY[]::TEXT[], company_category = 'enterprise_saas'
WHERE company_name_normalized = 'salesforce';

UPDATE company_interview_intel SET
  ote_range = '$75K-$90K', base_range = '$48K-$55K',
  promotion_path = 'BDR → AE → Sr AE (12-18 months)',
  culture_warnings = ARRAY[]::TEXT[], company_category = 'enterprise_saas'
WHERE company_name_normalized = 'hubspot';

UPDATE company_interview_intel SET
  ote_range = '$90K-$110K', base_range = '$55K-$65K',
  promotion_path = 'SDR → AE (fast-track for top performers)',
  culture_warnings = ARRAY[]::TEXT[], company_category = 'revenue_intelligence'
WHERE company_name_normalized = 'gong';

UPDATE company_interview_intel SET
  ote_range = '$80K-$100K', base_range = '$55K-$62K',
  promotion_path = 'SDR → Commercial AE',
  culture_warnings = ARRAY[]::TEXT[], company_category = 'infrastructure'
WHERE company_name_normalized = 'datadog';

UPDATE company_interview_intel SET
  ote_range = '$75K-$90K', base_range = '$50K-$55K',
  promotion_path = 'SDR → AE',
  culture_warnings = ARRAY['Only 8% of SDR employees recommend it — lowest in guide'], company_category = 'sales_tech'
WHERE company_name_normalized = 'outreach';

UPDATE company_interview_intel SET
  ote_range = '$85K-$100K', base_range = '$55K-$65K',
  promotion_path = 'BDR → ISR → AE',
  culture_warnings = ARRAY[]::TEXT[], company_category = 'security'
WHERE company_name_normalized = 'crowdstrike';

UPDATE company_interview_intel SET
  ote_range = '$90K-$115K', base_range = '$55K-$65K',
  promotion_path = 'SDR → Commercial AE',
  culture_warnings = ARRAY['Process can take up to 2 months'], company_category = 'infrastructure'
WHERE company_name_normalized = 'snowflake';

UPDATE company_interview_intel SET
  ote_range = '$70K-$85K', base_range = '$45K-$52K',
  promotion_path = 'SDR → AE',
  culture_warnings = ARRAY[]::TEXT[], company_category = 'sales_intelligence'
WHERE company_name_normalized = 'zoominfo';

UPDATE company_interview_intel SET
  ote_range = '$80K-$95K', base_range = '$50K-$58K',
  promotion_path = 'SDR → AE',
  culture_warnings = ARRAY[]::TEXT[], company_category = 'martech'
WHERE company_name_normalized = '6sense';

UPDATE company_interview_intel SET
  ote_range = '$85K-$110K', base_range = '$60K-$70K',
  promotion_path = 'SDR → AE',
  culture_warnings = ARRAY[]::TEXT[], company_category = 'fintech'
WHERE company_name_normalized = 'ramp';

-- ── Verify ──────────────────────────────────────────────────────────────────

SELECT count(*) AS total_companies FROM company_interview_intel;
-- Expected: 40
