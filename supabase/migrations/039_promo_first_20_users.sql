-- ─── Promo: First 20 users get 10 free credits instead of 3 ─────────────────
--
-- After 20 users have signed up, new users revert to 3 free credits.
-- This is self-contained in the trigger — no app code changes needed.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_user_count integer;
  v_credits integer;
  v_msg text;
begin
  -- Resolve email from multiple places (handles OAuth metadata differences)
  v_email := coalesce(
    new.email,
    new.raw_user_meta_data->>'email',
    ''
  );

  -- Count existing users to determine promo eligibility
  select count(*) into v_user_count from public.users;

  -- First 20 users get 10 credits, everyone after gets 3
  if v_user_count < 20 then
    v_credits := 10;
    v_msg := 'Welcome — 10 free credits (early adopter bonus!)';
  else
    v_credits := 3;
    v_msg := 'Welcome — 3 free credits';
  end if;

  -- Upsert the user profile row (safe for re-runs and re-logins)
  insert into public.users (id, email, credit_balance)
  values (new.id, v_email, v_credits)
  on conflict (id) do nothing;

  -- Only grant welcome credits the first time this user is created
  if found then
    insert into public.credit_transactions (user_id, amount, transaction_type, description)
    values (new.id, v_credits, 'free_grant', v_msg);
  end if;

  return new;

exception when others then
  -- Log but NEVER block authentication — user can always sign in
  raise warning 'handle_new_user: skipped profile creation for uid=% err=%', new.id, sqlerrm;
  return new;
end;
$$;
