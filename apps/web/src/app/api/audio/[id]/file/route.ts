import { NextRequest, NextResponse } from 'next/server';
import { getAuth, jsonError, getAudioContentType } from '@/lib/api-helpers';

const WORKER_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL ||
  'https://transcribe-worker.guiraocastells.workers.dev';

/**
 * Ask the worker for a direct R2 URL (public or signed). When the worker can
 * give us a URL the browser can fetch on its own, we 302-redirect there — the
 * browser then streams audio bytes directly from R2, skipping this Next.js
 * route entirely on every subsequent range request. That removes ~100-200 ms
 * of proxy latency per seek on slow connections.
 *
 * Returns null when the worker only has a worker-proxy URL available (those
 * require an Authorization header that <audio> won't carry across a redirect)
 * or on any failure — in which case we fall back to streaming through here.
 */
async function tryGetDirectUrl(
  audioId: string,
  filename: string,
  accessToken: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${WORKER_URL}/public-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ audioId, filename }),
      // Tight timeout — we'd rather fall back to proxy than block playback.
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string; type?: string };
    if (!data.url) return null;
    // 'worker' fallback can't be redirected to — browser would lose the
    // Authorization header. Only public buckets and signed S3 URLs are usable.
    if (data.type !== 'public' && data.type !== 'signed') return null;
    return data.url;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const { supabase, user, error: userError } = await getAuth();
    if (userError || !user) {
      return jsonError('Authentication required. Please sign in.', { status: 401 });
    }

    const { getAudioMeta } = await import('@/lib/data/audio');
    const { data: audioFile, error: audioError } = await getAudioMeta(supabase, user.id, id);

    if (audioError || !audioFile) {
      return jsonError('Audio file not found', { status: 404 });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return jsonError('Authentication token not available', { status: 401 });
    }

    // Fast path: 302 to a direct R2 URL when available.
    const directUrl = await tryGetDirectUrl(id, audioFile.filename, session.access_token);
    if (directUrl) {
      // 307 preserves the GET method + Range header on the follow-up request.
      return NextResponse.redirect(directUrl, 307);
    }

    // Fallback: proxy-stream from the worker (preserves Range support).
    const rangeHeader = request.headers.get('range') || undefined;
    const workerResponse = await fetch(
      `${WORKER_URL}/download/audio-files/${user.id}/${audioFile.filename}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          ...(rangeHeader ? { Range: rangeHeader } : {}),
        },
      },
    );

    if (!workerResponse.ok) {
      console.error('Worker download error:', workerResponse.status, workerResponse.statusText);
      return jsonError('Failed to download audio file from R2', { status: workerResponse.status });
    }

    const headers = new Headers();
    const contentType =
      workerResponse.headers.get('content-type') ||
      audioFile.mime_type ||
      getAudioContentType(audioFile.filename);
    headers.set('Content-Type', contentType);

    const passthroughHeaderKeys = [
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
      'etag',
    ];
    for (const key of passthroughHeaderKeys) {
      const val = workerResponse.headers.get(key);
      if (val) {
        headers.set(
          key
            .replace(/^[a-z]/, (c) => c.toUpperCase())
            .replace(/-[a-z]/g, (s) => s.toUpperCase()),
          val,
        );
      }
    }

    if (!headers.has('Accept-Ranges')) headers.set('Accept-Ranges', 'bytes');
    if (!headers.has('Cache-Control')) {
      headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
    }

    return new NextResponse(workerResponse.body, {
      status: workerResponse.status,
      headers,
    });
  } catch (error) {
    console.error('Error serving audio file:', error);
    return jsonError('Failed to serve audio file', { status: 500 });
  }
}
