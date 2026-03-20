-- 030: Session persistence — store full PrepSession as JSONB blob
-- Enables cross-device / cross-tab session recovery via Supabase fallback.

-- 1. Add 'take_home' to the interview_stage enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'take_home'
      AND enumtypid = 'interview_stage'::regtype
  ) THEN
    ALTER TYPE interview_stage ADD VALUE 'take_home';
  END IF;
END
$$;

-- 2. Add session_data JSONB column to prep_sessions
-- (company_name and interview_date live inside session_data, not as standalone columns)
ALTER TABLE prep_sessions
  ADD COLUMN IF NOT EXISTS session_data jsonb;

-- 3. Index for dashboard queries: newest sessions per user
CREATE INDEX IF NOT EXISTS idx_prep_sessions_user_created
  ON prep_sessions (user_id, created_at DESC);
