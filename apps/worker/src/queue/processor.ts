import type { Env, MessageBatch, ExecutionContext } from '../types';
import { rpc, upsertTranscription, update, select } from '../adapters/supabase';
import { safeJson, versionedTranscriptionPath } from '../utils/misc';
import { transcribeWithWorkersAI, sanitizeSegments } from '../adapters/ai';
import { broadcastStatus } from '../utils/status-broadcast';
import { r2Put } from '../adapters/r2';
import { sendText as waSendText } from '../adapters/whatsapp';
import { reviseTranscript, DEFAULT_REVISION_MODEL, type Segment as LlmSegment } from '../adapters/llm';

const MAX_RETRY_COUNT = 5;
const CHUNK_DURATION_SEC = 30;

type ChunkJob = {
  kind: 'chunk';
  audioId: string;
  userId: string;
  chunkIndex: number;
  totalChunks: number;
};

type LegacyJob = {
  kind?: undefined;
  jobId: string;
  userId: string;
  audioId: string;
  filename?: string;
  originalName?: string;
  filePath: string;
};

type WhatsAppJob = {
  kind: 'whatsapp';
  audioId: string;
  userId: string;
  filePath: string;
  originalName?: string;
  fromPhone: string;
};

type AnyJob = ChunkJob | LegacyJob | WhatsAppJob;

/* ------------------------- Revision pipeline helpers -------------------------- */

function isRevisionEnabled(env: Env): boolean {
  // Default ON. Set REVISION_ENABLED="false" (string) to opt out.
  const v = env.REVISION_ENABLED;
  return v === undefined || v === null || v === '' || v.toLowerCase() !== 'false';
}

/**
 * Load the user's glossary (patient names, technical vocab) from `profiles`.
 * Returns an empty array on any error or if the column is missing.
 */
async function loadUserGlossary(env: Env, userId: string): Promise<string[]> {
  try {
    const row: any = await select(env, 'profiles', { id: userId }, 'glossary');
    const list = row?.glossary;
    if (Array.isArray(list)) return list.filter((s) => typeof s === 'string' && s.trim().length > 0);
  } catch (e: any) {
    console.warn('[REV] loadUserGlossary failed:', e?.message);
  }
  return [];
}

/**
 * Run the LLM revision step over a freshly stitched transcript. Returns the
 * payload to write to R2 (original + revised + metadata) and the model id
 * for the DB row.
 *
 * Falls back to the original on any failure — users always get at least the
 * Whisper output.
 */
async function maybeReviseAndCompose(
  env: Env,
  userId: string,
  rawText: string,
  rawSegments: any[],
  locale = 'ca-ES',
): Promise<{ json: Record<string, unknown>; revisionModel: string | null }> {
  const sanitized = sanitizeSegments(rawSegments);
  const baseDoc = {
    text: rawText,
    segments: sanitized,
    updated_at: new Date().toISOString(),
  };

  if (!isRevisionEnabled(env)) {
    return { json: baseDoc, revisionModel: null };
  }

  const glossary = await loadUserGlossary(env, userId);
  const model = env.REVISION_MODEL || DEFAULT_REVISION_MODEL;

  const t0 = Date.now();
  const { segments: revised, model: usedModel, ok } = await reviseTranscript(env, {
    segments: sanitized as LlmSegment[],
    locale,
    glossary,
    model,
  });
  console.log(`[REV] ${ok ? 'ok' : 'partial'} model=${usedModel ?? '(fallback)'} segments=${revised.length} took=${Date.now() - t0}ms`);

  const revisedText = revised.map((s) => s.text).filter(Boolean).join(' ').trim();

  return {
    json: {
      text: revisedText || rawText,
      segments: revised,
      original_text: rawText,
      original_segments: sanitized,
      revision_model: usedModel,
      revised_at: usedModel ? new Date().toISOString() : null,
      updated_at: baseDoc.updated_at,
    },
    revisionModel: usedModel,
  };
}

/** Best-effort send to DLQ with diagnostic envelope. Never throws. */
async function sendToDLQ(
  env: Env,
  originalBody: string,
  reason: string,
  attempts: number,
) {
  if (!env.TRANSCRIBE_DLQ) {
    console.error('[QUEUE] No DLQ binding configured; dropping failed message');
    return;
  }
  try {
    await env.TRANSCRIBE_DLQ.send(
      JSON.stringify({
        deadAt: new Date().toISOString(),
        attempts,
        reason,
        body: originalBody,
      }),
    );
  } catch (e: any) {
    console.error('[QUEUE] Failed to send to DLQ:', e?.message || e);
  }
}

export async function processBatch(batch: MessageBatch<string>, env: Env, ctx: ExecutionContext) {
  for (const msg of batch.messages) {
    const retryCount = msg.attempts || 0;
    let parsed: AnyJob | null = null;

    try {
      parsed = safeJson<AnyJob>(msg.body);
      if (!parsed) {
        // Malformed payload — no point retrying. DLQ and ack.
        console.error('[QUEUE] Invalid job payload; sending to DLQ');
        await sendToDLQ(env, msg.body, 'invalid-json-payload', retryCount);
        msg.ack();
        continue;
      }

      if (retryCount >= MAX_RETRY_COUNT) {
        const reason = `Exceeded max retries (${MAX_RETRY_COUNT})`;
        console.error(`[QUEUE] ${reason}; sending to DLQ + marking errored`);

        // Surface the failure to the user first; cleanup is best-effort.
        if (parsed.kind === 'chunk') {
          await markAudioError(env, parsed.userId, parsed.audioId, reason).catch(() => {});
        } else if (parsed.kind === 'whatsapp') {
          await markAudioError(env, parsed.userId, parsed.audioId, reason).catch(() => {});
          await waSendText(
            env,
            parsed.fromPhone,
            'No he pogut transcriure aquest àudio. Torna-ho a provar més tard. 🙏',
          ).catch(() => {});
        } else if ((parsed as LegacyJob).jobId) {
          await rpc(env, 'mark_job_failed', {
            p_job_id: (parsed as LegacyJob).jobId,
            p_error: reason,
          }).catch(() => {});
        }

        await sendToDLQ(env, msg.body, reason, retryCount);
        msg.ack();
        continue;
      }

      if (parsed.kind === 'chunk') {
        await processChunkMessage(parsed, env, ctx);
        msg.ack();
      } else if (parsed.kind === 'whatsapp') {
        await processWhatsAppMessage(parsed, env, ctx);
        msg.ack();
      } else {
        await processLegacyMessage(parsed as LegacyJob, env, ctx);
        msg.ack();
      }
    } catch (err: any) {
      console.error(`[QUEUE] Job failed (attempt ${retryCount + 1}):`, err?.message || err);
      const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000);
      msg.retry({ delaySeconds: Math.ceil(backoffMs / 1000) });
    }
  }
}

/* --------------------------------- Chunk job ---------------------------------- */

async function processChunkMessage(job: ChunkJob, env: Env, ctx: ExecutionContext) {
  const { audioId, userId, chunkIndex, totalChunks } = job;
  console.log(`[QUEUE] chunk ${chunkIndex + 1}/${totalChunks} for audio ${audioId}`);

  // Broadcast initial progress on first chunk.
  if (chunkIndex === 0) {
    ctx.waitUntil(broadcastStatus(env, {
      audioId,
      status: 'transcribing',
      progress: 5,
      message: `Transcrivint segment 1/${totalChunks}...`,
    }));
  }

  // 1. Fetch chunk from R2.
  const chunkPath = `${userId}/${audioId}/chunks/${chunkIndex}.wav`;
  const obj = await env.AUDIO_FILES.get(chunkPath);
  if (!obj) throw new Error(`Chunk not found in R2: ${chunkPath}`);
  const audioBuf = await obj.arrayBuffer();

  // 2. Transcribe with Workers AI Whisper, applying time offset for stitching.
  const offsetSec = chunkIndex * CHUNK_DURATION_SEC;
  const result = await transcribeWithWorkersAI(
    env,
    audioBuf,
    `chunk-${chunkIndex}.wav`,
    { timeOffsetSec: offsetSec }
  );

  // 3. Save the chunk's partial transcription to R2.
  const partialPath = `${userId}/${audioId}/partials/${chunkIndex}.json`;
  await r2Put(env.TRANSCRIPTIONS, partialPath, JSON.stringify({
    chunkIndex,
    text: result.text,
    segments: sanitizeSegments(result.segments),
  }), 'application/json');

  // 4. Atomic increment via RPC. Returns the new chunks_done count.
  const incResult: any = await rpc(env, 'increment_audio_chunks_done', {
    p_audio_id: audioId,
    p_user_id: userId,
  }).catch(async (e: any) => {
    // Fallback for environments where the RPC isn't installed yet: read+write (not atomic).
    console.warn(`[QUEUE] increment_audio_chunks_done RPC unavailable, using fallback`, e?.message);
    const row: any = await select(env, 'audios', { id: audioId }, 'chunks_done,chunks_total');
    const newDone = (row?.chunks_done ?? 0) + 1;
    await update(env, 'audios', { id: audioId, user_id: userId }, { chunks_done: newDone });
    return { chunks_done: newDone };
  });

  const chunksDone: number = incResult?.chunks_done ?? incResult?.[0]?.chunks_done ?? chunkIndex + 1;
  const progressPct = Math.min(95, 5 + Math.round((chunksDone / totalChunks) * 85));

  ctx.waitUntil(broadcastStatus(env, {
    audioId,
    status: 'transcribing',
    progress: progressPct,
    message: `Transcrivint segment ${chunksDone}/${totalChunks}...`,
  }));

  // 5. If this was the last chunk, stitch.
  if (chunksDone >= totalChunks) {
    await stitchChunks(env, userId, audioId, totalChunks, ctx);
  }
}

async function stitchChunks(
  env: Env,
  userId: string,
  audioId: string,
  totalChunks: number,
  ctx: ExecutionContext
) {
  console.log(`[QUEUE] Stitching ${totalChunks} chunks for ${audioId}`);
  ctx.waitUntil(broadcastStatus(env, {
    audioId,
    status: 'transcribing',
    progress: 95,
    message: 'Combinant segments...',
  }));

  // Fetch all partials in parallel.
  const partials = await Promise.all(
    Array.from({ length: totalChunks }, async (_, i) => {
      const obj = await env.TRANSCRIPTIONS.get(`${userId}/${audioId}/partials/${i}.json`);
      if (!obj) throw new Error(`Partial ${i} missing`);
      return obj.json() as Promise<{ chunkIndex: number; text: string; segments: any[] }>;
    })
  );

  partials.sort((a, b) => a.chunkIndex - b.chunkIndex);

  const text = partials.map((p) => p.text).filter((s) => s).join(' ').trim();
  const segments = partials.flatMap((p) => sanitizeSegments(p.segments));

  // Run LLM revision pass (corrects phonetic confusables, punctuation, etc.)
  // — falls back to the raw output on any error.
  const { json: finalDoc, revisionModel } = await maybeReviseAndCompose(env, userId, text, segments);

  // Write final transcription to R2.
  const finalPath = versionedTranscriptionPath(userId, audioId);
  await r2Put(env.TRANSCRIPTIONS, finalPath, JSON.stringify(finalDoc, null, 2), 'application/json');

  // Update DB.
  await upsertTranscription(env, {
    id: audioId,
    audio_id: audioId,
    user_id: userId,
    status: 'completed',
    json_path: finalPath,
    ...(revisionModel ? { revision_model: revisionModel, revised_at: new Date().toISOString() } : {}),
  });
  await update(env, 'audios', { id: audioId, user_id: userId }, { status: 'completed' });

  // Cache the hash → audioId mapping for future dedup hits.
  if (env.CACHE) {
    const row: any = await select(env, 'audios', { id: audioId }, 'content_hash').catch(() => null);
    const hash = row?.content_hash;
    if (hash) {
      ctx.waitUntil(env.CACHE.put(
        `audio-hash:${hash}`,
        JSON.stringify({ audioId, userId, jsonPath: finalPath }),
        { expirationTtl: 60 * 60 * 24 * 30 } // 30 days
      ));
    }
  }

  // Charge org usage now that the transcript is delivered. Best-effort —
  // failures are logged but do not break completion. Wrapped in waitUntil so
  // it doesn't block the status broadcast.
  ctx.waitUntil(chargeOrgUsage(env, audioId));

  await broadcastStatus(env, {
    audioId,
    status: 'completed',
    progress: 100,
    message: 'Transcripció completada!',
  });

  // Delete the chunk WAVs and per-chunk partial JSONs now that the final
  // stitched transcript is safely in R2. The ORIGINAL audio at
  // {userId}/{audioId}/source is intentionally kept so the in-app audio
  // player can stream it back and we can re-transcribe later if needed.
  ctx.waitUntil(cleanupChunkArtifacts(env, userId, audioId, totalChunks));

  console.log(`[QUEUE] Audio ${audioId} fully transcribed (${totalChunks} chunks)`);
}

/**
 * Charge the audio's organization for its duration via `consume_org_minutes`.
 *
 * Best-effort: any failure is logged and swallowed — the user already has
 * their transcript, we'd rather under-charge than break completion.
 */
async function chargeOrgUsage(env: Env, audioId: string) {
  try {
    const audio: any = await select(env, 'audios', { id: audioId }, 'organization_id,duration_seconds');
    if (!audio?.organization_id || !(audio.duration_seconds > 0)) return;

    const minutes = Math.max(1, Math.ceil(audio.duration_seconds / 60));
    const usage: any = await rpc(env, 'consume_org_minutes', {
      p_org_id: audio.organization_id,
      p_minutes: minutes,
    }).catch((e: any) => {
      console.warn(`[QUEUE] consume_org_minutes failed for org ${audio.organization_id}:`, e?.message);
      return null;
    });
    if (Array.isArray(usage) ? usage[0]?.over_quota : usage?.over_quota) {
      console.warn(`[QUEUE] Audio ${audioId} pushed org ${audio.organization_id} over quota.`);
    }
  } catch (e: any) {
    console.warn(`[QUEUE] chargeOrgUsage failed for audio ${audioId}:`, e?.message);
  }
}

async function cleanupChunkArtifacts(
  env: Env,
  userId: string,
  audioId: string,
  totalChunks: number
) {
  const ops: Promise<void>[] = [];
  for (let i = 0; i < totalChunks; i++) {
    ops.push(env.AUDIO_FILES.delete(`${userId}/${audioId}/chunks/${i}.wav`));
    ops.push(env.TRANSCRIPTIONS.delete(`${userId}/${audioId}/partials/${i}.json`));
  }
  const results = await Promise.allSettled(ops);
  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) {
    console.warn(`[QUEUE] Cleanup left ${failed}/${ops.length} artifacts behind for ${audioId}`);
  } else {
    console.log(`[QUEUE] Cleaned up ${ops.length} chunk artifacts for ${audioId}`);
  }
}

async function markAudioError(env: Env, userId: string, audioId: string, reason: string) {
  try {
    await update(env, 'audios', { id: audioId, user_id: userId }, { status: 'error' });
    await broadcastStatus(env, { audioId, status: 'error', progress: 0, message: reason });
  } catch (e) {
    console.error('[QUEUE] markAudioError failed:', e);
  }
}

/* --------------------------- Legacy single-shot job --------------------------- */
/* Kept for backward compat — handles old payloads pointing at a single R2 file.  */

async function processLegacyMessage(job: LegacyJob, env: Env, ctx: ExecutionContext) {
  const { jobId, userId, audioId, filename, originalName, filePath } = job;
  console.log(`[QUEUE] legacy job ${jobId} audio ${audioId}`);

  const claim: any = await rpc(env, 'attempt_claim_job', {
    p_job_id: jobId,
    p_claimer: `cf-${crypto.randomUUID?.() || 'worker'}`,
  });
  if (!claim?.success) {
    console.log(`[QUEUE] Legacy job ${jobId} not claimable`);
    return;
  }

  const object = await env.AUDIO_FILES.get(filePath);
  if (!object) throw new Error(`Audio not found in R2: ${filePath}`);
  const audioBuf = await object.arrayBuffer();

  // Bias Whisper with the user's glossary so it gets names/terms right up-front.
  const glossary = await loadUserGlossary(env, userId);
  const result = await transcribeWithWorkersAI(env, audioBuf, originalName || filename || 'audio', { glossary });
  await rpc(env, 'mark_job_completed', { p_job_id: jobId });

  const { json: finalDoc, revisionModel } = await maybeReviseAndCompose(env, userId, result.text, result.segments);

  const path = versionedTranscriptionPath(userId, audioId);
  await r2Put(env.TRANSCRIPTIONS, path, JSON.stringify(finalDoc, null, 2), 'application/json');

  await upsertTranscription(env, {
    id: audioId,
    audio_id: audioId,
    user_id: userId,
    status: 'completed',
    json_path: path,
    ...(revisionModel ? { revision_model: revisionModel, revised_at: new Date().toISOString() } : {}),
  });
  await update(env, 'audios', { id: audioId, user_id: userId }, { status: 'completed' });

  await broadcastStatus(env, { audioId, status: 'completed', progress: 100, message: 'Transcripció completada!' });
  console.log(`[QUEUE] Legacy job ${jobId} completed`);
}

/* ------------------------- WhatsApp inbound single-shot ----------------------- */

/**
 * Drives a transcription for a WhatsApp-originated audio. Same shape as
 * `processLegacyMessage` but without the `attempt_claim_job` RPC (there's no
 * pre-existing job row) and with a follow-up WhatsApp reply that links to the
 * library entry.
 */
async function processWhatsAppMessage(job: WhatsAppJob, env: Env, ctx: ExecutionContext) {
  const { audioId, userId, filePath, originalName, fromPhone } = job;
  console.log(`[QUEUE] whatsapp job audio=${audioId} from=${fromPhone}`);

  const object = await env.AUDIO_FILES.get(filePath);
  if (!object) throw new Error(`Audio not found in R2: ${filePath}`);
  const audioBuf = await object.arrayBuffer();

  const glossary = await loadUserGlossary(env, userId);
  const result = await transcribeWithWorkersAI(env, audioBuf, originalName || 'whatsapp-audio.ogg', { glossary });
  const { json: finalDoc, revisionModel } = await maybeReviseAndCompose(env, userId, result.text, result.segments);
  const replyText = typeof finalDoc.text === 'string' ? finalDoc.text : result.text;

  const path = versionedTranscriptionPath(userId, audioId);
  await r2Put(env.TRANSCRIPTIONS, path, JSON.stringify(finalDoc, null, 2), 'application/json');

  await upsertTranscription(env, {
    id: audioId,
    audio_id: audioId,
    user_id: userId,
    status: 'completed',
    json_path: path,
    ...(revisionModel ? { revision_model: revisionModel, revised_at: new Date().toISOString() } : {}),
  });
  await update(env, 'audios', { id: audioId, user_id: userId }, { status: 'completed' });

  ctx.waitUntil(
    broadcastStatus(env, { audioId, status: 'completed', progress: 100, message: 'Transcripció completada!' })
      .catch(() => {}),
  );

  // Reply to the user on WhatsApp with a deep link to the library entry.
  const siteUrl = env.PUBLIC_SITE_URL || 'https://www.transcriu.com';
  const link = `${siteUrl}/library?audio=${audioId}`;
  const preview = (replyText || '').trim().slice(0, 140);
  const replyBody = preview
    ? `✅ Transcripció llesta!\n\n"${preview}${(replyText || '').length > 140 ? '…' : ''}"\n\nObre-la, edita-la o exporta-la aquí: ${link}`
    : `✅ Transcripció llesta!\n\nObre-la aquí: ${link}`;
  await waSendText(env, fromPhone, replyBody).catch((e) => console.warn('[WA] reply failed', e));

  console.log(`[QUEUE] whatsapp job audio=${audioId} completed`);
}
