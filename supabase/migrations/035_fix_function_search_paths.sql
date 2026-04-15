-- 035: Fix mutable search_path on all public functions
-- Prevents search_path injection attacks by pinning search_path to ''
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- ── spend_credit ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.spend_credit(
  p_user_id uuid,
  p_answer_id text,
  p_description text default 'Answer generation'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance integer;
BEGIN
  SELECT credit_balance INTO v_balance
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < 1 THEN
    RETURN false;
  END IF;

  UPDATE public.users SET credit_balance = credit_balance - 1, updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, reference_id, description)
  VALUES (p_user_id, -1, 'spend', p_answer_id, p_description);

  RETURN true;
END;
$$;

-- ── add_credits ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id uuid,
  p_amount integer,
  p_transaction_type public.transaction_type default 'purchase',
  p_description text default 'Credit purchase'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users SET credit_balance = credit_balance + p_amount, updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, p_amount, p_transaction_type, p_description);
END;
$$;

-- ── search_knowledge ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_knowledge(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
) RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  WHERE 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ── handle_new_user ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, credit_balance)
  VALUES (new.id, new.email, 3)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description)
  VALUES (new.id, 3, 'free_grant', 'Welcome — 3 free credits');

  RETURN new;
END;
$$;

-- ── set_updated_at ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- ── match_knowledge_chunks ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.5,
  filter_category TEXT DEFAULT NULL,
  filter_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    akc.id,
    akc.source_id,
    akc.content,
    1 - (akc.embedding <=> query_embedding) AS similarity,
    akc.metadata
  FROM public.admin_knowledge_chunks akc
  JOIN public.knowledge_sources ks ON akc.source_id = ks.id
  WHERE ks.status = 'ready'
    AND (filter_category IS NULL OR ks.category = filter_category)
    AND (filter_tags IS NULL OR ks.tags && filter_tags)
    AND akc.embedding IS NOT NULL
    AND 1 - (akc.embedding <=> query_embedding) > match_threshold
  ORDER BY akc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ── match_golden_examples ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.match_golden_examples(
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 3,
  filter_question_key TEXT DEFAULT NULL,
  filter_role TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  question_text TEXT,
  answer_text TEXT,
  framework TEXT,
  quality_score DECIMAL,
  authenticity_markers TEXT[],
  red_flag_version TEXT,
  red_flag_why TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  (
    SELECT
      ge.id,
      ge.question_text,
      ge.answer_text,
      ge.framework,
      ge.quality_score,
      ge.authenticity_markers,
      ge.red_flag_version,
      ge.red_flag_why,
      1 - (ge.embedding <=> query_embedding) AS similarity
    FROM public.golden_examples ge
    WHERE ge.is_active = TRUE
      AND ge.quality_score >= 8
      AND ge.embedding IS NOT NULL
      AND (filter_question_key IS NULL OR ge.question_key = filter_question_key)
      AND (filter_role IS NULL OR ge.role_type = filter_role OR ge.role_type IS NULL)
    ORDER BY ge.embedding <=> query_embedding
    LIMIT match_count
  )
  UNION ALL
  (
    SELECT
      ge.id,
      ge.question_text,
      ge.answer_text,
      ge.framework,
      ge.quality_score,
      ge.authenticity_markers,
      ge.red_flag_version,
      ge.red_flag_why,
      0.75::FLOAT AS similarity
    FROM public.golden_examples ge
    WHERE ge.is_active = TRUE
      AND ge.quality_score >= 8
      AND ge.embedding IS NULL
      AND filter_question_key IS NOT NULL
      AND ge.question_key = filter_question_key
      AND (filter_role IS NULL OR ge.role_type = filter_role OR ge.role_type IS NULL)
    LIMIT match_count
  )
  LIMIT match_count;
END;
$$;
