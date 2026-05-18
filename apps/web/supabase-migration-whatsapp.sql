-- WhatsApp inbound bot — schema migration
-- Apply via Supabase SQL editor or `psql` against the transcribe-ai project
-- (qtjbjxtujdjvauzwzfkw.supabase.co). Safe to run multiple times.

-- 1) Add phone (E.164) on profiles, with a partial unique index so multiple
--    users can have NULL phones but a registered phone maps to a single user.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Normalize: store phone in E.164 form (e.g. "+34612345678"). Worker matches
-- on the digits-only form from WhatsApp `from` (e.g. "34612345678") — we
-- compare via the strip-plus expression below.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;

-- 2) Tag the source of an audio so the worker knows where to reply when
--    transcription finishes. NULL/'web' = default upload flow.
ALTER TABLE public.audios
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS wa_message_id TEXT,
  ADD COLUMN IF NOT EXISTS wa_from_phone TEXT;

-- 3) Deduplicate retried webhook deliveries from Meta (idempotent inserts).
CREATE UNIQUE INDEX IF NOT EXISTS audios_wa_message_id_unique
  ON public.audios (wa_message_id)
  WHERE wa_message_id IS NOT NULL;

-- 4) Helper: look up a user by E.164 phone (worker calls this via PostgREST).
--    Returns the user_id or NULL.
CREATE OR REPLACE FUNCTION public.find_user_by_phone(p_phone TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles
   WHERE phone = p_phone
      OR phone = '+' || regexp_replace(p_phone, '^\+', '')
      OR regexp_replace(coalesce(phone, ''), '^\+', '') = regexp_replace(p_phone, '^\+', '')
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_user_by_phone(TEXT) TO service_role;
