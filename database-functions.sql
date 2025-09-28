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