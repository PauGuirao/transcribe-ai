import { NextRequest, NextResponse } from 'next/server';
import { getAuth, jsonError, getAudioContentType } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { supabase, user, error: userError } = await getAuth();
    if (userError || !user) {
      return jsonError('Authentication required. Please sign in.', { status: 401 });
    }

    // Get audio file info from database
    const { getAudioMeta } = await import('@/lib/data/audio')
    const { data: audioFile, error: audioError } = await getAudioMeta(supabase, user.id, id);

    if (audioError || !audioFile) {
      return jsonError('Audio file not found', { status: 404 });
    }

    // Download file from Cloudflare Worker R2 instead of Supabase Storage
    const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || 'https://transcribe-worker.guiraocastells.workers.dev';

    // Get user's access token for Worker authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return jsonError('Authentication token not available', { status: 401 });
    }

    // Forward Range header (if present) to the Worker so it can serve partial content
    const rangeHeader = request.headers.get('range') || undefined;

    // Fetch file from Worker's R2 download endpoint
    const workerResponse = await fetch(`${workerUrl}/download/audio-files/${user.id}/${audioFile.filename}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        ...(rangeHeader ? { 'Range': rangeHeader } : {}),
      },
    });

    if (!workerResponse.ok) {
      console.error('Worker download error:', workerResponse.status, workerResponse.statusText);
      return jsonError('Failed to download audio file from R2', { status: workerResponse.status });
    }

    // Stream the response from Worker without buffering, preserving status and headers for Range support
    const headers = new Headers();
    const contentType = workerResponse.headers.get('content-type') || audioFile.mime_type || getAudioContentType(audioFile.filename);
    headers.set('Content-Type', contentType);

    // Passthrough important headers and add defaults if missing
    const passthroughHeaderKeys = ['content-length', 'content-range', 'accept-ranges', 'cache-control', 'etag'];
    for (const key of passthroughHeaderKeys) {
      const val = workerResponse.headers.get(key);
      if (val) {
        headers.set(key.replace(/^[a-z]/, c => c.toUpperCase()).replace(/-[a-z]/g, s => s.toUpperCase()), val);
      }
    }

    // Ensure Accept-Ranges is present for reliable seeking
    if (!headers.has('Accept-Ranges')) {
      headers.set('Accept-Ranges', 'bytes');
    }
    // Ensure a sane Cache-Control for authenticated media
    if (!headers.has('Cache-Control')) {
      headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
    }

    // ETag passthrough is handled above; nothing else to compute client-side

    return new NextResponse(workerResponse.body, {
      status: workerResponse.status,
      headers,
    });
  } catch (error) {
    console.error('Error serving audio file:', error);
    return jsonError('Failed to serve audio file', { status: 500 });
  }
}