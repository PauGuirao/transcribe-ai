-- Database functions for atomic operations
-- Run this script in your Supabase SQL Editor

-- Function to atomically decrement user tokens
CREATE OR REPLACE FUNCTION decrement_tokens(
  user_id UUID,
  amount INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_tokens INTEGER;
  new_tokens INTEGER;
BEGIN
  -- Lock the row to prevent concurrent modifications
  SELECT tokens INTO current_tokens
  FROM profiles
  WHERE id = user_id
  FOR UPDATE;
  
  -- Check if user exists
  IF current_tokens IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check if user has enough tokens
  IF current_tokens < amount THEN
    RAISE EXCEPTION 'Insufficient tokens. Current: %, Required: %', current_tokens, amount;
  END IF;
  
  -- Calculate new token amount
  new_tokens := current_tokens - amount;
  
  -- Update the tokens atomically
  UPDATE profiles
  SET tokens = new_tokens,
      updated_at = NOW()
  WHERE id = user_id;
  
  -- Return the new token count
  RETURN new_tokens;
END;
$$;

-- Function to atomically increment user tokens (for refunds/additions)
CREATE OR REPLACE FUNCTION increment_tokens(
  user_id UUID,
  amount INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_tokens INTEGER;
  new_tokens INTEGER;
BEGIN
  -- Lock the row to prevent concurrent modifications
  SELECT tokens INTO current_tokens
  FROM profiles
  WHERE id = user_id
  FOR UPDATE;
  
  -- Check if user exists
  IF current_tokens IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Calculate new token amount
  new_tokens := current_tokens + amount;
  
  -- Update the tokens atomically
  UPDATE profiles
  SET tokens = new_tokens,
      updated_at = NOW()
  WHERE id = user_id;
  
  -- Return the new token count
  RETURN new_tokens;
END;
$$;

-- Function to get user token count safely
CREATE OR REPLACE FUNCTION get_user_tokens(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_count INTEGER;
BEGIN
  SELECT tokens INTO token_count
  FROM profiles
  WHERE id = user_id;
  
  RETURN COALESCE(token_count, 0);
END;
$$;

-- Function to handle transcription start with atomic token deduction
CREATE OR REPLACE FUNCTION start_transcription(
  p_user_id UUID,
  p_audio_id UUID,
  p_token_cost INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  remaining_tokens INTEGER;
  audio_status TEXT;
  result JSON;
BEGIN
  -- Start transaction
  BEGIN
    -- Check if audio exists and belongs to user
    SELECT status INTO audio_status
    FROM audios
    WHERE id = p_audio_id AND user_id = p_user_id
    FOR UPDATE;
    
    IF audio_status IS NULL THEN
      RAISE EXCEPTION 'Audio file not found or access denied';
    END IF;
    
    -- Check if audio is already being processed
    IF audio_status = 'processing' THEN
      RAISE EXCEPTION 'Audio is already being processed';
    END IF;
    
    -- Deduct tokens atomically
    remaining_tokens := decrement_tokens(p_user_id, p_token_cost);
    
    -- Update audio status to processing
    UPDATE audios
    SET status = 'processing',
        updated_at = NOW()
    WHERE id = p_audio_id;
    
    -- Return success result
    result := json_build_object(
      'success', true,
      'remaining_tokens', remaining_tokens,
      'message', 'Transcription started successfully'
    );
    
    RETURN result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback is automatic in PostgreSQL for exceptions
      result := json_build_object(
        'success', false,
        'error', SQLERRM,
        'remaining_tokens', get_user_tokens(p_user_id)
      );
      RETURN result;
  END;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION decrement_tokens(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_tokens(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION start_transcription(UUID, UUID, INTEGER) TO authenticated;

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_tokens ON profiles(tokens);
CREATE INDEX IF NOT EXISTS idx_audios_user_status ON audios(user_id, status);


-- Transcription Jobs table for Cloudflare Workers + Queues migration
-- Holds durable ingestion jobs with idempotency and controlled status transitions
CREATE TABLE IF NOT EXISTS transcription_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  audio_id UUID NOT NULL REFERENCES audios(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'cloudflare',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed','processing','completed','failed','cancelled')),
  idempotency_key TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  claim_token TEXT,
  claimed_at TIMESTAMPTZ,
  prediction_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure idempotency per user
CREATE UNIQUE INDEX IF NOT EXISTS uq_transcription_jobs_user_idempotency
ON transcription_jobs(user_id, idempotency_key);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_status_created
ON transcription_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_audio
ON transcription_jobs(audio_id);

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transcription_jobs_updated_at ON transcription_jobs;
CREATE TRIGGER trg_transcription_jobs_updated_at
BEFORE UPDATE ON transcription_jobs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Enable RLS
ALTER TABLE transcription_jobs ENABLE ROW LEVEL SECURITY;

-- RLS: allow authenticated users to insert/select their own jobs
DROP POLICY IF EXISTS "Users can insert own jobs" ON transcription_jobs;
CREATE POLICY "Users can insert own jobs" ON transcription_jobs
FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can select own jobs" ON transcription_jobs;
CREATE POLICY "Users can select own jobs" ON transcription_jobs
FOR SELECT USING (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Note: No UPDATE/DELETE policy for authenticated users. Service role bypasses RLS for worker updates.

-- RPC: Upsert/idempotent create of a transcription job
-- If a job with the same (user_id, idempotency_key) exists, return it; otherwise create a new pending job.
CREATE OR REPLACE FUNCTION upsert_transcription_job(
  p_user_id UUID,
  p_audio_id UUID,
  p_idempotency_key TEXT,
  p_provider TEXT DEFAULT 'cloudflare'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_job RECORD;
  new_job_id UUID;
BEGIN
  SELECT * INTO existing_job
  FROM transcription_jobs
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key
  LIMIT 1;

  IF existing_job IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'job_id', existing_job.id,
      'status', existing_job.status
    );
  END IF;

  INSERT INTO transcription_jobs (user_id, audio_id, idempotency_key, provider, status)
  VALUES (p_user_id, p_audio_id, p_idempotency_key, p_provider, 'pending')
  RETURNING id INTO new_job_id;

  RETURN json_build_object(
    'success', true,
    'job_id', new_job_id,
    'status', 'pending'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_transcription_job(UUID, UUID, TEXT, TEXT) TO authenticated;

-- RPC: Attempt to claim a pending job using optimistic concurrency
-- Transitions status from 'pending' to 'claimed' and sets claim_token & claimed_at atomically
CREATE OR REPLACE FUNCTION attempt_claim_job(
  p_job_id UUID,
  p_claimer TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  row_count INTEGER;
  claim_value TEXT := p_claimer;
  claimed RECORD;
BEGIN
  UPDATE transcription_jobs
  SET status = 'claimed', claim_token = claim_value, claimed_at = NOW(), attempts = attempts + 1
  WHERE id = p_job_id AND status = 'pending' AND claim_token IS NULL;

  GET DIAGNOSTICS row_count = ROW_COUNT;

  IF row_count = 0 THEN
    SELECT * INTO claimed FROM transcription_jobs WHERE id = p_job_id;
    RETURN json_build_object(
      'success', false,
      'reason', 'not_claimable',
      'status', claimed.status
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'status', 'claimed'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION attempt_claim_job(UUID, TEXT) TO authenticated;

-- RPC: Mark job processing and attach prediction_id (only if previously claimed)
CREATE OR REPLACE FUNCTION mark_job_processing(
  p_job_id UUID,
  p_prediction_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  row_count INTEGER;
BEGIN
  UPDATE transcription_jobs
  SET status = 'processing', prediction_id = p_prediction_id
  WHERE id = p_job_id AND status = 'claimed';

  GET DIAGNOSTICS row_count = ROW_COUNT;

  IF row_count = 0 THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_state');
  END IF;

  RETURN json_build_object('success', true, 'status', 'processing');
END;
$$;

GRANT EXECUTE ON FUNCTION mark_job_processing(UUID, TEXT) TO authenticated;

-- RPC: Mark job completed
CREATE OR REPLACE FUNCTION mark_job_completed(p_job_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  row_count INTEGER;
BEGIN
  UPDATE transcription_jobs SET status = 'completed' WHERE id = p_job_id AND status IN ('processing','claimed');
  GET DIAGNOSTICS row_count = ROW_COUNT;
  IF row_count = 0 THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_state');
  END IF;
  RETURN json_build_object('success', true, 'status', 'completed');
END;
$$;

GRANT EXECUTE ON FUNCTION mark_job_completed(UUID) TO authenticated;

-- RPC: Mark job failed and store error message
CREATE OR REPLACE FUNCTION mark_job_failed(p_job_id UUID, p_error TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE transcription_jobs SET status = 'failed', error = p_error WHERE id = p_job_id;
  RETURN json_build_object('success', true, 'status', 'failed');
END;
$$;

GRANT EXECUTE ON FUNCTION mark_job_failed(UUID, TEXT) TO authenticated;