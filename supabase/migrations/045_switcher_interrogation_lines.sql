-- ─── Switcher + fallback interrogation_lines on positioning_briefs ─────────
--
-- v4 (migration 042) wrote interrogation_lines onto competitive_dynamics —
-- a per-(anchor, target) cache. That works for competitive positioning
-- types, but switcher / early_career briefs have competitive_dynamic_id
-- NULL and therefore had nowhere to keep interrogation_lines. The Insight
-- Interview was silently auto-skipped for those sessions.
--
-- This migration gives the brief its own jsonb column for lines that are
-- per-session (switcher synthesis) or per-session-fallback (degraded
-- engine paths). Read precedence in the GET route is:
--   competitive_dynamics.interrogation_lines (cacheable, cross-session)
--   → positioning_briefs.fallback_interrogation_lines (per-session)
--   → []
--
-- interrogation_source is persisted so the route can render honest UI
-- copy without inferring — switcher-synthesized lines and static-fallback
-- lines both live in fallback_interrogation_lines, but only the fallback
-- case gets the "we couldn't fully research this matchup" header.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE positioning_briefs
  ADD COLUMN IF NOT EXISTS fallback_interrogation_lines jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE positioning_briefs
  ADD COLUMN IF NOT EXISTS interrogation_source text NOT NULL DEFAULT 'competitive'
    CHECK (interrogation_source IN ('competitive', 'switcher', 'fallback'));

COMMENT ON COLUMN positioning_briefs.fallback_interrogation_lines IS
  'Per-session interrogation_lines used when competitive_dynamic_id is NULL: switcher / early_career synthesis output, or static fallbacks when the engine could not run. Same shape as competitive_dynamics.interrogation_lines. Always read AFTER the dynamic-joined lines.';

COMMENT ON COLUMN positioning_briefs.interrogation_source IS
  'Where the interrogation lines surfaced to the candidate originated. competitive = joined from competitive_dynamics; switcher = synthesizeSwitcherBrief output (Haiku); fallback = static set served because the engine could not run. Drives honest UI copy on /get-started/insight.';
