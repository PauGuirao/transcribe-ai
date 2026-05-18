-- LLM revision pipeline — schema migration
-- Adds:
--   • profiles.glossary  — user-supplied terms biasing both ASR and revision LLM
--   • transcriptions.revision_model + revised_at — tracks which model corrected
--     a transcript so we can re-run later when we change models.
-- Idempotent. Apply via Supabase SQL editor or `psql -f`.

-- 1) Per-user glossary (patient names, technical vocab, brand names…).
--    Stored as an array of short strings; the worker joins them into a
--    Whisper `initial_prompt` AND into the revision LLM's system prompt.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS glossary TEXT[];

-- 2) Track which revision model rewrote a transcript, and when.
--    Null = no revision was attempted yet (or feature disabled).
ALTER TABLE public.transcriptions
  ADD COLUMN IF NOT EXISTS revision_model TEXT,
  ADD COLUMN IF NOT EXISTS revised_at     TIMESTAMPTZ;
