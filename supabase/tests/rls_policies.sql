-- pgTAP tests for row-level security policies on user-owned tables.
-- Helpers come from supabase-test-helpers (vendored in supabase/seed.sql).
--
-- Reminders for future maintainers:
--   * tests.create_supabase_user(identifier, email?) — first arg is a label,
--     second is the optional email. Look up the user later with
--     tests.get_supabase_uid(identifier). Earlier versions of this file
--     passed the email as the identifier and a password as the email,
--     which made the second user fail with users_email_partial_key.
--   * is_empty / isnt_empty take a query string and check the row count.
--     For UPDATE/DELETE policy checks, append RETURNING 1 so RLS-filtered
--     statements return zero rows.
--   * Tables this file omits on purpose:
--       - voice_profiles (was renamed to user_voice_profiles)
--       - stage_debriefs (does not exist in the current schema)

BEGIN;

SELECT plan(11);

-- ── Setup: two distinct users ────────────────────────────────────────────────
SELECT tests.create_supabase_user('rls_user_a', 'rls_user_a@test.com');
SELECT tests.create_supabase_user('rls_user_b', 'rls_user_b@test.com');

-- ── 1–6: RLS is enabled on every user-owned table ───────────────────────────
SELECT tests.rls_enabled('public', 'prep_sessions');
SELECT tests.rls_enabled('public', 'generated_answers');
SELECT tests.rls_enabled('public', 'parsed_resumes');
SELECT tests.rls_enabled('public', 'credit_transactions');
SELECT tests.rls_enabled('public', 'user_voice_profiles');
SELECT tests.rls_enabled('public', 'session_interviewers');

-- ── User A creates a prep session ────────────────────────────────────────────
SELECT tests.authenticate_as('rls_user_a');

INSERT INTO public.prep_sessions (
  user_id, job_description, target_role, role_type, stage
) VALUES (
  tests.get_supabase_uid('rls_user_a'),
  'pgtap test job description',
  'pgtap test role',
  'sdr_bdr',
  'recruiter'
);

-- ── 7: User B cannot see User A's session ───────────────────────────────────
SELECT tests.authenticate_as('rls_user_b');

SELECT is_empty(
  $$ SELECT id FROM public.prep_sessions
       WHERE user_id = tests.get_supabase_uid('rls_user_a') $$,
  'User B cannot see User A''s prep sessions'
);

-- ── 8: User A can see their own session ─────────────────────────────────────
SELECT tests.authenticate_as('rls_user_a');

SELECT isnt_empty(
  $$ SELECT id FROM public.prep_sessions
       WHERE user_id = tests.get_supabase_uid('rls_user_a') $$,
  'User A can see their own prep sessions'
);

-- ── 9: User B cannot update User A's user row (credit_balance) ──────────────
SELECT tests.authenticate_as('rls_user_b');

SELECT is_empty(
  $$ UPDATE public.users
       SET credit_balance = 9999
     WHERE id = tests.get_supabase_uid('rls_user_a')
     RETURNING 1 $$,
  'User B cannot update User A''s credit_balance (RLS filters the row)'
);

-- ── 10: User B cannot delete User A's prep session ──────────────────────────
SELECT is_empty(
  $$ DELETE FROM public.prep_sessions
       WHERE user_id = tests.get_supabase_uid('rls_user_a')
     RETURNING 1 $$,
  'User B cannot delete User A''s prep sessions'
);

-- ── 11: anonymous role cannot read prep_sessions ────────────────────────────
SET LOCAL ROLE anon;

SELECT is_empty(
  $$ SELECT id FROM public.prep_sessions $$,
  'Anonymous role cannot read prep_sessions'
);

SELECT * FROM finish();
ROLLBACK;
