-- Quality check tracking table for monitoring prompt quality over time.

CREATE TABLE IF NOT EXISTS answer_quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID,
  answer_type TEXT,
  issues_found JSONB,
  critical_count INT DEFAULT 0,
  warning_count INT DEFAULT 0,
  was_regenerated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quality_checks_answer_type
  ON answer_quality_checks (answer_type);

CREATE INDEX IF NOT EXISTS idx_quality_checks_created
  ON answer_quality_checks (created_at DESC);

ALTER TABLE answer_quality_checks ENABLE ROW LEVEL SECURITY;

-- Only server-side (service role) writes; no direct user access needed.
-- The table is written via createAdminClient which bypasses RLS.
