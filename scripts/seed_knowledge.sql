-- Step 0: Ensure migration 003 tables exist
CREATE EXTENSION IF NOT EXISTS vector;

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

CREATE TABLE IF NOT EXISTS admin_knowledge_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Embeddings will be NULL when inserted via SQL.
-- They must be generated separately via the seed script after schema cache is refreshed.
-- The RAG system requires embeddings for retrieval.

-- Step 1: Insert knowledge sources (without embeddings)
-- After inserting, run the TS seed script to generate embeddings.

INSERT INTO knowledge_sources (id, title, description, source_type, category, tags, status, chunk_count)
SELECT '6ce89cea-e40d-4117-9c5d-dcbf5b538c53', 'Samsara Value Driver Framework - Complete', 'Three Samsara value drivers with Before/After scenarios, negative consequences, positive business outcomes, required capabilities, and metrics.', 'text_paste', 'sales_methodology', ARRAY['samsara','value_drivers','command_of_message','fleet_safety','interview_prep'], 'ready', 0
WHERE NOT EXISTS (SELECT 1 FROM knowledge_sources WHERE title = 'Samsara Value Driver Framework - Complete');

INSERT INTO knowledge_sources (id, title, description, source_type, category, tags, status, chunk_count)
SELECT '853adddb-7245-4133-86b4-d40b74ecb037', 'Samsara Reduce Risk - Customer Proof Points', 'Real customer case studies proving Samsara Reduce Risk value driver outcomes.', 'text_paste', 'company_research', ARRAY['samsara','proof_points','reduce_risk','case_studies','interview_prep'], 'ready', 0
WHERE NOT EXISTS (SELECT 1 FROM knowledge_sources WHERE title = 'Samsara Reduce Risk - Customer Proof Points');

INSERT INTO knowledge_sources (id, title, description, source_type, category, tags, status, chunk_count)
SELECT '7e284e4d-5b49-482f-9b5f-542a1df2d113', 'Samsara Trap-Setting Discovery Questions - Complete', 'Trap-setting questions positioning Samsara defensible differentiators as buyer requirements.', 'text_paste', 'sales_methodology', ARRAY['samsara','trap_questions','discovery','command_of_message','interview_prep','role_play'], 'ready', 0
WHERE NOT EXISTS (SELECT 1 FROM knowledge_sources WHERE title = 'Samsara Trap-Setting Discovery Questions - Complete');

INSERT INTO knowledge_sources (id, title, description, source_type, category, tags, status, chunk_count)
SELECT 'bd526635-b288-4f6f-ac1b-98b3625ce88b', 'Samsara Discovery Call Talk Tracks - Word for Word', 'Word-for-word discovery call talk tracks for Samsara AE interviews.', 'text_paste', 'sales_methodology', ARRAY['samsara','talk_tracks','discovery','command_of_message','interview_prep','role_play','pain_quantification'], 'ready', 0
WHERE NOT EXISTS (SELECT 1 FROM knowledge_sources WHERE title = 'Samsara Discovery Call Talk Tracks - Word for Word');

INSERT INTO knowledge_sources (id, title, description, source_type, category, tags, status, chunk_count)
SELECT '02f0fe50-0239-4506-a07d-6aa3f08db346', 'Samsara AE Interview Scoring Framework - Luke OConnor', 'Exact scoring criteria for Samsara AE mock discovery call interviews.', 'text_paste', 'interview_guide', ARRAY['samsara','scoring_rubric','hiring_manager','mock_call','interview_prep','role_play'], 'ready', 0
WHERE NOT EXISTS (SELECT 1 FROM knowledge_sources WHERE title = 'Samsara AE Interview Scoring Framework - Luke OConnor');

INSERT INTO knowledge_sources (id, title, description, source_type, category, tags, status, chunk_count)
SELECT 'fcc3f289-aae4-4884-b614-ae14b92c8832', 'Construction Fleet Safety - Industry Context for Samsara', 'Construction industry fleet safety context for Samsara AE interviews.', 'text_paste', 'company_research', ARRAY['samsara','construction','fleet_safety','industry_context','interview_prep'], 'ready', 0
WHERE NOT EXISTS (SELECT 1 FROM knowledge_sources WHERE title = 'Construction Fleet Safety - Industry Context for Samsara');

INSERT INTO knowledge_sources (id, title, description, source_type, category, tags, status, chunk_count)
SELECT '36b274cc-1c6a-463a-ab40-1a57425beffc', 'Samsara Best Call Tool - All Persona Cards', 'Complete Samsara Best Call Tool cards for Commercial and Enterprise segments.', 'text_paste', 'sales_methodology', ARRAY['samsara','call_tool','persona_cards','discovery_questions','interview_prep','cold_call','opening_statements'], 'ready', 0
WHERE NOT EXISTS (SELECT 1 FROM knowledge_sources WHERE title = 'Samsara Best Call Tool - All Persona Cards');

INSERT INTO knowledge_sources (id, title, description, source_type, category, tags, status, chunk_count)
SELECT 'aa8fa314-a443-44be-9ddf-aaceaafe874b', 'Samsara Differentiators and The Mantra Technique', 'Samsara seven differentiators with customer value and defensibility. Plus Command of Message Mantra technique.', 'text_paste', 'sales_methodology', ARRAY['samsara','differentiators','the_mantra','command_of_message','competitive','interview_prep'], 'ready', 0
WHERE NOT EXISTS (SELECT 1 FROM knowledge_sources WHERE title = 'Samsara Differentiators and The Mantra Technique');

-- Done. Now reload PostgREST schema cache in Supabase Dashboard,
-- then run: npx tsx scripts/seed-samsara-knowledge.ts
-- The script will skip existing sources and only add chunks with embeddings.
