-- Add resume_json column to prep_sessions for storing the security-hardened
-- extracted resume (grounded facts only, no raw user text).

ALTER TABLE prep_sessions
  ADD COLUMN IF NOT EXISTS resume_json JSONB;

COMMENT ON COLUMN prep_sessions.resume_json IS
  'Security-hardened extracted resume JSON. Used by answer generation instead of raw resume text. See extract-resume.ts.';
