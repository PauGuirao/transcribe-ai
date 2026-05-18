import type { Env } from '../types';
import { json } from '../utils/http';
import { requireUser, httpError } from '../utils/auth';
import { r2Put } from '../adapters/r2';
import { insertAudio, select } from '../adapters/supabase';
import { uuidv4 } from '../utils/ids';

const MAX_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk (we slice to 30s WAV ≈ 1 MB)
const MAX_CHUNKS = 600; // 600 × 30s = 5 hours per audio. Bumps possible.
const CHUNK_DURATION_SEC = 30;

/**
 * POST /chunked-upload/init
 *   { originalFilename, mimeType, totalDurationSec, totalChunks, sha256 }
 * → { audioId, filePath }
 *
 * Creates the audio row with status='uploading' and returns the audioId
 * the client will namespace chunk uploads under.
 */
export async function chunkedUploadInit(request: Request, env: Env): Promise<Response> {
  const userId = await requireUser(request, env);

  let body: any;
  try { body = await request.json(); } catch { throw httpError(400, 'Invalid JSON'); }

  const { originalFilename, mimeType, totalDurationSec, totalChunks, sha256 } = body ?? {};
  if (!originalFilename) throw httpError(400, 'originalFilename required');
  if (typeof totalDurationSec !== 'number' || totalDurationSec <= 0) throw httpError(400, 'totalDurationSec required');
  if (!Number.isInteger(totalChunks) || totalChunks < 1 || totalChunks > MAX_CHUNKS) {
    throw httpError(400, `totalChunks must be 1..${MAX_CHUNKS}`);
  }
  if (typeof sha256 !== 'string' || sha256.length !== 64) throw httpError(400, 'sha256 required (64 hex chars)');

  // Dedup check: if we've transcribed this exact audio before, copy the existing audio row instead.
  if (env.CACHE) {
    const cached = await env.CACHE.get(`audio-hash:${sha256}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return json({ duplicate: true, sourceAudioId: parsed.audioId, sourceUserId: parsed.userId });
      } catch { /* ignore parse error, fall through */ }
    }
  }

  // Enforce per-org monthly minute quota BEFORE inserting the audio row.
  const profile: any = await select(env, 'profiles', { id: userId }, 'current_organization_id');
  const orgId = profile?.current_organization_id;
  if (!orgId) throw httpError(409, 'No active organization for this user.');
  const org: any = await select(env, 'organizations', { id: orgId }, 'plan,minutes_per_month,minutes_used_this_period');

  const uploadMinutes = Math.max(1, Math.ceil(totalDurationSec / 60));
  if ((org?.minutes_used_this_period ?? 0) + uploadMinutes > (org?.minutes_per_month ?? 0)) {
    throw httpError(
      402,
      `Has esgotat el límit mensual del teu pla (${org?.minutes_per_month} min). Actualitza el pla per continuar.`,
      {
        code: 'QUOTA_EXCEEDED',
        plan: org?.plan,
        allowance: org?.minutes_per_month,
        used: org?.minutes_used_this_period,
      },
    );
  }

  const audioId = uuidv4();
  const filePath = `${userId}/${audioId}/source`;
  const ext = (originalFilename.split('.').pop() || 'audio').toLowerCase();

  const record = {
    id: audioId,
    user_id: userId,
    organization_id: orgId,
    filename: `${audioId}.${ext}`,
    original_filename: originalFilename,
    storage_path: filePath,
    status: 'uploading',
    duration_seconds: Math.round(totalDurationSec),
    chunks_total: totalChunks,
    chunks_done: 0,
    content_hash: sha256,
  };

  try {
    const inserted: any = await insertAudio(env, record);
    return json({
      audioId,
      userId,
      filePath,
      totalChunks,
      chunkDurationSec: CHUNK_DURATION_SEC,
      record: Array.isArray(inserted) ? (inserted[0] ?? inserted) : inserted,
    });
  } catch (e: any) {
    throw httpError(500, 'Failed to create audio record', e?.message);
  }
}

/**
 * POST /chunked-upload/source?audioId=…
 *   Body: raw audio bytes in their original format (MP3, WAV, M4A, etc.)
 *   Content-Type: caller-supplied
 * → { ok: true, path }
 *
 * Stores the ORIGINAL audio at {userId}/{audioId}/source (preserved after
 * stitching so the in-app audio player can stream it back). The chunked
 * WAV files are derived and deleted post-transcription.
 */
const MAX_SOURCE_SIZE = 500 * 1024 * 1024; // 500 MB — same as the client cap.

export async function chunkedUploadSource(request: Request, env: Env): Promise<Response> {
  const userId = await requireUser(request, env);

  const url = new URL(request.url);
  const audioId = url.searchParams.get('audioId');
  if (!audioId) throw httpError(400, 'audioId query param required');

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_SOURCE_SIZE) {
    throw httpError(413, `source too large (${contentLength} > ${MAX_SOURCE_SIZE})`);
  }

  const contentType = request.headers.get('content-type') || 'application/octet-stream';
  const body = request.body;
  if (!body) throw httpError(400, 'no body');

  const path = `${userId}/${audioId}/source`;
  await r2Put(env.AUDIO_FILES, path, body as unknown as ReadableStream, contentType);

  return json({ ok: true, path });
}

/**
 * POST /chunked-upload/chunk?audioId=…&index=…
 *   Body: raw WAV bytes (Content-Type: audio/wav)
 * → { ok: true, index }
 *
 * Stores one chunk in R2 under {userId}/{audioId}/chunks/{index}.wav.
 */
export async function chunkedUploadChunk(request: Request, env: Env): Promise<Response> {
  const userId = await requireUser(request, env);

  const url = new URL(request.url);
  const audioId = url.searchParams.get('audioId');
  const indexStr = url.searchParams.get('index');
  if (!audioId) throw httpError(400, 'audioId query param required');
  if (!indexStr) throw httpError(400, 'index query param required');

  const index = Number.parseInt(indexStr, 10);
  if (!Number.isInteger(index) || index < 0 || index >= MAX_CHUNKS) {
    throw httpError(400, `invalid chunk index ${indexStr}`);
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_CHUNK_SIZE) {
    throw httpError(413, `chunk too large (${contentLength} > ${MAX_CHUNK_SIZE})`);
  }

  const path = `${userId}/${audioId}/chunks/${index}.wav`;
  // Stream straight into R2 — no buffer.
  const body = request.body;
  if (!body) throw httpError(400, 'no body');
  await r2Put(env.AUDIO_FILES, path, body as unknown as ReadableStream, 'audio/wav');

  return json({ ok: true, index, path });
}

/**
 * POST /chunked-upload/process
 *   { audioId }
 * → { enqueued: N }
 *
 * Tells the worker that all chunks are uploaded for `audioId`. Enqueues one
 * TRANSCRIBE_JOBS message per chunk; the queue consumer transcribes each and
 * the last one stitches the final result.
 */
export async function chunkedUploadProcess(request: Request, env: Env): Promise<Response> {
  const userId = await requireUser(request, env);

  let body: any;
  try { body = await request.json(); } catch { throw httpError(400, 'Invalid JSON'); }

  const { audioId, totalChunks } = body ?? {};
  if (!audioId) throw httpError(400, 'audioId required');
  if (!Number.isInteger(totalChunks) || totalChunks < 1) throw httpError(400, 'totalChunks required');

  // Enqueue one message per chunk.
  const messages: string[] = [];
  for (let i = 0; i < totalChunks; i++) {
    messages.push(JSON.stringify({
      kind: 'chunk',
      audioId,
      userId,
      chunkIndex: i,
      totalChunks,
    }));
  }

  // Cloudflare Queues `send` accepts an array; this is one network call.
  await env.TRANSCRIBE_JOBS.send(messages as any);

  return json({ enqueued: totalChunks, audioId });
}
