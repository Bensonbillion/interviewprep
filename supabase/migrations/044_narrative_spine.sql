-- ─── Narrative Spine ────────────────────────────────────────────────────────
--
-- One per-session synthesis of the candidate's coherent interview narrative.
-- Built once from /api/insight-interview/complete, after the Positioning
-- Engine and the Insight Interview have finished. Every answer card reads
-- the spine so the kit reads as one person's coherent story.
--
-- The unique(session_id) + upsert pattern makes regeneration idempotent —
-- running buildNarrativeSpine again for a session replaces the row cleanly.
-- Nothing auto-rebuilds: the spine is generated once at /complete and that
-- snapshot governs the kit. A future "regenerate kit" admin action can call
-- buildNarrativeSpine again as a thin wrapper.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS narrative_spines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES prep_sessions(id) ON DELETE CASCADE,

  core_thesis text NOT NULL,
  signature_proof_points jsonb NOT NULL DEFAULT '[]',
  competitive_truths jsonb NOT NULL DEFAULT '[]',
  company_hook text,
  -- {type: positioning_type, frame_statement: string}
  positioning_frame jsonb NOT NULL DEFAULT '{}',
  narrative_risks jsonb NOT NULL DEFAULT '[]',

  -- Provenance — what the spine was assembled from. Useful for debugging
  -- and for the eventual rebuild action.
  built_from jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT narrative_spines_session_unique UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_narrative_spines_session
  ON narrative_spines (session_id);

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE narrative_spines ENABLE ROW LEVEL SECURITY;

-- The spine is internal scaffolding, not shown to candidates directly —
-- but the admin / debug surfaces (and a future "regenerate kit" UI) need
-- to read it client-side. Match positioning_briefs: user reads own,
-- service-role writes.
DROP POLICY IF EXISTS "narrative_spines_select_own" ON narrative_spines;
CREATE POLICY "narrative_spines_select_own"
  ON narrative_spines FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM prep_sessions WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "narrative_spines_insert_service" ON narrative_spines;
CREATE POLICY "narrative_spines_insert_service"
  ON narrative_spines FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "narrative_spines_update_service" ON narrative_spines;
CREATE POLICY "narrative_spines_update_service"
  ON narrative_spines FOR UPDATE TO service_role USING (true);

DROP POLICY IF EXISTS "narrative_spines_delete_service" ON narrative_spines;
CREATE POLICY "narrative_spines_delete_service"
  ON narrative_spines FOR DELETE TO service_role USING (true);

DROP POLICY IF EXISTS "narrative_spines_select_service" ON narrative_spines;
CREATE POLICY "narrative_spines_select_service"
  ON narrative_spines FOR SELECT TO service_role USING (true);
