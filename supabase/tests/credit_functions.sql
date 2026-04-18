BEGIN;

SELECT plan(8);

-- Test the spend_credit() DB function
SELECT tests.create_supabase_user('credit_test@test.com', 'password123');
SELECT tests.authenticate_as('credit_test@test.com');

-- Set up user with 5 credits
UPDATE users
SET credits_remaining = 5
WHERE id = tests.get_supabase_uid('credit_test@test.com');

-- Test: spend_credit deducts correctly
SELECT ok(
  (SELECT credits_remaining FROM users
   WHERE id = tests.get_supabase_uid('credit_test@test.com')) = 5,
  'User starts with 5 credits'
);

-- Simulate spending 1 credit
SELECT spend_credit(tests.get_supabase_uid('credit_test@test.com'), 1, 'test_answer_id');

SELECT ok(
  (SELECT credits_remaining FROM users
   WHERE id = tests.get_supabase_uid('credit_test@test.com')) = 4,
  'Credits reduced to 4 after spending 1'
);

-- Test: cannot go below 0
SELECT throws_ok(
  $$ SELECT spend_credit(tests.get_supabase_uid('credit_test@test.com'), 10, 'test') $$,
  'Insufficient credits error thrown when overspending'
);

SELECT ok(
  (SELECT credits_remaining FROM users
   WHERE id = tests.get_supabase_uid('credit_test@test.com')) = 4,
  'Credits unchanged after failed spend attempt'
);

-- Test: new user gets 5 free credits via trigger
SELECT tests.create_supabase_user('newuser_credits@test.com', 'password123');
SELECT ok(
  (SELECT credits_remaining FROM users
   WHERE id = tests.get_supabase_uid('newuser_credits@test.com')) = 5,
  'New user gets 5 free credits automatically'
);

SELECT finish();
ROLLBACK;
