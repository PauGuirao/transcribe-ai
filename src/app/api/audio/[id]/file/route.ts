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

    // Fetch file from Worker's R2 download endpoint
    const workerResponse = await fetch(`${workerUrl}/download/audio-files/${user.id}/${audioFile.filename}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!workerResponse.ok) {
      console.error('Worker download error:', workerResponse.status, workerResponse.statusText);
      return jsonError('Failed to download audio file from R2', { status: 500 });
    }

    // Get file buffer from Worker response
    const fileBuffer = await workerResponse.arrayBuffer();
    const contentType = audioFile.mime_type || getAudioContentType(audioFile.filename);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error serving audio file:', error);
    return jsonError('Failed to serve audio file', { status: 500 });
  }
}