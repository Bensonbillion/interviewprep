-- pgTAP tests for credit functions: spend_credit() and add_credits().
-- Helpers come from supabase-test-helpers (vendored in supabase/seed.sql).
--
-- Reminders for future maintainers:
--   * tests.create_supabase_user(identifier, email?) — first arg is a label,
--     second is the optional email. Look up the user later with
--     tests.get_supabase_uid(identifier).
--   * spend_credit(user_id, answer_id uuid, description text) returns boolean.
--     It deducts exactly one credit and returns false (not raises) if the
--     balance is already zero.
--   * Default credit_balance for new users is 3, but the handle_new_user
--     trigger overwrites it to 10 for the first 20 users (early-adopter
--     promo) — these tests pin the balance explicitly so they don't depend
--     on the global user count.

BEGIN;

SELECT plan(8);

-- ── Setup ────────────────────────────────────────────────────────────────────
SELECT tests.create_supabase_user('credit_test_user', 'credit_test@test.com');
SELECT tests.authenticate_as('credit_test_user');

-- Pin the balance to 5 so assertions don't depend on the promo trigger.
UPDATE public.users
   SET credit_balance = 5
 WHERE id = tests.get_supabase_uid('credit_test_user');

-- ── 1: starting balance is what we set ───────────────────────────────────────
SELECT is(
  (SELECT credit_balance FROM public.users
     WHERE id = tests.get_supabase_uid('credit_test_user')),
  5,
  'User starts with 5 credits after explicit set'
);

-- ── 2: spend_credit returns true when balance is sufficient ──────────────────
SELECT ok(
  (SELECT spend_credit(
            tests.get_supabase_uid('credit_test_user'),
            uuid_generate_v4(),
            'pgtap: spend test'
          )),
  'spend_credit returns true when balance >= 1'
);

-- ── 3: balance decreased by exactly one ──────────────────────────────────────
SELECT is(
  (SELECT credit_balance FROM public.users
     WHERE id = tests.get_supabase_uid('credit_test_user')),
  4,
  'Balance decreases by one after a single spend'
);

-- ── 4: a credit_transactions row is inserted on spend ────────────────────────
SELECT is(
  (SELECT count(*)::integer FROM public.credit_transactions
     WHERE user_id = tests.get_supabase_uid('credit_test_user')
       AND amount = -1
       AND transaction_type = 'spend'),
  1,
  'spend_credit logs exactly one credit_transactions row with amount=-1'
);

-- ── 5: spend_credit returns false when balance reaches zero ──────────────────
-- Drain to zero, then attempt another spend.
UPDATE public.users
   SET credit_balance = 0
 WHERE id = tests.get_supabase_uid('credit_test_user');

SELECT is(
  (SELECT spend_credit(
            tests.get_supabase_uid('credit_test_user'),
            uuid_generate_v4(),
            'pgtap: overspend test'
          )),
  false,
  'spend_credit returns false when balance is 0'
);

-- ── 6: balance unchanged after a failed spend ────────────────────────────────
SELECT is(
  (SELECT credit_balance FROM public.users
     WHERE id = tests.get_supabase_uid('credit_test_user')),
  0,
  'Balance unchanged after failed spend'
);

-- ── 7: add_credits raises balance ────────────────────────────────────────────
SELECT add_credits(
  tests.get_supabase_uid('credit_test_user'),
  7,
  'purchase'::transaction_type,
  'pgtap: add_credits test'
);

SELECT is(
  (SELECT credit_balance FROM public.users
     WHERE id = tests.get_supabase_uid('credit_test_user')),
  7,
  'add_credits increases balance by amount'
);

-- ── 8: add_credits logs a credit_transactions row ────────────────────────────
SELECT is(
  (SELECT count(*)::integer FROM public.credit_transactions
     WHERE user_id = tests.get_supabase_uid('credit_test_user')
       AND amount = 7
       AND transaction_type = 'purchase'),
  1,
  'add_credits logs a credit_transactions row with the amount and type'
);

SELECT * FROM finish();
ROLLBACK;
