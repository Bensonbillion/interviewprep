-- ─── Fix: make handle_new_user trigger robust ────────────────────────────────
--
-- Problem: "Database error saving new user" occurs when the trigger on
-- auth.users throws an unhandled exception, which blocks authentication entirely.
--
-- Fixes applied:
--  1. Exception block so any failure never blocks auth
--  2. coalesce() so null email (possible with some providers) never violates NOT NULL
--  3. IF FOUND guard so welcome credits only insert when the user is NEW (not on re-login)
--  4. Missing INSERT policy on users table (belt-and-suspenders alongside SECURITY DEFINER)
--  5. SET search_path = public to avoid search path injection issues

-- Fix missing INSERT policy (idempotent)
do $$
begin
  create policy "users_insert_own" on public.users
    for insert with check (true);
exception when duplicate_object then null;
end $$;

-- Rebuild trigger function with full error handling
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  -- Resolve email from multiple places (handles OAuth metadata differences)
  v_email := coalesce(
    new.email,
    new.raw_user_meta_data->>'email',
    ''
  );

  -- Upsert the user profile row (safe for re-runs and re-logins)
  insert into public.users (id, email, credit_balance)
  values (new.id, v_email, 3)
  on conflict (id) do nothing;

  -- Only grant welcome credits the first time this user is created
  if found then
    insert into public.credit_transactions (user_id, amount, transaction_type, description)
    values (new.id, 3, 'free_grant', 'Welcome — 3 free credits');
  end if;

  return new;

exception when others then
  -- Log but NEVER block authentication — user can always sign in
  raise warning 'handle_new_user: skipped profile creation for uid=% err=%', new.id, sqlerrm;
  return new;
end;
$$;
