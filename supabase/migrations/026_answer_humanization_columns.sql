-- answer_versions is created in migration 003 without humanization columns.
-- The previous CREATE TABLE IF NOT EXISTS was a no-op (table already exists),
-- so the new columns were never added and the COMMENT statements failed.
-- Use ALTER TABLE with IF NOT EXISTS for true idempotence.

ALTER TABLE answer_versions
  ADD COLUMN IF NOT EXISTS answer_raw TEXT,
  ADD COLUMN IF NOT EXISTS answer_humanized TEXT,
  ADD COLUMN IF NOT EXISTS was_humanized BOOLEAN DEFAULT false;

ALTER TABLE answer_versions ENABLE ROW LEVEL SECURITY;

-- Policy already created in migration 003; drop-and-recreate is idempotent.
DROP POLICY IF EXISTS "Service role only" ON answer_versions;
CREATE POLICY "Service role only" ON answer_versions
  FOR ALL USING (FALSE);

COMMENT ON COLUMN answer_versions.answer_raw IS
  'Original AI-generated answer before humanization pass (encrypted).';
COMMENT ON COLUMN answer_versions.answer_humanized IS
  'Answer after humanization refinement pass (encrypted). NULL if humanization was skipped.';
COMMENT ON COLUMN answer_versions.was_humanized IS
  'Whether this answer went through the humanization pipeline.';
