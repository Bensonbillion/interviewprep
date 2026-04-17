-- 037: Session interviewers table (may already exist from manual SQL)
-- Stores researched interviewer profiles per prep session.

CREATE TABLE IF NOT EXISTS session_interviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES prep_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  linkedin_url TEXT,
  profile_data JSONB DEFAULT '{}'::jsonb,
  researched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE session_interviewers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'session_interviewers' AND policyname = 'users_own_session_interviewers'
  ) THEN
    CREATE POLICY "users_own_session_interviewers"
      ON session_interviewers FOR ALL TO authenticated
      USING (
        session_id IN (
          SELECT id FROM prep_sessions WHERE user_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        session_id IN (
          SELECT id FROM prep_sessions WHERE user_id = (SELECT auth.uid())
        )
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_session_interviewers_session
  ON session_interviewers (session_id);
