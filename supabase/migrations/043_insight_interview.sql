-- ─── Insight Interview ──────────────────────────────────────────────────────
--
-- Captures the candidate's STAR-shaped answers to the interrogation_lines
-- produced by the Positioning Engine. These are the lived, specific
-- competitive truths only the candidate can provide — the primary input
-- to downstream answer generation.
--
-- One row per (session, interrogation_line). The line is identified by
-- its index in competitive_dynamics.interrogation_lines plus a
-- denormalized copy of the question text, so a captured answer survives
-- a cache refresh that reorders the array.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS captured_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES prep_sessions(id) ON DELETE CASCADE,

  -- Which interrogation line this answers. Keyed by index PLUS the
  -- denormalized question + star_slot_hint so an answer survives a
  -- competitive_dynamics cache refresh that reorders the array.
  interrogation_line_index int NOT NULL,
  interrogation_question text NOT NULL,
  star_slot_hint text NOT NULL,

  -- The candidate's answer.
  raw_answer text,
  drilled_answer text,
  -- The answer downstream answer-generation reads:
  -- drilled_answer if the follow-up was taken, else raw_answer.
  final_answer text,

  -- Evaluation.
  -- 'unanswered' | 'thin' | 'substantive'
  answer_quality text NOT NULL DEFAULT 'unanswered'
    CHECK (answer_quality IN ('unanswered', 'thin', 'substantive')),
  -- {s,t,a,r: boolean} — which STAR slots the answer fills.
  star_coverage jsonb,
  -- The single sharp follow-up shown to the candidate when answer was thin.
  follow_up_question text,
  follow_up_dismissed boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT captured_insights_session_line_unique
    UNIQUE (session_id, interrogation_line_index)
);

CREATE INDEX IF NOT EXISTS idx_captured_insights_session
  ON captured_insights (session_id);

-- ─── Session-level Insight Interview stage tracking ─────────────────────────
-- 'pending' | 'in_progress' | 'completed' | 'skipped'
-- No existing column on prep_sessions tracks this stage — confirmed in
-- Phase 0 item 3. (intel_collected boolean from 036 is for interviewer
-- intel, a different domain.)
ALTER TABLE prep_sessions
  ADD COLUMN IF NOT EXISTS insight_interview_status text
    NOT NULL DEFAULT 'pending'
    CHECK (insight_interview_status IN ('pending', 'in_progress', 'completed', 'skipped'));

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE captured_insights ENABLE ROW LEVEL SECURITY;

-- Candidate reads + writes their own session's captured insights.
-- Matches the (select auth.uid()) pattern used across prep-scoped tables.
DROP POLICY IF EXISTS "captured_insights_select_own" ON captured_insights;
CREATE POLICY "captured_insights_select_own"
  ON captured_insights FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM prep_sessions WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "captured_insights_insert_own" ON captured_insights;
CREATE POLICY "captured_insights_insert_own"
  ON captured_insights FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT id FROM prep_sessions WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "captured_insights_update_own" ON captured_insights;
CREATE POLICY "captured_insights_update_own"
  ON captured_insights FOR UPDATE
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM prep_sessions WHERE user_id = (SELECT auth.uid())
    )
  );

-- Service-role full access — explicit per the project convention of
-- greppable grants rather than implicit bypass.
DROP POLICY IF EXISTS "captured_insights_select_service" ON captured_insights;
CREATE POLICY "captured_insights_select_service"
  ON captured_insights FOR SELECT TO service_role USING (true);

DROP POLICY IF EXISTS "captured_insights_insert_service" ON captured_insights;
CREATE POLICY "captured_insights_insert_service"
  ON captured_insights FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "captured_insights_update_service" ON captured_insights;
CREATE POLICY "captured_insights_update_service"
  ON captured_insights FOR UPDATE TO service_role USING (true);

DROP POLICY IF EXISTS "captured_insights_delete_service" ON captured_insights;
CREATE POLICY "captured_insights_delete_service"
  ON captured_insights FOR DELETE TO service_role USING (true);
