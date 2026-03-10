-- Create answer_versions table (from 003) + humanization columns
CREATE TABLE IF NOT EXISTS answer_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  answer_type TEXT NOT NULL,
  content TEXT NOT NULL,
  generation_type TEXT DEFAULT 'initial' CHECK (generation_type IN ('initial', 'regen', 'edit')),
  quick_action TEXT,
  prompt_version_id UUID,
  knowledge_chunk_ids UUID[],
  golden_example_ids UUID[],
  answer_raw TEXT,
  answer_humanized TEXT,
  was_humanized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE answer_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON answer_versions
  FOR ALL USING (FALSE);

COMMENT ON COLUMN answer_versions.answer_raw IS
  'Original AI-generated answer before humanization pass (encrypted).';
COMMENT ON COLUMN answer_versions.answer_humanized IS
  'Answer after humanization refinement pass (encrypted). NULL if humanization was skipped.';
COMMENT ON COLUMN answer_versions.was_humanized IS
  'Whether this answer went through the humanization pipeline.';
