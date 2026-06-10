-- ─── Entitlements: one-time pay-per-event access ──────────────────────────
--
-- Retires the credit-metering model in NEW code in favor of per-event
-- entitlements. The credits table stays as a legacy READ fallback so
-- grandfathered accounts continue to work; no new code writes credits.
--
-- Three types, mapped to the v3 pricing tiers:
--   • single_round   — $9   one round at one company. Requires both
--                            company_scope AND round_scope. Does NOT cover
--                            Live Mode.
--   • full_interview — $24  all rounds + Live Mode at one company.
--                            Requires company_scope; round_scope MUST be NULL.
--   • search_pass    — $49  unlimited kits for a 30-day window. Requires
--                            expires_at (created_at + 30 days). company_scope
--                            and round_scope MUST be NULL.
--
-- The free preview (defined in Session 4) replaces the signup credit grant
-- for new accounts — not implemented here.
--
-- Scope-resolution rule the application-layer check enforces:
--   Access checks NEVER trust client-supplied company/round/kit. The
--   spend-credit / generate-* / analyze-transcript routes resolve
--   answer_id → kit → (company, stage) entirely server-side from the
--   prep_sessions row before invoking has_entitlement. This is the seam
--   that Session 3 will lean on once Stripe checkout starts creating
--   entitlements instead of credits.
-- ────────────────────────────────────────────────────────────────────────────

-- ─── Enums ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entitlement_type') THEN
    CREATE TYPE entitlement_type AS ENUM (
      'single_round',
      'full_interview',
      'search_pass'
    );
  END IF;
END $$;

-- Reuses the InterviewStage enum already encoded as text elsewhere in the
-- app. Stored as text for forward-compatibility — the app's StageType is
-- richer than the InterviewStage enum and we want to be able to record a
-- single_round entitlement against any stage value the prep flow uses.
-- Validated by a CHECK against the closed set the entitlement model accepts.

-- ─── Table ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  type entitlement_type NOT NULL,

  -- The company this entitlement is scoped to. Stored as the canonical
  -- company name from prep_sessions.session_data.companyName at purchase
  -- time. NULL only for search_pass.
  company_scope text,

  -- For single_round only: which round (matches InterviewStage values:
  -- recruiter / hiring_manager / role_play / panel / take_home). MUST be
  -- NULL for full_interview and search_pass.
  round_scope text,

  -- The Stripe checkout session that minted this entitlement. NULL means
  -- the entitlement was granted out-of-band (admin, refund correction).
  source_stripe_session text,

  -- Pass type only. NULL for single_round and full_interview.
  expires_at timestamptz,

  -- Status. 'active' is the default; 'revoked' for chargebacks / admin
  -- claw-back. Expired passes stay 'active' and are filtered by
  -- has_entitlement based on the timestamp.
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),

  created_at timestamptz NOT NULL DEFAULT now(),

  -- ── Shape invariants ──────────────────────────────────────────────────
  CONSTRAINT entitlements_single_round_shape CHECK (
    type <> 'single_round'
    OR (company_scope IS NOT NULL AND round_scope IS NOT NULL AND expires_at IS NULL)
  ),
  CONSTRAINT entitlements_full_interview_shape CHECK (
    type <> 'full_interview'
    OR (company_scope IS NOT NULL AND round_scope IS NULL AND expires_at IS NULL)
  ),
  CONSTRAINT entitlements_search_pass_shape CHECK (
    type <> 'search_pass'
    OR (company_scope IS NULL AND round_scope IS NULL AND expires_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_entitlements_user_active
  ON entitlements (user_id, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_entitlements_user_company
  ON entitlements (user_id, company_scope)
  WHERE company_scope IS NOT NULL AND status = 'active';

-- ─── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

-- A user reads their own entitlements only.
DROP POLICY IF EXISTS "entitlements_select_own" ON entitlements;
CREATE POLICY "entitlements_select_own"
  ON entitlements FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- All writes are service-role only (Stripe webhook + admin tooling).
DROP POLICY IF EXISTS "entitlements_insert_service" ON entitlements;
CREATE POLICY "entitlements_insert_service"
  ON entitlements FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "entitlements_update_service" ON entitlements;
CREATE POLICY "entitlements_update_service"
  ON entitlements FOR UPDATE
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "entitlements_delete_service" ON entitlements;
CREATE POLICY "entitlements_delete_service"
  ON entitlements FOR DELETE
  TO service_role
  USING (true);

-- ─── has_entitlement() ────────────────────────────────────────────────────
-- Server-side scope-aware access check. Mirrors the TypeScript checkAccess
-- helper in src/lib/entitlements.ts; intended for use from RLS-bypassing
-- contexts (SECURITY DEFINER admin paths) and pgTAP tests.
--
-- Returns true when the user has an active entitlement that covers the
-- requested (company, round) tuple for the requested action. Does NOT
-- fall back to credits — that fallback lives in the application layer
-- so the legacy grandfather behavior is explicit in TypeScript.
--
-- p_action values the function understands:
--   'kit'           — kit generation (needs company; round optional)
--   'unlock'        — per-answer unlock on the prep page (needs company; round optional)
--   'refine'        — regen past FREE_REGENS (needs company; round optional)
--   'custom'        — custom question (needs company; round optional)
--   'live_mode'     — Live Mode features (transcript analysis, etc.)
--                     full_interview + search_pass cover; single_round does NOT.
CREATE OR REPLACE FUNCTION public.has_entitlement(
  p_user_id uuid,
  p_action text,
  p_company text DEFAULT NULL,
  p_round text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  -- Active search_pass covers everything until expiry.
  IF EXISTS (
    SELECT 1 FROM entitlements
    WHERE user_id = p_user_id
      AND type = 'search_pass'
      AND status = 'active'
      AND expires_at > v_now
  ) THEN
    RETURN true;
  END IF;

  -- A company is required for company-scoped checks. Without a company
  -- the only thing that can grant access is a pass (handled above).
  IF p_company IS NULL THEN
    RETURN false;
  END IF;

  -- Active full_interview at this company covers all actions including live_mode.
  IF EXISTS (
    SELECT 1 FROM entitlements
    WHERE user_id = p_user_id
      AND type = 'full_interview'
      AND status = 'active'
      AND company_scope = p_company
  ) THEN
    RETURN true;
  END IF;

  -- Live Mode requires full_interview or search_pass — single_round does NOT cover.
  IF p_action = 'live_mode' THEN
    RETURN false;
  END IF;

  -- Active single_round covers ONLY when both company AND round match.
  -- A single_round purchased for hiring_manager at Samsara does NOT cover
  -- a recruiter round at Samsara.
  IF p_round IS NOT NULL AND EXISTS (
    SELECT 1 FROM entitlements
    WHERE user_id = p_user_id
      AND type = 'single_round'
      AND status = 'active'
      AND company_scope = p_company
      AND round_scope = p_round
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.has_entitlement(uuid, text, text, text) IS
  'Server-side scope-aware entitlement check. Pass-first, then full-interview-at-company, then single-round-at-company-and-round. Live-mode actions reject single_round. Does NOT fall back to credit_balance — credit fallback is enforced in src/lib/entitlements.ts so the grandfather path is explicit in TypeScript.';
