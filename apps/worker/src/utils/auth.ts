import type { Env } from '../types';

const CACHE_TTL_SECONDS = 60;

/** SHA-256 hex of a token, used as a cache key (never store raw tokens in KV). */
async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Resolve the Supabase user from the request's `Authorization: Bearer <jwt>`.
 *
 * Hot-path optimization: we cache `(token-hash → userId)` in KV for 60 s so
 * audio range requests and WebSocket reconnects don't roundtrip to Supabase
 * on every call. The TTL is short enough that a revoked token can't keep
 * working for more than a minute.
 */
export async function requireUser(request: Request, env: Env): Promise<string> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) throw httpError(401, 'Authorization required');
  const token = auth.slice(7);

  // Fast path: KV cache lookup.
  let cacheKey: string | null = null;
  if (env.CACHE) {
    try {
      cacheKey = `auth:user:${await hashToken(token)}`;
      const cached = await env.CACHE.get(cacheKey);
      if (cached) return cached;
    } catch {
      // Fall through to the network path.
    }
  }

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!res.ok) throw httpError(401, 'Invalid authentication token');

  const user = (await res.json()) as { id?: string } | null;
  if (!user?.id) throw httpError(401, 'User ID not found');
  const userId = user.id;

  if (env.CACHE && cacheKey) {
    // Don't await — cache write must not delay the response.
    env.CACHE.put(cacheKey, userId, { expirationTtl: CACHE_TTL_SECONDS }).catch(() => {});
  }
  return userId;
}

export function httpError(status: number, message: string, details?: any) {
  const err = new Error(message) as Error & { status: number; details?: any };
  err.status = status;
  err.details = details;
  return err;
}
