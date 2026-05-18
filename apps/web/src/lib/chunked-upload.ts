/**
 * Chunked-upload flow for audio transcription.
 *
 *   1. /chunked-upload/init  → { audioId } (or duplicate hit → instant)
 *   2. /chunked-upload/chunk × N (parallel, capped concurrency)
 *   3. /chunked-upload/process → enqueues N transcription jobs on the worker
 *
 * The browser then subscribes to /ws/status/{audioId} for progress updates
 * from the worker's Durable Object.
 */

import { chunkAudioFile, type ChunkProgress } from './audio-chunker';

const WORKER_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL ||
  'https://transcribe-worker.guiraocastells.workers.dev';

const UPLOAD_CONCURRENCY = 5;

export interface ChunkedUploadProgress {
  phase: 'chunking' | 'init' | 'uploading' | 'enqueueing' | 'done' | 'duplicate';
  progress: number; // 0..100
  message: string;
  audioId?: string;
}

export interface ChunkedUploadResult {
  audioId: string;
  totalChunks: number;
  totalDurationSec: number;
  duplicate: boolean;
}

export async function uploadAudioChunked(
  file: File | Blob,
  filename: string,
  accessToken: string,
  onProgress?: (p: ChunkedUploadProgress) => void
): Promise<ChunkedUploadResult> {
  // 1. Chunk client-side.
  const { chunks, totalDurationSec, sha256 } = await chunkAudioFile(file, (p: ChunkProgress) => {
    // Map chunker progress 0..100 into our 0..30 band.
    onProgress?.({
      phase: 'chunking',
      progress: Math.round(p.progress * 0.3),
      message: p.message,
    });
  });

  // 2. /init — get an audioId. May short-circuit on dedup hit.
  onProgress?.({ phase: 'init', progress: 32, message: 'Comprovant si ja existeix...' });
  const initRes = await fetchJson(`${WORKER_URL}/chunked-upload/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      originalFilename: filename,
      mimeType: (file as File).type || 'audio/wav',
      totalDurationSec,
      totalChunks: chunks.length,
      sha256,
    }),
  });

  if (initRes.duplicate) {
    onProgress?.({
      phase: 'duplicate',
      progress: 100,
      message: 'Aquest àudio ja s\'havia transcrit — recuperant transcripció existent.',
      audioId: initRes.sourceAudioId,
    });
    return {
      audioId: initRes.sourceAudioId,
      totalChunks: chunks.length,
      totalDurationSec,
      duplicate: true,
    };
  }

  const { audioId } = initRes;

  // 3. Upload original audio in parallel with the chunks. The original is
  //    kept after transcription so the in-app audio player can stream it back;
  //    the WAV chunks are deleted after the worker stitches the partials.
  onProgress?.({ phase: 'uploading', progress: 35, message: `Pujant 0/${chunks.length} segments...`, audioId });
  const sourcePromise = uploadSource(audioId, file, accessToken);

  let completed = 0;
  await runWithConcurrency(UPLOAD_CONCURRENCY, chunks, async (chunk) => {
    await uploadChunk(audioId, chunk.index, chunk.blob, accessToken);
    completed += 1;
    const pct = 35 + Math.round((completed / chunks.length) * 55);
    onProgress?.({
      phase: 'uploading',
      progress: pct,
      message: `Pujant ${completed}/${chunks.length} segments...`,
      audioId,
    });
  });

  // Make sure the source upload also finished before we tell the worker to enqueue.
  await sourcePromise;

  // 4. Tell worker to enqueue transcription jobs.
  onProgress?.({ phase: 'enqueueing', progress: 92, message: 'Iniciant transcripció...', audioId });
  await fetchJson(`${WORKER_URL}/chunked-upload/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ audioId, totalChunks: chunks.length }),
  });

  onProgress?.({
    phase: 'done',
    progress: 100,
    message: 'Pujada completada. Transcrivint...',
    audioId,
  });

  return { audioId, totalChunks: chunks.length, totalDurationSec, duplicate: false };
}

async function uploadSource(
  audioId: string,
  file: File | Blob,
  accessToken: string
): Promise<void> {
  const url = `${WORKER_URL}/chunked-upload/source?audioId=${encodeURIComponent(audioId)}`;
  const contentType = (file as File).type || 'application/octet-stream';
  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          Authorization: `Bearer ${accessToken}`,
        },
        body: file,
      });
      if (!res.ok) throw new Error(`source: HTTP ${res.status}`);
      return;
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await sleep(500 * Math.pow(2, attempt));
    }
  }
  throw lastErr ?? new Error('source upload failed');
}

async function uploadChunk(
  audioId: string,
  index: number,
  blob: Blob,
  accessToken: string
): Promise<void> {
  const url = `${WORKER_URL}/chunked-upload/chunk?audioId=${encodeURIComponent(audioId)}&index=${index}`;
  let lastErr: any;
  // Retry up to 3× with exponential backoff. Chunks are small so retries are cheap.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/wav',
          Authorization: `Bearer ${accessToken}`,
        },
        body: blob,
      });
      if (!res.ok) throw new Error(`chunk ${index}: HTTP ${res.status}`);
      return;
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await sleep(300 * Math.pow(2, attempt));
    }
  }
  throw lastErr ?? new Error(`chunk ${index} upload failed`);
}

async function fetchJson(url: string, init: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`${url} → ${res.status}: ${detail}`);
  }
  return res.json();
}

/** Run async work over `items` with bounded concurrency. */
async function runWithConcurrency<T>(
  concurrency: number,
  items: T[],
  worker: (item: T) => Promise<void>
): Promise<void> {
  const inFlight = new Set<Promise<void>>();
  for (const item of items) {
    if (inFlight.size >= concurrency) {
      await Promise.race(inFlight);
    }
    // Forward-declare so the IIFE's `finally` can self-remove from the set;
    // `let` is required for TS definite-assignment, despite the single write.
    // eslint-disable-next-line prefer-const
    let pRef!: Promise<void>;
    const p: Promise<void> = (async () => {
      try { await worker(item); }
      finally { inFlight.delete(pRef); }
    })();
    pRef = p;
    inFlight.add(p);
  }
  await Promise.all(inFlight);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
