-- Migration: chunked transcription pipeline
-- Adds chunk-tracking columns to audios + atomic increment RPC.
-- Run once against the production database before deploying the worker.

BEGIN;

ALTER TABLE audios
  ADD COLUMN IF NOT EXISTS chunks_total integer,
  ADD COLUMN IF NOT EXISTS chunks_done  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

CREATE INDEX IF NOT EXISTS audios_content_hash_idx ON audios (content_hash);

-- Atomic increment used by the queue consumer per chunk.
-- Returns the new chunks_done value so the consumer can detect the final chunk.
CREATE OR REPLACE FUNCTION increment_audio_chunks_done(
  p_audio_id uuid,
  p_user_id  uuid
) RETURNS TABLE (chunks_done integer, chunks_total integer) AS $$
  UPDATE audios
  SET chunks_done = COALESCE(chunks_done, 0) + 1
  WHERE id = p_audio_id AND user_id = p_user_id
  RETURNING chunks_done, chunks_total;
$$ LANGUAGE sql VOLATILE;

GRANT EXECUTE ON FUNCTION increment_audio_chunks_done(uuid, uuid) TO service_role;

COMMIT;
