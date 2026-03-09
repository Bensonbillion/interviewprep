-- Company interview intelligence: curated data from Glassdoor, Bravado, and community reports.
-- Injected into AI generation when a user preps for a known company.

CREATE TABLE IF NOT EXISTS company_interview_intel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_name_normalized TEXT NOT NULL,
  interview_rounds INT,
  avg_days_to_hire INT,
  key_test TEXT,
  unique_element TEXT,
  mock_call_format TEXT,
  common_questions TEXT[],
  red_flags TEXT[],
  tips TEXT[],
  sdr_satisfaction_score DECIMAL(2,1),
  last_updated TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_intel_normalized
  ON company_interview_intel (company_name_normalized);

ALTER TABLE company_interview_intel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read" ON company_interview_intel
  FOR SELECT TO authenticated USING (true);

-- ── Seed 10 companies ───────────────────────────────────────────────────────────

INSERT INTO company_interview_intel (
  company_name, company_name_normalized, interview_rounds, avg_days_to_hire,
  key_test, unique_element, mock_call_format,
  common_questions, red_flags, tips, sdr_satisfaction_score
) VALUES

('Salesforce', 'salesforce', 4, 34,
 'Panel presentation + mock call with gatekeeper simulation',
 'Company passion matters more than qualifications. Bring YOUR energy — interviewers are deliberately low-energy to test you.',
 'Mock call includes gatekeeper objection handling',
 ARRAY['Tell us something about yourself thats not on your resume', 'Why Salesforce specifically?', 'Sell me this pen', 'Walk me through how you would prospect into an enterprise account'],
 ARRAY['Not knowing Salesforce products', 'Low energy', 'Not being competitive enough'],
 ARRAY['They want people who are COMPETITIVE and ready to make money', 'Research Trailhead and mention it', 'Know the difference between Sales Cloud, Service Cloud, and Marketing Cloud'],
 4.1),

('HubSpot', 'hubspot', 5, 30,
 'Audio-only mock cold call — no video, voice only',
 'Culture Code knowledge is a MUST. They will ask about it.',
 'Audio-only cold call — tests phone presence without visual cues',
 ARRAY['Tell me about yourself', 'Why HubSpot?', 'Mock cold call (audio only)', 'What do you know about our Culture Code?'],
 ARRAY['Not reading the Culture Code', 'Saying youre hesitant about phones', 'Not knowing inbound methodology'],
 ARRAY['Read the Culture Code before interviewing — they WILL ask', 'Understand inbound vs outbound', 'Mention HEART framework if you know it'],
 4.3),

('Gong', 'gong', 4, 14,
 'Mock call with TWO attempts — coaching between them',
 'Coachability is the actual test. First call performance barely matters. Second attempt after coaching is what they evaluate.',
 'Two mock calls: first attempt → receive coaching → second attempt',
 ARRAY['Tell me about yourself', 'Why revenue intelligence?', 'Mock cold call (x2)', 'How do you handle coaching feedback?'],
 ARRAY['Getting defensive after coaching', 'Not improving on second attempt', 'Not asking discovery questions in mock call'],
 ARRAY['Embrace the first mock call being imperfect — they expect it', 'Take notes during coaching', 'Show visible improvement on second try', 'SaaS experience may be required'],
 4.6),

('Datadog', 'datadog', 3, 25,
 'In-person round emphasizes YOUR questions over their questions',
 'Conversational interview style. They evaluate what YOU ask more than how you answer.',
 'Standard mock call format',
 ARRAY['Tell me about yourself', 'Why observability/monitoring?', 'What questions do you have for us?', 'Walk me through your prospecting workflow'],
 ARRAY['Not having strong questions prepared', 'Not understanding observability basics', 'Being too scripted'],
 ARRAY['Prepare 8-10 questions — they will go deep on yours', 'Understand what observability means vs traditional monitoring', 'Be conversational, not rehearsed'],
 4.4),

('Outreach', 'outreach', 3, 23,
 'Mock call can happen in ANY round — it is a surprise test',
 'Company explicitly describes the SDR job as "excruciatingly difficult." 80-90 daily dials reported.',
 'Surprise mock call — can appear in any round. Also: pre-interview email writing assignment.',
 ARRAY['Write a mock outreach email to a VP (take-home)', 'Mock cold call (surprise)', 'Tell me about yourself', 'How do you handle high rejection volume?'],
 ARRAY['Not completing the email assignment thoughtfully', 'Getting flustered by surprise mock call', 'Not researching the product'],
 ARRAY['Be ready for a mock call in EVERY round', 'Email assignment is graded before you meet the team', 'Only 8% of SDR employees recommend it — ask hard questions about culture'],
 2.9),

('CrowdStrike', 'crowdstrike', 4, 21,
 'Mock discovery call with Head of Sales',
 'Must know Falcon platform basics before walking in.',
 'Discovery call format — less pitch, more qualification questions',
 ARRAY['What do you know about Falcon?', 'Mock discovery call', 'Why cybersecurity?', 'Describe a time you had to learn something technical quickly'],
 ARRAY['Not knowing what Falcon does', 'Pitching instead of doing discovery', 'Not showing technical curiosity'],
 ARRAY['Learn Falcon Prevent, Falcon Discover, Falcon Spotlight at minimum', 'Frame as discovery not pitch', 'Cybersecurity knowledge is a differentiator'],
 3.6),

('Snowflake', 'snowflake', 4, 60,
 '"Describe the Data Cloud in 30 seconds" — simplification test',
 'Process can take up to 2 months. Includes a group interview stage.',
 'Standard mock call + group interview',
 ARRAY['Describe the Data Cloud in 30 seconds', 'Why Snowflake?', 'Group exercise', 'Walk me through a deal you sourced'],
 ARRAY['Not being able to simplify the product', 'Impatience with long process', 'Not differentiating from Databricks/BigQuery'],
 ARRAY['Practice the 30-second Data Cloud pitch until its natural', 'Be patient — 2 month process is normal', 'Understand data warehousing vs data lake basics'],
 3.7),

('ZoomInfo', 'zoominfo', 3, 20,
 'Mock cold call with mid-interview feedback given',
 'Includes IQ/EQ assessment tests. Enterprise SDR role requires a presentation.',
 'Mock call + real-time coaching + IQ/EQ tests',
 ARRAY['Mock cold call', 'IQ/EQ assessment', 'Why ZoomInfo?', 'Presentation (enterprise SDR only)'],
 ARRAY['Poor IQ/EQ test scores', 'Not implementing mid-interview feedback', 'Not knowing ZoomInfos data products'],
 ARRAY['They give coaching MID-INTERVIEW — implement it immediately', 'Know the difference between ZoomInfo, Chorus, and Engage products', 'If enterprise SDR, prepare a 10-minute presentation'],
 3.2),

('6sense', '6sense', 5, 30,
 '24-hour case study — write a mock BDR outreach email',
 'Process can involve 5+ interviews over weeks. Heavy emphasis on intent data understanding.',
 'Take-home email + standard mock call',
 ARRAY['Write a cold email (24hr case study)', 'What do you know about intent data?', 'Mock cold call', 'Why 6sense over Bombora/Demandbase?'],
 ARRAY['Generic email in case study', 'Not understanding intent data', 'Not differentiating from competitors'],
 ARRAY['The email case study is your FIRST impression — spend real time on it', 'Understand buyer intent signals', 'Know the 6sense Revenue AI platform basics'],
 3.8),

('Ramp', 'ramp', 5, 20,
 'Roleplay interviewer is intentionally dry and dismissive — stress test',
 'One-way video recording required. Business case presentation round. Interviewers are deliberately cold.',
 'Video recording + business case + intentionally hostile roleplay',
 ARRAY['One-way video recording', 'Business case presentation', 'Mock call with intentionally dismissive interviewer', 'Why fintech?'],
 ARRAY['Getting flustered by dismissive interviewer', 'Poor video recording quality', 'Weak business case'],
 ARRAY['The dismissive interviewer is a TEST — do not take it personally', 'Prepare your video recording environment carefully', 'Business case should show analytical thinking, not just sales skills'],
 NULL);
