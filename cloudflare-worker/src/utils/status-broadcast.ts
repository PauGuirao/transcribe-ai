import type { Env } from '../types';

interface StatusUpdate {
  audioId: string;
  status: 'pending' | 'processing' | 'transcribing' | 'completed' | 'error';
  progress: number;
  message?: string;
}

/**
 * Broadcast status update to connected WebSocket clients via Durable Object
 */
export async function broadcastStatus(env: Env, update: StatusUpdate): Promise<void> {
  if (!env.TRANSCRIPTION_STATUS) {
    console.log('[STATUS] Durable Object not configured, skipping broadcast');
    return;
  }

  try {
    const id = env.TRANSCRIPTION_STATUS.idFromName(update.audioId);
    const stub = env.TRANSCRIPTION_STATUS.get(id);

    const response = await stub.fetch(new Request('https://internal/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    }));

    if (!response.ok) {
      console.warn('[STATUS] Failed to broadcast:', await response.text());
    }
  } catch (e) {
    console.warn('[STATUS] Broadcast error (non-fatal):', e);
  }
}

/**
 * Cache audio metadata in KV for faster lookups
 */
export async function cacheAudioMetadata(
  env: Env,
  audioId: string,
  metadata: Record<string, any>
): Promise<void> {
  if (!env.CACHE) return;

  try {
    await env.CACHE.put(
      `audio:${audioId}`,
      JSON.stringify(metadata),
      { expirationTtl: 3600 } // 1 hour
    );
  } catch (e) {
    console.warn('[CACHE] Failed to cache metadata:', e);
  }
}

/**
 * Get cached audio metadata from KV
 */
export async function getCachedAudioMetadata(
  env: Env,
  audioId: string
): Promise<Record<string, any> | null> {
  if (!env.CACHE) return null;

  try {
    const cached = await env.CACHE.get(`audio:${audioId}`, { type: 'json' });
    return cached as Record<string, any> | null;
  } catch {
    return null;
  }
}

/**
 * Invalidate cached audio metadata
 */
export async function invalidateAudioCache(env: Env, audioId: string): Promise<void> {
  if (!env.CACHE) return;

  try {
    await env.CACHE.delete(`audio:${audioId}`);
  } catch (e) {
    console.warn('[CACHE] Failed to invalidate:', e);
  }
}
