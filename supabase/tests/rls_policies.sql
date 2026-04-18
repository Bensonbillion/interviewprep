BEGIN;

SELECT plan(20);

-- Test setup
SELECT tests.create_supabase_user('user_a@test.com', 'password123');
SELECT tests.create_supabase_user('user_b@test.com', 'password123');

-- Verify RLS is enabled on all critical tables
SELECT tests.rls_enabled('public', 'prep_sessions');
SELECT tests.rls_enabled('public', 'generated_answers');
SELECT tests.rls_enabled('public', 'parsed_resumes');
SELECT tests.rls_enabled('public', 'credit_transactions');
SELECT tests.rls_enabled('public', 'voice_profiles');
SELECT tests.rls_enabled('public', 'session_interviewers');
SELECT tests.rls_enabled('public', 'stage_debriefs');

-- Test: User can only see their own prep sessions
SELECT tests.authenticate_as('user_a@test.com');

INSERT INTO prep_sessions (user_id, company_id, resume_id, role_type, stage, stage_type)
VALUES (
  tests.get_supabase_uid('user_a@test.com'),
  uuid_generate_v4(),
  uuid_generate_v4(),
  'sdr_bdr',
  'recruiter',
  'conversational'
);

SELECT tests.authenticate_as('user_b@test.com');

SELECT is_empty(
  $$ SELECT * FROM prep_sessions WHERE user_id = tests.get_supabase_uid('user_a@test.com') $$,
  'User B cannot see User A prep sessions'
);

-- Test: User can see their own prep sessions
SELECT tests.authenticate_as('user_a@test.com');
SELECT isnt_empty(
  $$ SELECT * FROM prep_sessions WHERE user_id = tests.get_supabase_uid('user_a@test.com') $$,
  'User A can see their own prep sessions'
);

-- Test: User cannot update another user's credits
SELECT tests.authenticate_as('user_b@test.com');
SELECT is_empty(
  $$ UPDATE users SET credits_remaining = 9999
     WHERE id = tests.get_supabase_uid('user_a@test.com')
     RETURNING 1 $$,
  'User B cannot update User A credits'
);

-- Test: User cannot delete another user's prep sessions
SELECT tests.authenticate_as('user_b@test.com');
SELECT is_empty(
  $$ DELETE FROM prep_sessions
     WHERE user_id = tests.get_supabase_uid('user_a@test.com')
     RETURNING 1 $$,
  'User B cannot delete User A prep sessions'
);

-- Test: Anonymous user cannot read prep sessions
SET LOCAL ROLE anon;
SELECT is_empty(
  $$ SELECT * FROM prep_sessions $$,
  'Anonymous user cannot read prep sessions'
);

-- Test: Company profiles are readable by all authenticated users (shared cache)
SELECT tests.authenticate_as('user_a@test.com');
SELECT isnt_empty(
  $$ SELECT * FROM company_profiles LIMIT 1 $$,
  'Authenticated users can read company profiles'
);

SELECT finish();
ROLLBACK;
