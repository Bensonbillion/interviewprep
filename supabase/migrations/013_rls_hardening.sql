-- ─── RLS Hardening ──────────────────────────────────────────────────────────
--
-- Tightens overly permissive policies from initial migrations.
-- Uses (select auth.uid()) for per-statement caching on large tables.
--
-- Changes:
-- 1. company_profiles: restrict insert/update to service role only
-- 2. parsed_resumes: tighten insert to require matching user_id
-- 3. prep_sessions: tighten insert to require matching user_id
-- 4. generated_answers: tighten insert to require matching user_id
-- 5. credit_transactions: tighten insert to service role only
-- 6. users: tighten insert to service role only (trigger handles creation)
-- 7. knowledge tables: restrict to authenticated users only
-- 8. Upgrade auth.uid() to (select auth.uid()) for performance

-- ─── 1. company_profiles: public read, service-role write ───────────────────

drop policy if exists "company_profiles_insert" on company_profiles;
drop policy if exists "company_profiles_update" on company_profiles;

create policy "company_profiles_insert_service"
  on company_profiles for insert
  to service_role
  with check (true);

create policy "company_profiles_update_service"
  on company_profiles for update
  to service_role
  using (true);

-- ─── 2. parsed_resumes: user can only insert own rows ──────────────────────

drop policy if exists "resumes_insert" on parsed_resumes;

create policy "resumes_insert_own"
  on parsed_resumes for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    or user_id is null
  );

-- Also allow service role (for server-side operations)
create policy "resumes_insert_service"
  on parsed_resumes for insert
  to service_role
  with check (true);

-- ─── 3. prep_sessions: user can only insert own rows ───────────────────────

drop policy if exists "sessions_insert" on prep_sessions;

create policy "sessions_insert_own"
  on prep_sessions for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    or user_id is null
  );

create policy "sessions_insert_service"
  on prep_sessions for insert
  to service_role
  with check (true);

-- ─── 4. generated_answers: user can only insert own rows ───────────────────

drop policy if exists "answers_insert" on generated_answers;

create policy "answers_insert_own"
  on generated_answers for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    or user_id is null
  );

create policy "answers_insert_service"
  on generated_answers for insert
  to service_role
  with check (true);

-- ─── 5. credit_transactions: service role only for inserts ─────────────────
-- (The spend_credit() function runs as SECURITY DEFINER, so it has its own
-- elevated access. Client-side inserts should not be allowed.)

drop policy if exists "credits_insert" on credit_transactions;

create policy "credits_insert_service"
  on credit_transactions for insert
  to service_role
  with check (true);

-- ─── 6. users: insert via auth trigger only (service role) ─────────────────

drop policy if exists "users_insert_own" on users;

create policy "users_insert_service"
  on users for insert
  to service_role
  with check (true);

-- ─── 7. knowledge tables: authenticated read only ──────────────────────────

drop policy if exists "knowledge_docs_select" on knowledge_documents;
drop policy if exists "knowledge_chunks_select" on knowledge_chunks;

create policy "knowledge_docs_select_auth"
  on knowledge_documents for select
  to authenticated
  using (true);

create policy "knowledge_chunks_select_auth"
  on knowledge_chunks for select
  to authenticated
  using (true);

-- Service role needs full access for admin operations
create policy "knowledge_docs_service"
  on knowledge_documents for all
  to service_role
  using (true)
  with check (true);

create policy "knowledge_chunks_service"
  on knowledge_chunks for all
  to service_role
  using (true)
  with check (true);

-- ─── 8. Upgrade select policies to use cached auth.uid() ───────────────────
-- Replace auth.uid() with (select auth.uid()) for performance

drop policy if exists "users_select_own" on users;
create policy "users_select_own" on users
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "users_update_own" on users;
create policy "users_update_own" on users
  for update to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "resumes_select_own" on parsed_resumes;
create policy "resumes_select_own" on parsed_resumes
  for select to authenticated
  using (user_id = (select auth.uid()) or user_id is null);

drop policy if exists "resumes_update_own" on parsed_resumes;
create policy "resumes_update_own" on parsed_resumes
  for update to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "sessions_select_own" on prep_sessions;
create policy "sessions_select_own" on prep_sessions
  for select to authenticated
  using (user_id = (select auth.uid()) or user_id is null);

drop policy if exists "sessions_update_own" on prep_sessions;
create policy "sessions_update_own" on prep_sessions
  for update to authenticated
  using (user_id = (select auth.uid()) or user_id is null);

drop policy if exists "answers_select_own" on generated_answers;
create policy "answers_select_own" on generated_answers
  for select to authenticated
  using (user_id = (select auth.uid()) or user_id is null);

drop policy if exists "answers_update_own" on generated_answers;
create policy "answers_update_own" on generated_answers
  for update to authenticated
  using (user_id = (select auth.uid()) or user_id is null);

drop policy if exists "credits_select_own" on credit_transactions;
create policy "credits_select_own" on credit_transactions
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ─── 9. Service role access for users table (needed by API routes) ─────────

create policy "users_service_all"
  on users for all
  to service_role
  using (true)
  with check (true);
