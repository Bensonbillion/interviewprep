-- ─── Positioning Engine — v4 reshape ────────────────────────────────────────
--
-- v3.1's competitive_dynamics emitted finished claims ("competitive_truths")
-- the candidate would carry into an interview without owning the underlying
-- specifics. v4 replaces that with two categorically different outputs:
--
--   substantiated_facts  — sourced, defensible claims about the company(ies).
--                          Safe to state; do not depend on candidate experience.
--   interrogation_lines  — sharp, STAR-shaped questions pointed at the candidate.
--                          The engine reasons toward the right question rather
--                          than asserting an answer it cannot know.
--
-- 041 has not yet been written to by any engine code (research.ts is not built
-- in 041's scope) so the column swap is data-safe. Ships as a separate
-- migration because 041 may have already been applied to dev environments.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE competitive_dynamics
  DROP COLUMN IF EXISTS competitive_truths;

ALTER TABLE competitive_dynamics
  ADD COLUMN IF NOT EXISTS substantiated_facts jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS interrogation_lines jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN competitive_dynamics.truths_refreshed_at IS
  'Freshness of the time-sensitive synthesis output (substantiated_facts + interrogation_lines). 30-day TTL. Column name retained from 041 as legacy shorthand.';

COMMENT ON COLUMN competitive_dynamics.substantiated_facts IS
  'JSONB array of {fact, about: target|anchor|both, use_in: AnswerType[], source, source_type, confidence}. Company-level claims only — never about candidate experience.';

COMMENT ON COLUMN competitive_dynamics.interrogation_lines IS
  'JSONB array of {question, why_it_matters, targets: AnswerType[], star_slot_hint, hypothesis, directionality_note}. Sharp questions for the candidate; never claims.';
