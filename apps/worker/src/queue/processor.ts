import type { Env, MessageBatch, ExecutionContext } from '../types';
import { rpc, upsertTranscription, update } from '../adapters/supabase';
import { safeJson, versionedTranscriptionPath } from '../utils/misc';
import { transcribeWithWorkersAI, sanitizeSegments } from '../adapters/ai';
import { cleanupOldVersions } from '../utils/storage-cleanup';

// Queue processing configuration
const MAX_RETRY_COUNT = 5; // Maximum number of retry attempts before moving to dead-letter

export async function processBatch(batch: MessageBatch<string>, env: Env, ctx: ExecutionContext) {
  for (const msg of batch.messages) {
    const retryCount = msg.attempts || 0;
    let data: any = null;

    try {
      data = safeJson<any>(msg.body) ?? JSON.parse(msg.body);
      const { jobId, userId, audioId, filename, originalName, filePath } = data;

      console.log(`[QUEUE] Processing job ${jobId}, attempt ${retryCount + 1}/${MAX_RETRY_COUNT}`);

      // Check if we've exceeded max retries
      if (retryCount >= MAX_RETRY_COUNT) {
        console.error(`[QUEUE] Job ${jobId} exceeded max retries (${MAX_RETRY_COUNT}), moving to dead-letter`);

        // Mark as failed in database
        try {
          await rpc(env, 'mark_job_failed', {
            p_job_id: jobId,
            p_error: `Exceeded max retry attempts (${MAX_RETRY_COUNT})`,
          });
          await update(env, 'audios', { id: audioId, user_id: userId }, { status: 'error' });
        } catch (e) {
          console.error(`[QUEUE] Failed to mark job as failed:`, e);
        }

        // Acknowledge to prevent further retries (dead-letter behavior)
        msg.ack();
        continue;
      }

      // Claim the job
      const claim = await rpc(env, 'attempt_claim_job', {
        p_job_id: jobId,
        p_claimer: `cf-${crypto.randomUUID?.() || 'worker'}-attempt${retryCount + 1}`,
      });

      if (!claim?.success) {
        console.log(`[QUEUE] Job ${jobId} not claimable (may already be processed)`);
        msg.ack();
        continue;
      }

      // Fetch audio from R2
      const object = await env.AUDIO_FILES.get(filePath);
      if (!object) {
        throw new Error(`Audio not found in R2: ${filePath}`);
      }
      const audioBuf = await object.arrayBuffer();

      // Transcribe with AI
      const result = await transcribeWithWorkersAI(env, audioBuf, originalName || filename);

      // Mark job as completed
      await rpc(env, 'mark_job_completed', { p_job_id: jobId });

      // Save transcription to R2
      const transcriptionData = {
        text: result.text,
        segments: sanitizeSegments(result.segments),
        updated_at: new Date().toISOString(),
      };
      const path = versionedTranscriptionPath(userId, audioId);
      await env.TRANSCRIPTIONS.put(path, JSON.stringify(transcriptionData, null, 2), {
        httpMetadata: { contentType: 'application/json', cacheControl: 'no-store' },
      });

      // Cleanup old versions (non-blocking)
      ctx.waitUntil(
        cleanupOldVersions(env.TRANSCRIPTIONS, userId, audioId).catch((e) => {
          console.warn(`[QUEUE] Cleanup failed (non-blocking):`, e);
        })
      );

      // Update database records
      await upsertTranscription(env, {
        id: audioId,
        audio_id: audioId,
        user_id: userId,
        status: 'completed',
        json_path: path,
      });
      await update(env, 'audios', { id: audioId, user_id: userId }, { status: 'completed' });

      console.log(`[QUEUE] Job ${jobId} completed successfully`);
      msg.ack();
    } catch (err: any) {
      console.error(`[QUEUE] Job processing failed (attempt ${retryCount + 1}):`, err?.message || err);

      // Mark job as failed in database (but don't ack - let queue retry)
      try {
        if (data?.jobId) {
          await rpc(env, 'mark_job_failed', {
            p_job_id: data.jobId,
            p_error: err?.message ?? String(err),
          });
        }
      } catch (e) {
        console.error(`[QUEUE] Failed to mark job as failed in DB:`, e);
      }

      // Calculate backoff delay for retry
      const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
      console.log(`[QUEUE] Will retry in ~${backoffMs}ms (queue-managed backoff)`);

      // Don't ack - let the queue retry with its built-in backoff
      msg.retry({ delaySeconds: Math.ceil(backoffMs / 1000) });
    }
  }
}
