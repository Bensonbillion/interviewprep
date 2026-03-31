-- 033: First 10 signups get 10 free credits instead of 3.

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count INTEGER;
  grant_amount INTEGER;
  grant_desc TEXT;
BEGIN
  -- Count existing users to determine if this is an early bird
  SELECT count(*) INTO user_count FROM users;

  IF user_count < 10 THEN
    grant_amount := 10;
    grant_desc := 'Early bird — 10 free credits (first 10 users)';
  ELSE
    grant_amount := 3;
    grant_desc := 'Welcome — 3 free credits';
  END IF;

  INSERT INTO users (id, email, credit_balance)
  VALUES (new.id, new.email, grant_amount)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
  VALUES (new.id, grant_amount, 'free_grant', grant_desc);

  RETURN new;
END;
$$;
