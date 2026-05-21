-- ─── Positioning Engine ─────────────────────────────────────────────────────
--
-- Adds two tables that compute the candidate→target-company relationship
-- ("positioning") once per session and cache the expensive company-vs-company
-- competitive intel globally.
--
--   competitive_dynamics  — global cache, keyed on (anchor, target).
--                           Describes how two COMPANIES relate. Does NOT
--                           carry a positioning_type — the same pair can
--                           be direct_competitor for one candidate and
--                           adjacent_player for another.
--   positioning_briefs    — per-session. Layers the candidate-specific
--                           bits (positioning_type, anchor_employer,
--                           candidate-specific company_hook) on top.
--
-- NOTE (drift): an earlier draft of this migration added a nullable
-- `competitors text[]` column to company_interview_intel as the
-- classifier's Signal 1, seeded with Samsara's competitor list. The live
-- DB's company_interview_intel is a stage-keyed table that does not
-- match the repo's migration history (no company_name / company_name_
-- normalized columns), so the column add + seed were dropped from this
-- migration. Signal 1 was removed from the classifier; the engine now
-- uses CompanyProfile.competitors (auto-generated) + Haiku fallback. See
-- src/lib/positioning/classify.ts.
-- ────────────────────────────────────────────────────────────────────────────

-- ─── Enums ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'positioning_type') THEN
    CREATE TYPE positioning_type AS ENUM (
      'direct_competitor',
      'adjacent_player',
      'ecosystem',
      'category_switcher',
      'industry_switcher',
      'early_career'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'positioning_research_depth') THEN
    CREATE TYPE positioning_research_depth AS ENUM (
      'none',
      'minimal',
      'moderate',
      'comprehensive'
    );
  END IF;
END $$;

-- ─── 1. competitive_dynamics ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS competitive_dynamics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anchor_company_id uuid NOT NULL REFERENCES company_profiles(id),
  target_company_id uuid NOT NULL REFERENCES company_profiles(id),

  competitive_relationship text,
  target_company_wedge text,
  anchor_company_wedge text,

  -- [{point, detail, confidence}]
  where_target_wins jsonb DEFAULT '[]'::jsonb,
  where_anchor_wins jsonb DEFAULT '[]'::jsonb,

  -- ["persona", ...]
  shared_buyers jsonb DEFAULT '[]'::jsonb,

  -- [{truth, use_in, framing_note, source, source_type, confidence}]
  -- Dropped + replaced by substantiated_facts + interrogation_lines in 042.
  competitive_truths jsonb DEFAULT '[]'::jsonb,

  research_depth positioning_research_depth NOT NULL DEFAULT 'none',
  -- [{url, title, source_type}]
  sources jsonb DEFAULT '[]'::jsonb,
  raw_research jsonb,

  -- Split TTL — company-level intel is stable for 90d, truths for 30d.
  intel_refreshed_at timestamptz NOT NULL DEFAULT now(),
  truths_refreshed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT competitive_dynamics_pair_unique
    UNIQUE (anchor_company_id, target_company_id)
);

CREATE INDEX IF NOT EXISTS idx_competitive_dynamics_pair
  ON competitive_dynamics (anchor_company_id, target_company_id);

-- ─── 2. positioning_briefs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS positioning_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES prep_sessions(id) ON DELETE CASCADE,

  positioning_type positioning_type NOT NULL,
  anchor_employer text,
  anchor_employer_role text,
  classification_reasoning text,
  classification_confidence numeric,
  classification_signal text
    CHECK (classification_signal IN (
      'company_profile_competitors',
      'haiku_classification'
    )),

  -- NULL for switcher / early-career types.
  competitive_dynamic_id uuid REFERENCES competitive_dynamics(id),

  -- [{from, to, why_it_maps}] — switcher types only
  transferable_bridges jsonb DEFAULT '[]'::jsonb,
  domain_gap_to_close text,

  -- Always populated. Candidate-specific, not cacheable.
  company_hook text,

  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_positioning_briefs_session_unique
  ON positioning_briefs (session_id);

-- ─── 3. RLS ───────────────────────────────────────────────────────────────
ALTER TABLE positioning_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_dynamics ENABLE ROW LEVEL SECURITY;

-- positioning_briefs: a user reads their own session's brief.
DROP POLICY IF EXISTS "positioning_briefs_select_own" ON positioning_briefs;
CREATE POLICY "positioning_briefs_select_own"
  ON positioning_briefs FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM prep_sessions
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Writes (insert/update/delete) are service-role only via the admin
-- client. Match the codebase convention of explicit service_role policies
-- rather than relying on implicit bypass — keeps grants greppable.
DROP POLICY IF EXISTS "positioning_briefs_insert_service" ON positioning_briefs;
CREATE POLICY "positioning_briefs_insert_service"
  ON positioning_briefs FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "positioning_briefs_update_service" ON positioning_briefs;
CREATE POLICY "positioning_briefs_update_service"
  ON positioning_briefs FOR UPDATE
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "positioning_briefs_delete_service" ON positioning_briefs;
CREATE POLICY "positioning_briefs_delete_service"
  ON positioning_briefs FOR DELETE
  TO service_role
  USING (true);

-- competitive_dynamics: internal shared cache. Service-role only —
-- authenticated users only ever see this data joined through their own
-- positioning_brief. RLS enabled with explicit service policies; no
-- authenticated policy is created.
DROP POLICY IF EXISTS "competitive_dynamics_select_service" ON competitive_dynamics;
CREATE POLICY "competitive_dynamics_select_service"
  ON competitive_dynamics FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "competitive_dynamics_insert_service" ON competitive_dynamics;
CREATE POLICY "competitive_dynamics_insert_service"
  ON competitive_dynamics FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "competitive_dynamics_update_service" ON competitive_dynamics;
CREATE POLICY "competitive_dynamics_update_service"
  ON competitive_dynamics FOR UPDATE
  TO service_role
  USING (true);
