-- Enable required extensions
create extension if not exists "vector" with schema public;
create extension if not exists "uuid-ossp" with schema public;

-- ─── Enums ────────────────────────────────────────────────────────────────────

create type role_type as enum ('sdr_bdr', 'account_executive', 'account_manager_csm', 'other_sales');
create type interview_stage as enum ('recruiter', 'hiring_manager', 'role_play', 'panel');
create type background_type as enum ('career_switcher', 'experienced_sales', 'new_grad', 'other');
create type answer_type as enum (
  'tell_me_about_yourself',
  'why_sales',
  'why_this_company',
  'behavioral_star',
  'comp_expectations',
  'role_play_script',
  'objection_response',
  'company_brief',
  'cheat_sheet',
  'questions_to_ask',
  'coachability_coaching',
  'career_switcher_bridge'
);
create type company_source as enum ('firecrawl', 'raw_fetch', 'manual');
create type content_source_type as enum ('knowledge_base', 'user_resume', 'company_research');
create type processing_status as enum ('pending', 'processing', 'completed', 'failed');
create type transaction_type as enum ('free_grant', 'purchase', 'spend', 'refund', 'admin_grant');

-- ─── Tables ───────────────────────────────────────────────────────────────────

-- Users (extends Supabase auth.users)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  credit_balance integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Parsed resumes
create table parsed_resumes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete set null,
  raw_text text not null,
  personal_info jsonb not null default '{}',
  roles jsonb not null default '[]',
  skills jsonb not null default '[]',
  education jsonb not null default '[]',
  background_type background_type not null default 'other',
  narrative_summary text not null default '',
  storage_path text, -- Supabase Storage path for the original file
  created_at timestamptz not null default now()
);

-- Company profiles (cached 30 days)
create table company_profiles (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  company_url text,
  profile_data jsonb not null default '{}',
  source company_source not null default 'manual',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  unique (company_name)
);

-- Prep sessions
create table prep_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete set null,
  resume_id uuid references parsed_resumes(id) on delete set null,
  company_id uuid references company_profiles(id) on delete set null,
  job_description text not null,
  target_role text not null,
  role_type role_type not null default 'sdr_bdr',
  stage interview_stage not null,
  relevance_map jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Generated answers (one row per answer slot)
create table generated_answers (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references prep_sessions(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  answer_type answer_type not null,
  content text not null,
  metadata jsonb not null default '{}',
  rating smallint check (rating in (-1, 0, 1)), -- -1 thumbs down, 0 none, 1 thumbs up
  status processing_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- Credit transactions (audit log)
create table credit_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  amount integer not null, -- positive = credit added, negative = credit spent
  transaction_type transaction_type not null,
  reference_id uuid, -- session_id or answer_id that caused the spend
  description text,
  created_at timestamptz not null default now()
);

-- Knowledge documents (for pgvector RAG)
create table knowledge_documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text not null,
  source_type content_source_type not null default 'knowledge_base',
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Knowledge chunks (embeddings)
create table knowledge_chunks (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index knowledge_chunks_embedding_idx on knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table users enable row level security;
alter table parsed_resumes enable row level security;
alter table company_profiles enable row level security;
alter table prep_sessions enable row level security;
alter table generated_answers enable row level security;
alter table credit_transactions enable row level security;
alter table knowledge_documents enable row level security;
alter table knowledge_chunks enable row level security;

-- Users: only read/update own row
create policy "users_select_own" on users for select using (auth.uid() = id);
create policy "users_update_own" on users for update using (auth.uid() = id);

-- Parsed resumes: own or anonymous (user_id null)
create policy "resumes_select_own" on parsed_resumes for select
  using (user_id = auth.uid() or user_id is null);
create policy "resumes_insert" on parsed_resumes for insert with check (true);
create policy "resumes_update_own" on parsed_resumes for update using (user_id = auth.uid());

-- Company profiles: readable by all authenticated, writable by service role
create policy "company_profiles_select" on company_profiles for select using (true);
create policy "company_profiles_insert" on company_profiles for insert with check (true);
create policy "company_profiles_update" on company_profiles for update using (true);

-- Prep sessions: own only
create policy "sessions_select_own" on prep_sessions for select
  using (user_id = auth.uid() or user_id is null);
create policy "sessions_insert" on prep_sessions for insert with check (true);
create policy "sessions_update_own" on prep_sessions for update
  using (user_id = auth.uid() or user_id is null);

-- Generated answers: own only
create policy "answers_select_own" on generated_answers for select
  using (user_id = auth.uid() or user_id is null);
create policy "answers_insert" on generated_answers for insert with check (true);
create policy "answers_update_own" on generated_answers for update
  using (user_id = auth.uid() or user_id is null);

-- Credit transactions: own only
create policy "credits_select_own" on credit_transactions for select using (user_id = auth.uid());
create policy "credits_insert" on credit_transactions for insert with check (true);

-- Knowledge: readable by all
create policy "knowledge_docs_select" on knowledge_documents for select using (true);
create policy "knowledge_chunks_select" on knowledge_chunks for select using (true);

-- ─── Database Functions ───────────────────────────────────────────────────────

-- Atomic credit spend: returns true if successful, false if insufficient
create or replace function spend_credit(
  p_user_id uuid,
  p_answer_id uuid,
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

-- Add credits (purchase or admin grant)
create or replace function add_credits(
  p_user_id uuid,
  p_amount integer,
  p_transaction_type transaction_type default 'purchase',
  p_description text default 'Credit purchase'
) returns void
language plpgsql
security definer
as $$
begin
  update users set credit_balance = credit_balance + p_amount, updated_at = now()
  where id = p_user_id;

  insert into credit_transactions (user_id, amount, transaction_type, description)
  values (p_user_id, p_amount, p_transaction_type, p_description);
end;
$$;

-- pgvector cosine similarity search for knowledge retrieval
create or replace function search_knowledge(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
) returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    kc.id,
    kc.document_id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity
  from knowledge_chunks kc
  where 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Auto-create user row on auth signup
create or replace function handle_new_user() returns trigger
language plpgsql
security definer
as $$
begin
  insert into users (id, email, credit_balance)
  values (new.id, new.email, 3)
  on conflict (id) do nothing;

  insert into credit_transactions (user_id, amount, transaction_type, description)
  values (new.id, 3, 'free_grant', 'Welcome — 3 free credits');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Updated-at trigger helper ─────────────────────────────────────────────────

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at before update on users
  for each row execute function set_updated_at();
create trigger sessions_updated_at before update on prep_sessions
  for each row execute function set_updated_at();
