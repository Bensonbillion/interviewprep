-- ─── Stripe webhook idempotency + double-grant protection ─────────────────
--
-- Two structural defenses against the same fulfillment running twice. The
-- application-layer code in /api/stripe/webhook reads BOTH and relies on
-- BOTH:
--
--   1. webhook_events   — primary key on stripe_event_id. The webhook
--                          inserts this row in the same SQL transaction
--                          as the entitlement/credit grant. On dedup hit
--                          (PK conflict), the function returns a marker
--                          and the route responds 200 deduplicated. On
--                          any other failure during fulfillment, the
--                          function raises and the entire transaction
--                          rolls back — including the webhook_events row
--                          — so Stripe's 72h retry can re-try cleanly.
--
--   2. entitlements.source_stripe_session — a partial UNIQUE index that
--                          rejects a second entitlement insert for the
--                          same Stripe checkout session. Backstop for the
--                          unlikely case where two webhook handlers run
--                          concurrently and both pass the webhook_events
--                          PK check before either commits.
--
-- Together they are belt-and-braces: webhook_events catches identical
-- event retries (same event.id), the partial UNIQUE catches the rarer
-- case of two different events that point at the same checkout session
-- both being fulfilled in flight.
-- ────────────────────────────────────────────────────────────────────────────

-- ─── 1. webhook_events ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_events (
  stripe_event_id text PRIMARY KEY,
  event_type      text NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at
  ON webhook_events (received_at DESC);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Service-role writes only. There is no authenticated SELECT policy —
-- this table is purely operational and clients never read it.
DROP POLICY IF EXISTS "webhook_events_insert_service" ON webhook_events;
CREATE POLICY "webhook_events_insert_service"
  ON webhook_events FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "webhook_events_select_service" ON webhook_events;
CREATE POLICY "webhook_events_select_service"
  ON webhook_events FOR SELECT
  TO service_role
  USING (true);

-- ─── 2. Partial UNIQUE on entitlements.source_stripe_session ──────────────
-- Backstop against double-grant. NULL is allowed (admin/manual grants);
-- a non-NULL value MUST be unique across the table.
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_source_stripe_session_unique
  ON entitlements (source_stripe_session)
  WHERE source_stripe_session IS NOT NULL;

-- ─── 3. Atomic grant RPCs ─────────────────────────────────────────────────
-- One SQL function per fulfillment path. Each function:
--   • Inserts the webhook_events row.
--   • Performs the business write (entitlement or credit grant).
--   • Returns a result object describing what happened.
--
-- PL/pgSQL functions execute in a single implicit transaction. Any RAISE
-- (uncaught) rolls the entire function back — webhook_events row included.
-- We catch only the unique_violation on webhook_events to recognize dedup;
-- all other failures propagate so the route returns 5xx and Stripe retries.
--
-- The webhook calls one of these RPCs depending on metadata shape:
--   • metadata.tier ∈ {single_round, full_interview, search_pass}
--       → grant_entitlement_from_stripe()
--   • metadata.pack_id + metadata.credits (legacy in-flight events only)
--       → grant_credits_from_stripe()

CREATE OR REPLACE FUNCTION public.grant_entitlement_from_stripe(
  p_event_id       text,
  p_event_type     text,
  p_user_id        uuid,
  p_type           text,             -- 'single_round' | 'full_interview' | 'search_pass'
  p_company_scope  text,             -- nullable
  p_round_scope    text,             -- nullable
  p_stripe_session text,
  p_pass_days      integer DEFAULT 30
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entitlement_id uuid;
  v_expires        timestamptz;
BEGIN
  -- 1) Record the event. Dedup hit → return early; no business write.
  BEGIN
    INSERT INTO webhook_events (stripe_event_id, event_type)
    VALUES (p_event_id, p_event_type);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('status', 'duplicate');
  END;

  -- 2) Compute expires_at for search_pass.
  IF p_type = 'search_pass' THEN
    v_expires := now() + (p_pass_days || ' days')::interval;
  ELSE
    v_expires := NULL;
  END IF;

  -- 3) Insert the entitlement. The partial UNIQUE on source_stripe_session
  --    is a second line of defense; if it fires we let the exception
  --    propagate so the transaction rolls back (including webhook_events).
  INSERT INTO entitlements (
    user_id, type, company_scope, round_scope, source_stripe_session, expires_at
  ) VALUES (
    p_user_id, p_type::entitlement_type, p_company_scope, p_round_scope, p_stripe_session, v_expires
  )
  RETURNING id INTO v_entitlement_id;

  RETURN jsonb_build_object(
    'status', 'granted',
    'entitlement_id', v_entitlement_id,
    'expires_at', v_expires
  );
END;
$$;

COMMENT ON FUNCTION public.grant_entitlement_from_stripe IS
  'Atomic webhook fulfillment for v3 entitlements. Inserts webhook_events + entitlements in one transaction. Returns status=duplicate on dedup hit; any other failure raises and rolls back. Callers must invoke from inside /api/stripe/webhook only.';

-- Legacy fulfillment for credit-pack checkout sessions still in Stripe's
-- 72h retry window from before this deploy. Wraps the existing
-- credit_purchases insert + add_credits RPC in the same transaction as
-- the webhook_events insert. New checkout sessions never send the
-- {pack_id, credits} metadata shape.
CREATE OR REPLACE FUNCTION public.grant_credits_from_stripe(
  p_event_id       text,
  p_event_type     text,
  p_user_id        uuid,
  p_stripe_session text,
  p_payment_intent text,
  p_pack_id        text,
  p_credits        integer,
  p_amount_cents   integer,
  p_currency       text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase_id uuid;
BEGIN
  -- 1) Record the event.
  BEGIN
    INSERT INTO webhook_events (stripe_event_id, event_type)
    VALUES (p_event_id, p_event_type);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('status', 'duplicate');
  END;

  -- 2) Record the purchase (credit_purchases.stripe_session_id is already UNIQUE
  --    from migration 029 — a second insert for the same session also raises).
  INSERT INTO credit_purchases (
    user_id, stripe_session_id, stripe_payment_intent, pack_id,
    credits_added, amount_cents, currency, status
  ) VALUES (
    p_user_id, p_stripe_session, p_payment_intent, p_pack_id,
    p_credits, p_amount_cents, p_currency, 'completed'
  )
  RETURNING id INTO v_purchase_id;

  -- 3) Add credits via the existing RPC. Any failure raises → rollback.
  PERFORM public.add_credits(
    p_user_id, p_credits, 'purchase',
    p_pack_id || ' — ' || p_credits::text || ' credits via Stripe'
  );

  RETURN jsonb_build_object(
    'status', 'granted',
    'purchase_id', v_purchase_id,
    'credits_added', p_credits
  );
END;
$$;

COMMENT ON FUNCTION public.grant_credits_from_stripe IS
  'Atomic webhook fulfillment for LEGACY credit-pack checkout sessions still in Stripe 72h retry window. Wraps webhook_events insert + credit_purchases insert + add_credits in one transaction. Will go quiet once all in-flight legacy events drain (~72h post v3 deploy).';
