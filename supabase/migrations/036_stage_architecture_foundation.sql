-- 036: Stage architecture foundation
-- Additive-only — does NOT break existing sessions.
-- Legacy sessions (stage_type IS NULL) continue using old UI.

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION A — Stage type enum (may already exist from manual SQL)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stage_type') THEN
    CREATE TYPE stage_type AS ENUM (
      'conversational',
      'deep_dive',
      'skills_demo',
      'take_home',
      'presentation_defense',
      'panel_executive'
    );
  END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION B — Additive columns on prep_sessions (idempotent)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prep_sessions' AND column_name = 'stage_type'
  ) THEN
    ALTER TABLE prep_sessions ADD COLUMN stage_type TEXT DEFAULT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prep_sessions' AND column_name = 'stage_name'
  ) THEN
    ALTER TABLE prep_sessions ADD COLUMN stage_name TEXT DEFAULT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prep_sessions' AND column_name = 'stage_order'
  ) THEN
    ALTER TABLE prep_sessions ADD COLUMN stage_order INTEGER DEFAULT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prep_sessions' AND column_name = 'parent_session_id'
  ) THEN
    ALTER TABLE prep_sessions ADD COLUMN parent_session_id UUID REFERENCES prep_sessions(id) ON DELETE SET NULL DEFAULT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prep_sessions' AND column_name = 'take_home_content'
  ) THEN
    ALTER TABLE prep_sessions ADD COLUMN take_home_content JSONB DEFAULT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prep_sessions' AND column_name = 'take_home_submission_text'
  ) THEN
    ALTER TABLE prep_sessions ADD COLUMN take_home_submission_text TEXT DEFAULT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prep_sessions' AND column_name = 'intel_collected'
  ) THEN
    ALTER TABLE prep_sessions ADD COLUMN intel_collected BOOLEAN DEFAULT FALSE;
  END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION C — User voice profiles (per-user writing samples)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  samples JSONB NOT NULL DEFAULT '[]'::jsonb,
  style_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  voice_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_voice_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_voice_profiles' AND policyname = 'users_own_voice_profile'
  ) THEN
    CREATE POLICY "users_own_voice_profile"
      ON user_voice_profiles FOR ALL TO authenticated
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END
$$;

-- Updated-at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'user_voice_profiles_updated_at'
  ) THEN
    CREATE TRIGGER user_voice_profiles_updated_at
      BEFORE UPDATE ON user_voice_profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION D — Company interview intel stage enrichment
-- Add stage_type column if not present
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_interview_intel' AND column_name = 'stage_type'
  ) THEN
    ALTER TABLE company_interview_intel ADD COLUMN stage_type TEXT DEFAULT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_interview_intel' AND column_name = 'stage_name'
  ) THEN
    ALTER TABLE company_interview_intel ADD COLUMN stage_name TEXT DEFAULT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_interview_intel' AND column_name = 'typical_order'
  ) THEN
    ALTER TABLE company_interview_intel ADD COLUMN typical_order INTEGER DEFAULT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_interview_intel' AND column_name = 'format_notes'
  ) THEN
    ALTER TABLE company_interview_intel ADD COLUMN format_notes TEXT DEFAULT NULL;
  END IF;
END
$$;
