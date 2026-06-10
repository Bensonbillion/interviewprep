-- pgTAP tests for the entitlements table introduced in migration 046.
-- Two concerns this suite covers:
--   1. RLS: an authenticated user can only SELECT their own entitlements
--      rows; another authenticated user sees zero rows from the same
--      service-role insert.
--   2. has_entitlement(): the SQL function's scope-aware decision logic
--      matches the TypeScript checkAccess() unit tests — pass covers
--      everything, full_interview covers all actions at its company,
--      single_round does NOT cross rounds or cover live_mode.
--
-- Helpers come from supabase-test-helpers (vendored in supabase/seed.sql).

BEGIN;

SELECT plan(12);

-- ── Users ────────────────────────────────────────────────────────────────────
SELECT tests.create_supabase_user('alice', 'alice_ent@test.com');
SELECT tests.create_supabase_user('bob',   'bob_ent@test.com');

-- ── Service-role inserts (bypass RLS for setup) ──────────────────────────────
SET LOCAL role = 'service_role';

-- alice: single_round at Samsara, hiring_manager round
INSERT INTO public.entitlements (user_id, type, company_scope, round_scope)
VALUES (tests.get_supabase_uid('alice'), 'single_round', 'Samsara', 'hiring_manager');

-- alice: full_interview at Motive (covers all rounds + live_mode at Motive)
INSERT INTO public.entitlements (user_id, type, company_scope)
VALUES (tests.get_supabase_uid('alice'), 'full_interview', 'Motive');

-- bob: search_pass valid for 30 days
INSERT INTO public.entitlements (user_id, type, expires_at)
VALUES (tests.get_supabase_uid('bob'), 'search_pass', now() + interval '30 days');

-- ── 1: RLS — alice sees her own two rows ─────────────────────────────────────
SELECT tests.authenticate_as('alice');

SELECT is(
  (SELECT count(*)::int FROM public.entitlements),
  2,
  'alice can read her own two entitlements via the entitlements_select_own policy'
);

-- ── 2: RLS — alice sees NONE of bob's entitlements ───────────────────────────
SELECT is(
  (SELECT count(*)::int FROM public.entitlements
     WHERE user_id = tests.get_supabase_uid('bob')),
  0,
  'alice cannot read bob entitlements (RLS scoping enforced)'
);

-- ── 3: RLS — bob sees only his one row ───────────────────────────────────────
SELECT tests.authenticate_as('bob');

SELECT is(
  (SELECT count(*)::int FROM public.entitlements),
  1,
  'bob can read his own entitlements (1 row)'
);

-- ── 4: RLS — bob sees NONE of alice's entitlements ───────────────────────────
SELECT is(
  (SELECT count(*)::int FROM public.entitlements
     WHERE user_id = tests.get_supabase_uid('alice')),
  0,
  'bob cannot read alice entitlements (RLS scoping enforced from the other side)'
);

-- ── has_entitlement() exercises ──────────────────────────────────────────────
-- SECURITY DEFINER, so we can call it from any authenticated context.

-- ── 5: search_pass covers a kit at any company ───────────────────────────────
SELECT ok(
  public.has_entitlement(tests.get_supabase_uid('bob'), 'kit', 'AnyCompany', 'recruiter'),
  'search_pass covers a kit at an arbitrary company/round'
);

-- ── 6: search_pass covers live_mode (which single_round does not) ────────────
SELECT ok(
  public.has_entitlement(tests.get_supabase_uid('bob'), 'live_mode', NULL, NULL),
  'search_pass covers live_mode with no company/round scope required'
);

-- ── 7: full_interview at Motive covers any round at Motive ───────────────────
SELECT ok(
  public.has_entitlement(tests.get_supabase_uid('alice'), 'unlock', 'Motive', 'panel'),
  'full_interview at Motive covers an unlock at a different round in Motive'
);

-- ── 8: full_interview at Motive covers live_mode at Motive ───────────────────
SELECT ok(
  public.has_entitlement(tests.get_supabase_uid('alice'), 'live_mode', 'Motive', NULL),
  'full_interview at Motive covers live_mode at Motive'
);

-- ── 9: full_interview at Motive does NOT cover Samsara at a round alice doesn't own ──
SELECT ok(
  NOT public.has_entitlement(tests.get_supabase_uid('alice'), 'unlock', 'Samsara', 'recruiter'),
  'full_interview at Motive does NOT cover Samsara at a round alice has no single_round for'
);

-- ── 10: single_round at (Samsara, hiring_manager) covers an unlock there ─────
SELECT ok(
  public.has_entitlement(tests.get_supabase_uid('alice'), 'unlock', 'Samsara', 'hiring_manager'),
  'single_round at (Samsara, hiring_manager) covers an unlock at (Samsara, hiring_manager)'
);

-- ── 11: single_round at (Samsara, hiring_manager) does NOT cover recruiter ───
SELECT ok(
  NOT public.has_entitlement(tests.get_supabase_uid('alice'), 'unlock', 'Samsara', 'recruiter'),
  'single_round at (Samsara, hiring_manager) does NOT cross-cover the recruiter round'
);

-- ── 12: single_round does NOT cover live_mode even on the matching round ─────
SELECT ok(
  NOT public.has_entitlement(tests.get_supabase_uid('alice'), 'live_mode', 'Samsara', 'hiring_manager'),
  'single_round at (Samsara, hiring_manager) does NOT cover live_mode'
);

SELECT * FROM finish();

ROLLBACK;
