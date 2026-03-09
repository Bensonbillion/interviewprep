-- Add Couchbase and ValorC3 to company_interview_intel.

INSERT INTO company_interview_intel (
  company_name, company_name_normalized, interview_rounds,
  avg_days_to_hire, key_test, unique_element, mock_call_format,
  common_questions, red_flags, tips, sdr_satisfaction_score,
  ote_range, base_range, quota_attainment, repvue_score,
  interview_difficulty, positive_experience_pct, promotion_path,
  culture_warnings, company_category
) VALUES

-- ── Couchbase ────────────────────────────────────────────────────────────────

('Couchbase', 'couchbase', 4, 28,
 'Behavioral interviews with technical curiosity assessment — process described as friendly, transparent, and relaxed',
 'Interview culture is notably candidate-friendly. Recruiter communication praised as timely and transparent. Process includes meeting hiring manager plus several stakeholders. Glassdoor rates interview experience 46% positive with 2.93 difficulty — straightforward. Previously called Membase. Recently rebranded themselves as a modern multi-model NoSQL database company competing against MongoDB.',
 'No confirmed standardized mock cold call — behavioral and stakeholder interviews',
 ARRAY['Why NoSQL databases? Why Couchbase over MongoDB?', 'How would you explain Couchbase to a non-technical prospect?', 'Tell me about yourself and why sales', 'What specific strategies would you use to prospect into database administrators and engineering leaders?', 'How do others view you? (actual Glassdoor-reported question)', 'Walk me through how you would position Couchbase against MongoDB or DynamoDB'],
 ARRAY['Not understanding the difference between Couchbase and MongoDB', 'No curiosity about database technology', 'Cannot simplify NoSQL concepts for non-technical buyers', 'Not knowing Couchbase recently pivoted toward AI and edge computing use cases'],
 ARRAY['Couchbase competes directly with MongoDB — know the positioning: Couchbase = performance and flexibility at scale, MongoDB = developer ease and ecosystem', 'Understand the basics: NoSQL, document database, key-value store, SQL++ query language', 'The company culture is genuinely collaborative — interviewers described as passionate about technology, transparent, and willing to answer questions', 'Compensation satisfaction rated 4.1/5 on Glassdoor — above average', 'SDR pay split is 68/32 with variable driven by converted opportunities — understand this metric', 'Couchbase recently launched Capella (cloud DBaaS) — this is the growth product to reference', 'The ICP is enterprise developers and architects building mission-critical applications — understand this buyer persona', 'Company is publicly traded (BASE on Nasdaq) — reference recent earnings or product announcements to show research depth'],
 3.8, '$71K-$95K', '$47K-$66K', NULL, NULL, 2.93, 46,
 'SDR → AE (standard SaaS path)',
 ARRAY[]::TEXT[], 'developer_tools'),

-- ── ValorC3 ──────────────────────────────────────────────────────────────────

('ValorC3', 'valorc3', 3, 21,
 'Behavioral and consultative selling assessment — small company so expect to meet leadership directly including CCO or VP of Channel Sales',
 'Recently rebranded from Tonaquint (2025). Small company (~50 employees) backed by CVC DIF (19B infrastructure fund). Data center sales = long sales cycles selling to CIOs, IT Directors, and VPs of Infrastructure at mid-market enterprises in healthcare, finance, energy, and manufacturing. CEO Jim Buie emphasizes having fun as a core value. This is NOT a high-volume SDR role — it is consultative, relationship-driven infrastructure sales. Three data center locations: St. George UT, Oklahoma City OK, Boise ID.',
 'No standardized SDR mock call — likely scenario-based consultative selling discussion',
 ARRAY['Why data centers? Why infrastructure?', 'How would you explain colocation to a CIO who is considering public cloud?', 'Tell me about a time you built a long-term client relationship', 'What do you know about our three data center locations and target industries?', 'How would you prospect into a mid-market healthcare or finance company about disaster recovery?', 'What is the difference between colocation, managed private cloud, and public cloud?'],
 ARRAY['Not understanding data center basics — colocation, cloud, connectivity (their C3)', 'Treating this like a high-volume SaaS SDR role — it is consultative and relationship-driven', 'Not knowing about the recent rebrand from Tonaquint', 'No knowledge of their target industries: healthcare, finance, energy, manufacturing', 'Not understanding compliance requirements (HIPAA for healthcare, SOC 2, PCI for finance)'],
 ARRAY['This is a small, fast-growing company backed by a 19B infrastructure fund (CVC DIF) — reference the growth trajectory', 'Know the C3: Colocation, Cloud (managed private cloud on OpenStack via Platform9), Connectivity (Cloud Connect)', 'CEO Jim Buie has 30+ years in data center and cloud — read his Authority Magazine interview for talking points', 'Their differentiator is serving mid-market enterprises in emerging US markets (not competing with hyperscalers in tier-1 cities)', 'Target industries are healthcare, finance, energy, and manufacturing — each has specific compliance needs', 'Boise campus is their newest and is anchored by a Fortune 50 tech company — this is a growth signal', 'Company culture emphasizes being client-driven and having fun — align your energy', 'They offer 100% medical/dental/vision premiums paid by the company — strong benefits for a small company', 'Sales likely involves a channel/partner component — VP of Channel Sales is a key leader', 'Prepare to discuss hybrid cloud, disaster recovery, and business continuity — their core use cases', 'Since they are small, your interview will likely involve senior leadership directly — treat it as both an interview AND a reverse discovery call'],
 NULL, 'Competitive base + commission (not publicly disclosed)', 'Not publicly disclosed', NULL, NULL, NULL, NULL,
 'SDR → AE → Channel Sales (small company = faster path with more responsibility)',
 ARRAY['Small company with limited public interview data — ask detailed questions about team structure, quota expectations, and growth plans', 'Recently rebranded — internal processes may still be evolving'],
 'infrastructure');
