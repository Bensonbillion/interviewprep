-- ============================================================
-- Migration 003: Admin Knowledge Bank
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- KNOWLEDGE SOURCES
-- ============================================================

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('file_upload', 'url', 'text_paste')),
  original_url TEXT,
  file_path TEXT,
  raw_content TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'sales_methodology', 'interview_guide', 'objection_handling',
    'role_guide', 'company_research', 'general'
  )),
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;

-- Admin-only access (service role bypasses RLS)
CREATE POLICY "Admin access only" ON knowledge_sources
  FOR ALL USING (FALSE);

-- ============================================================
-- KNOWLEDGE CHUNKS (admin-managed, from knowledge_sources)
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_knowledge_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access only" ON admin_knowledge_chunks
  FOR ALL USING (FALSE);

-- Vector similarity index
CREATE INDEX IF NOT EXISTS idx_admin_knowledge_chunks_embedding
  ON admin_knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- GOLDEN EXAMPLES
-- ============================================================

CREATE TABLE IF NOT EXISTS golden_examples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_key TEXT NOT NULL,
  role_type TEXT CHECK (role_type IN ('sdr_bdr', 'account_executive', 'account_manager_csm', 'other_sales')),
  round_type TEXT CHECK (round_type IN ('recruiter', 'hiring_manager', 'role_play', 'panel')),
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  framework TEXT CHECK (framework IN ('STAR', 'SPIN', 'narrative', 'direct', 'other')),
  quality_score INTEGER NOT NULL DEFAULT 8 CHECK (quality_score >= 0 AND quality_score <= 10),
  notes TEXT,
  source TEXT DEFAULT 'admin_written',
  embedding VECTOR(1536),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE golden_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access only" ON golden_examples
  FOR ALL USING (FALSE);

CREATE INDEX IF NOT EXISTS idx_golden_examples_embedding
  ON golden_examples USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- ============================================================
-- VOICE PROFILE
-- ============================================================

CREATE TABLE IF NOT EXISTS voice_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Default',
  description TEXT,
  tone_keywords TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE voice_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access only" ON voice_profile
  FOR ALL USING (FALSE);

-- ============================================================
-- STYLE RULES
-- ============================================================

CREATE TABLE IF NOT EXISTS style_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voice_id UUID REFERENCES voice_profile(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('banned_phrase', 'replacement', 'instruction')),
  rule_text TEXT NOT NULL,
  replacement TEXT,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('error', 'warning')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE style_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access only" ON style_rules
  FOR ALL USING (FALSE);

-- ============================================================
-- PROMPT VERSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  question_key TEXT,
  prompt_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  test_results JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access only" ON prompt_versions
  FOR ALL USING (FALSE);

-- ============================================================
-- ANSWER VERSIONS (for quality dashboard)
-- ============================================================

CREATE TABLE IF NOT EXISTS answer_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  answer_type TEXT NOT NULL,
  content TEXT NOT NULL,
  generation_type TEXT DEFAULT 'initial' CHECK (generation_type IN ('initial', 'regen', 'edit')),
  quick_action TEXT,
  prompt_version_id UUID REFERENCES prompt_versions(id),
  knowledge_chunk_ids UUID[],
  golden_example_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE answer_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON answer_versions
  FOR ALL USING (FALSE);

-- ============================================================
-- ANSWER FEEDBACK (for quality dashboard)
-- ============================================================

CREATE TABLE IF NOT EXISTS answer_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  answer_type TEXT NOT NULL,
  answer_version_id UUID REFERENCES answer_versions(id),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down', 'copy')),
  issue_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE answer_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON answer_feedback
  FOR ALL USING (FALSE);

-- ============================================================
-- SIMILARITY SEARCH FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.5,
  filter_category TEXT DEFAULT NULL,
  filter_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    akc.id,
    akc.source_id,
    akc.content,
    1 - (akc.embedding <=> query_embedding) AS similarity,
    akc.metadata
  FROM admin_knowledge_chunks akc
  JOIN knowledge_sources ks ON akc.source_id = ks.id
  WHERE ks.status = 'ready'
    AND (filter_category IS NULL OR ks.category = filter_category)
    AND (filter_tags IS NULL OR ks.tags && filter_tags)
    AND akc.embedding IS NOT NULL
    AND 1 - (akc.embedding <=> query_embedding) > match_threshold
  ORDER BY akc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

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

-- ============================================================
-- DEFAULT VOICE PROFILE SEED
-- ============================================================

INSERT INTO voice_profile (name, description, tone_keywords, is_active)
VALUES (
  'SalesPrep Coach',
  'A confident, specific sales coach who speaks from experience. Never generic. Every sentence has a specific detail — a metric, a company name, a concrete action. Encouraging but not patronizing. Writes like a top-performing AE talks, not like a resume or a LinkedIn post.',
  ARRAY['confident', 'specific', 'encouraging', 'direct'],
  TRUE
) ON CONFLICT DO NOTHING;

-- ============================================================
-- DEFAULT STYLE RULES SEED
-- Run AFTER voice_profile exists
-- ============================================================

DO $$
DECLARE
  v_voice_id UUID;
BEGIN
  SELECT id INTO v_voice_id FROM voice_profile WHERE is_active = TRUE LIMIT 1;

  IF v_voice_id IS NOT NULL THEN
    INSERT INTO style_rules (voice_id, rule_type, rule_text, replacement) VALUES
      (v_voice_id, 'banned_phrase', 'passionate about', 'use specific action verbs'),
      (v_voice_id, 'banned_phrase', 'I thrive in', 'describe what you actually did'),
      (v_voice_id, 'banned_phrase', 'excited to leverage', 'state the specific value'),
      (v_voice_id, 'banned_phrase', 'dynamic environment', 'name the environment type'),
      (v_voice_id, 'banned_phrase', 'team player', 'give a team achievement example'),
      (v_voice_id, 'banned_phrase', 'results-driven', 'cite the actual result'),
      (v_voice_id, 'banned_phrase', 'proven track record', 'state the specific track'),
      (v_voice_id, 'instruction', 'Never start an answer with "Absolutely" or "Great question"', NULL),
      (v_voice_id, 'instruction', 'Use specific non-round numbers (138%, $1.4M, 4.2) instead of round numbers (140%, $1.5M, 4)', NULL),
      (v_voice_id, 'instruction', 'Reference the target company''s actual product name in "Why This Company" answers', NULL),
      (v_voice_id, 'instruction', 'Keep answers under 4 paragraphs for all questions except Company Research Brief', NULL)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
