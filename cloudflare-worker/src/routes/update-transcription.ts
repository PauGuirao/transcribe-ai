import type { Env } from '../types';
import { json } from '../utils/http';
import { versionedTranscriptionPath } from '../utils/misc';
import { requireUser } from '../utils/auth';
import { upsertTranscription } from '../adapters/supabase';
import { r2Put } from '../adapters/r2';
import { cleanupOldVersions } from '../utils/storage-cleanup';

interface UpdateTranscriptionPayload {
  audioId: string;
  editedText: string;
  editedSegments?: any[];
  speakers?: any[];
}

export async function handleUpdateTranscriptionPost(
  request: Request,
  env: Env
): Promise<Response> {
  const fail = (status: number, msg: string, extra: Record<string, unknown> = {}) =>
    json({ ok: false, error: msg, ...extra }, status);

  try {
    // 1) Authenticate user
    const userId = await requireUser(request, env);
    if (!userId) {
      return fail(401, 'Authentication required');
    }

    // 2) Parse & validate payload
    let payload: UpdateTranscriptionPayload | undefined;
    try {
      payload = await request.json();
    } catch (e) {
      console.error('parse body error:', e);
      return fail(400, 'Invalid JSON payload');
    }

    const { audioId, editedText, editedSegments, speakers } = payload!;
    if (!audioId || !editedText) {
      return fail(400, 'Missing required fields: audioId, editedText');
    }

    console.log('🔄 update-transcription', { audioId, userId });

    // 3) Create new versioned path for the updated transcription
    const storagePath = versionedTranscriptionPath(userId, audioId);
    const transcriptionData = {
      text: editedText,
      segments: editedSegments || [],
      speakers: speakers || [],
      updated_at: new Date().toISOString(),
    };

    // 4) Save updated transcription JSON to R2
    try {
      console.log('💾 save updated transcription JSON to R2', { storagePath });
      await r2Put(
        env.TRANSCRIPTIONS,
        storagePath,
        JSON.stringify(transcriptionData, null, 2),
        'application/json'
      );

      // Cleanup old versions (non-blocking, best-effort)
      cleanupOldVersions(env.TRANSCRIPTIONS, userId, audioId).catch((e) => {
        console.warn('[UPDATE-TRANSCRIPTION] Cleanup failed (non-blocking):', e);
      });
    } catch (e) {
      console.error('R2 upload (TRANSCRIPTIONS) failed:', e);
      return fail(502, "No s'ha pogut desar la transcripció actualitzada.");
    }

    // 5) Update transcription row in DB with new path
    try {
      console.log('💾 update transcription row', { audioId, userId });
      await upsertTranscription(env, {
        id: audioId,
        audio_id: audioId,
        user_id: userId,
        json_path: storagePath,
        updated_at: transcriptionData.updated_at,
      });
    } catch (e: any) {
      console.error('upsertTranscription failed:', e);
      return fail(502, 'Failed to update transcription record in database');
    }

    return json({
      ok: true,
      message: 'Transcription updated successfully',
      storagePath,
      updatedAt: transcriptionData.updated_at,
    });

  } catch (error: any) {
    console.error('[UPDATE-TRANSCRIPTION] Unexpected error:', error);
    return fail(500, 'Internal server error', { details: error?.message });
  }
}