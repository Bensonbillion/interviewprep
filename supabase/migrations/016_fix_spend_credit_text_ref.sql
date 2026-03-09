-- Fix spend_credit: accept text reference_id instead of uuid
-- This allows passing descriptive references like "unlock-{sessionId}-{type}"

-- Update credit_transactions.reference_id to text
alter table credit_transactions alter column reference_id type text using reference_id::text;

-- Recreate spend_credit with text parameter
create or replace function spend_credit(
  p_user_id uuid,
  p_answer_id text,
  p_description text default 'Answer generation'
) returns boolean
language plpgsql
security definer
as $$
declare
  v_balance integer;
begin
  -- Lock the user row
  select credit_balance into v_balance
  from users
  where id = p_user_id
  for update;

  if v_balance is null or v_balance < 1 then
    return false;
  end if;

  -- Deduct credit
  update users set credit_balance = credit_balance - 1, updated_at = now()
  where id = p_user_id;

  -- Log transaction
  insert into credit_transactions (user_id, amount, transaction_type, reference_id, description)
  values (p_user_id, -1, 'spend', p_answer_id, p_description);

  return true;
end;
$$;
