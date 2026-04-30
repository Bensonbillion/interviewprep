-- Migration 006: Golden Examples — Authenticity Markers + Red Flag Version

ALTER TABLE golden_examples
  ADD COLUMN IF NOT EXISTS authenticity_markers TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS red_flag_version TEXT,
  ADD COLUMN IF NOT EXISTS red_flag_why TEXT;

-- Update match_golden_examples to return new columns.
-- Drop first because the RETURNS TABLE shape changes vs migration 003,
-- and Postgres rejects CREATE OR REPLACE when the return type differs.
DROP FUNCTION IF EXISTS match_golden_examples(VECTOR(1536), INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION match_golden_examples(
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 3,
  filter_question_key TEXT DEFAULT NULL,
  filter_role TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  question_text TEXT,
  answer_text TEXT,
  framework TEXT,
  quality_score DECIMAL,
  authenticity_markers TEXT[],
  red_flag_version TEXT,
  red_flag_why TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ge.id,
    ge.question_text,
    ge.answer_text,
    ge.framework,
    ge.quality_score,
    ge.authenticity_markers,
    ge.red_flag_version,
    ge.red_flag_why,
    1 - (ge.embedding <=> query_embedding) AS similarity
  FROM golden_examples ge
  WHERE ge.is_active = TRUE
    AND ge.quality_score >= 8
    AND ge.embedding IS NOT NULL
    AND (filter_question_key IS NULL OR ge.question_key = filter_question_key)
    AND (filter_role IS NULL OR ge.role_type = filter_role OR ge.role_type IS NULL)
  ORDER BY ge.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Seed: first golden example (no embedding yet — will be generated on first use)
INSERT INTO golden_examples (
  question_key, role_type, round_type, question_text, answer_text,
  framework, quality_score, source,
  authenticity_markers, red_flag_version, red_flag_why
) VALUES (
  'behavioral_star', 'sdr_bdr', 'hiring_manager',
  'Tell me about a time you exceeded your quota.',
  'So Q3 last year I ended up at 142% of target, which honestly surprised even me. What happened was — so we had just lost our two biggest enterprise accounts, right, and my territory was basically starting from scratch. I spent the first two weeks doing nothing but research — like literally mapping out 200 accounts in Salesforce, scoring them based on technographic data from ZoomInfo, and then I built these hyper-personalized sequences in Outreach for the top 40. The thing that actually made the difference though was I started leaving voicemails that referenced specific things I found on their 10-K or their job postings — like, if they were hiring a data engineer, I would mention that in the VM because it signals they are scaling. My connect rate went from like 3% to 11%. Not every call converted obviously, but the ones that did were way more qualified.',
  'STAR', 10, 'admin_written',
  ARRAY['first_person_dominant', 'specific_metric_142_percent', 'named_tools_salesforce_zoominfo_outreach', 'complication_lost_enterprise_accounts', 'sensory_detail_literally_mapping_200_accounts', 'decision_reasoning_why_voicemail_approach', 'imprecision_acknowledgment_like_3_percent'],
  'In Q3 I exceeded my quota significantly. Our team worked really hard and we implemented a new outreach strategy that improved our results. Through better research and personalization, we were able to increase our connect rates and ultimately surpass our targets. I believe this demonstrates my ability to drive results even in challenging situations.',
  'No specific numbers beyond "significantly". Uses "we" and "our team" instead of "I". No named tools. No complications or obstacles. No decision reasoning. No sensory details. Sounds like a LinkedIn post. An interviewer asks "What specifically did you do?" and this person has nothing to add.'
)
ON CONFLICT DO NOTHING;
