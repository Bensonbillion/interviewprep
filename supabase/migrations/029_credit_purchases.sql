-- Stripe purchase tracking table.
-- Credits are delivered via the existing add_credits() RPC.

CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent TEXT,
  pack_id TEXT NOT NULL,
  credits_added INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON credit_purchases
  FOR SELECT USING (auth.uid() = user_id);
