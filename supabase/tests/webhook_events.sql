-- pgTAP for migration 047:
--   • webhook_events RLS (service-role only)
--   • partial UNIQUE on entitlements.source_stripe_session
--   • atomic transactional fulfillment: failure in entitlements insert
--     rolls back the webhook_events row so Stripe's retry can re-fire
--   • dedup hit returns status='duplicate' and does NOT insert a second
--     entitlement
--   • legacy grant_credits_from_stripe behaves the same way
--
-- Mirrors the user's explicit Session 3 verification ask:
--   "a webhook test where the entitlement insert is forced to fail →
--    assert 500 AND no webhook_events row persisted (retry works)"

BEGIN;

SELECT plan(11);

-- ── Setup ────────────────────────────────────────────────────────────────────
SELECT tests.create_supabase_user('webhook_test_alice', 'alice_w@test.com');
SELECT tests.create_supabase_user('webhook_test_bob',   'bob_w@test.com');

SET LOCAL role = 'service_role';

-- ── 1. RLS: webhook_events is invisible to authenticated users ───────────────
INSERT INTO public.webhook_events (stripe_event_id, event_type)
VALUES ('evt_visible_test', 'checkout.session.completed');

SELECT tests.authenticate_as('webhook_test_alice');

SELECT is(
  (SELECT count(*)::int FROM public.webhook_events),
  0,
  'authenticated user has no SELECT policy on webhook_events — returns 0 rows'
);

-- Back to service_role for the rest of the tests.
SET LOCAL role = 'service_role';

-- ── 2. grant_entitlement_from_stripe happy path: granted ─────────────────────
WITH r AS (
  SELECT public.grant_entitlement_from_stripe(
    'evt_full_interview_1',
    'checkout.session.completed',
    tests.get_supabase_uid('webhook_test_alice'),
    'full_interview',
    'Samsara',
    NULL,
    'cs_full_interview_1',
    30
  ) AS result
)
SELECT is(
  (SELECT result->>'status' FROM r),
  'granted',
  'grant_entitlement_from_stripe returns status=granted on first call'
);

-- ── 3. entitlement row was actually inserted ────────────────────────────────
SELECT is(
  (SELECT count(*)::int FROM public.entitlements
   WHERE user_id = tests.get_supabase_uid('webhook_test_alice')
     AND source_stripe_session = 'cs_full_interview_1'),
  1,
  'entitlements row was inserted for the granted session'
);

-- ── 4. webhook_events row was also inserted (atomic with the entitlement) ───
SELECT is(
  (SELECT count(*)::int FROM public.webhook_events
   WHERE stripe_event_id = 'evt_full_interview_1'),
  1,
  'webhook_events row was inserted in the same transaction'
);

-- ── 5. Dedup: re-fire the same event id → status=duplicate, no extra rows ──
WITH r AS (
  SELECT public.grant_entitlement_from_stripe(
    'evt_full_interview_1',
    'checkout.session.completed',
    tests.get_supabase_uid('webhook_test_alice'),
    'full_interview',
    'Samsara',
    NULL,
    'cs_full_interview_DUPLICATE',
    30
  ) AS result
)
SELECT is(
  (SELECT result->>'status' FROM r),
  'duplicate',
  'identical event id → status=duplicate'
);

SELECT is(
  (SELECT count(*)::int FROM public.entitlements
   WHERE source_stripe_session = 'cs_full_interview_DUPLICATE'),
  0,
  'no second entitlement was created on dedup hit'
);

-- ── 6. Partial UNIQUE on entitlements.source_stripe_session catches a
--      DIFFERENT event id pointing at the SAME checkout session. This is the
--      structural double-grant protection from amendment D. The function
--      raises and the txn rolls back — including the new webhook_events row.
SELECT throws_ok(
  $$ SELECT public.grant_entitlement_from_stripe(
       'evt_full_interview_DIFFERENT',
       'checkout.session.completed',
       tests.get_supabase_uid('webhook_test_alice'),
       'full_interview',
       'Samsara',
       NULL,
       'cs_full_interview_1',  -- SAME stripe session id as above
       30
     ) $$,
  '23505',
  NULL,
  'different event id, same stripe session → unique_violation on entitlements'
);

-- ── 7. The "evt_full_interview_DIFFERENT" event must NOT have a row in
--      webhook_events — proves the txn rolled back (Stripe retries cleanly).
SELECT is(
  (SELECT count(*)::int FROM public.webhook_events
   WHERE stripe_event_id = 'evt_full_interview_DIFFERENT'),
  0,
  'failed fulfillment rolled back the webhook_events row (no zombie event id)'
);

-- ── 8. Force entitlement insert failure via a CHECK violation (search_pass
--      with missing expires_at handled via passing a bad type). Easier: ask
--      for type='full_interview' but pass NULL company_scope — fails the
--      entitlements_full_interview_shape CHECK.
SELECT throws_ok(
  $$ SELECT public.grant_entitlement_from_stripe(
       'evt_bad_shape',
       'checkout.session.completed',
       tests.get_supabase_uid('webhook_test_bob'),
       'full_interview',
       NULL,   -- missing company_scope violates the shape CHECK
       NULL,
       'cs_bad_shape',
       30
     ) $$,
  '23514',
  NULL,
  'bad entitlement shape raises (CHECK constraint), txn rolls back'
);

-- ── 9. and webhook_events for that event id is also absent (rollback verified) ─
SELECT is(
  (SELECT count(*)::int FROM public.webhook_events
   WHERE stripe_event_id = 'evt_bad_shape'),
  0,
  'CHECK-failed insert rolled back webhook_events row too'
);

-- ── 10. search_pass expires_at is created_at + p_pass_days ──────────────────
WITH r AS (
  SELECT public.grant_entitlement_from_stripe(
    'evt_pass_1',
    'checkout.session.completed',
    tests.get_supabase_uid('webhook_test_bob'),
    'search_pass',
    NULL,
    NULL,
    'cs_pass_1',
    30
  ) AS result
)
SELECT ok(
  ((SELECT (result->>'expires_at')::timestamptz FROM r)
   BETWEEN now() + interval '29 days' AND now() + interval '31 days'),
  'search_pass expires_at lands in [now()+29d, now()+31d]'
);

-- ── 11. Legacy grant_credits_from_stripe dedup ──────────────────────────────
-- Use credit_purchases row by going through the legacy RPC twice.
WITH first AS (
  SELECT public.grant_credits_from_stripe(
    'evt_legacy_1',
    'checkout.session.completed',
    tests.get_supabase_uid('webhook_test_bob'),
    'cs_legacy_1', 'pi_legacy_1', 'starter', 8, 1600, 'usd'
  ) AS r
), second AS (
  SELECT public.grant_credits_from_stripe(
    'evt_legacy_1',     -- same event id
    'checkout.session.completed',
    tests.get_supabase_uid('webhook_test_bob'),
    'cs_legacy_2', 'pi_legacy_2', 'starter', 8, 1600, 'usd'
  ) AS r
)
SELECT is(
  (SELECT r->>'status' FROM second),
  'duplicate',
  'legacy RPC dedups on event id the same way'
);

SELECT * FROM finish();

ROLLBACK;
