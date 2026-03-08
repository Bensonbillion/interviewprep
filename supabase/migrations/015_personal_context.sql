-- Add personal_context column to users table for "What makes you YOU?" field
-- Persists across sessions so users don't re-enter hobbies/side projects each time
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS personal_context TEXT;
