import { json } from '../utils/http';
import { requireUser } from '../utils/auth';
import type { Env } from '../types';
import { r2Delete } from '../adapters/r2';

export async function remove(request: Request, env: Env) {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean); // ['delete', userId, filename]
  if (parts.length !== 3) return json({ error: 'Invalid delete path' }, 400);

  const userId = parts[1];
  const filename = parts[2];
  const authedUserId = await requireUser(request, env);
  if (authedUserId !== userId) return json({ error: 'Access denied' }, 403);

  const audioId = filename.split('.')[0];

  // Ensure the record exists for this user
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/audios?id=eq.${audioId}&user_id=eq.${userId}`, {
    headers: { 'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'apikey': env.SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!res.ok) return json({ error: 'Failed to verify file ownership' }, 500);
  const rows = (await res.json()) as unknown[] | null;
  if (!rows?.length) return json({ error: 'File not found or access denied' }, 404);

  // Delete audio file from R2
  await r2Delete(env.AUDIO_FILES, `${userId}/${filename}`);

  // Delete associated transcription files from R2 (best-effort)
  try {
    const transcriptionPrefix = `${userId}/${audioId}/`;
    const transcriptionList = await env.TRANSCRIPTIONS.list({ prefix: transcriptionPrefix, limit: 100 });
    for (const obj of transcriptionList.objects) {
      await r2Delete(env.TRANSCRIPTIONS, obj.key);
    }
  } catch (e) {
    console.warn('Failed to delete transcription files (continuing):', e);
  }

  // Delete from DB
  const del = await fetch(`${env.SUPABASE_URL}/rest/v1/audios?id=eq.${audioId}`, {
    method:'DELETE', headers:{ 'Authorization':`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'apikey': env.SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!del.ok) return json({ success:false, error:'File deleted from storage but database cleanup failed' }, 500);

  return json({ success:true, message:'File deleted', audioId, filePath:`${userId}/${filename}` });
}
