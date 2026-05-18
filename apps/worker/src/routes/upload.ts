import { json } from '../utils/http';
import { requireUser } from '../utils/auth';
import { ALLOWED_AUDIO_TYPES, getContentType } from '../utils/misc';
import { uuidv4 } from '../utils/ids';
import type { Env } from '../types';
import { r2Put, r2Delete } from '../adapters/r2';
import { insertAudio } from '../adapters/supabase';

// File size limits
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB max upload size (should be compressed by client if larger)
const AI_SERVICE_LIMIT = 25 * 1024 * 1024; // 25MB AI service limit

export async function upload(request: Request, env: Env) {
  const userId = await requireUser(request, env);

  const form = await request.formData();
  const file = form.get('file') as File | null;
  const originalFilename = (form.get('originalFilename') as string) || file?.name;

  if (!file) return json({ error: 'No file provided' }, 400);
  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) return json({ error: 'Invalid file type', allowedTypes: ALLOWED_AUDIO_TYPES }, 400);

  // File size validation with helpful error messages
  if (file.size > MAX_UPLOAD_SIZE) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const maxSizeMB = (MAX_UPLOAD_SIZE / (1024 * 1024)).toFixed(0);
    return json({
      error: `El fitxer és massa gran (${fileSizeMB} MB). La mida màxima és ${maxSizeMB} MB.`,
      code: 'FILE_TOO_LARGE',
      fileSize: file.size,
      maxSize: MAX_UPLOAD_SIZE,
    }, 413);
  }

  // Warn if file is above AI service limit (transcription may fail)
  if (file.size > AI_SERVICE_LIMIT) {
    console.warn(`[UPLOAD] File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds AI limit of 25MB. Transcription may fail.`);
  }

  const ext = (originalFilename?.split('.').pop() || 'audio').toLowerCase();
  const audioId = uuidv4();
  const uniqueFilename = `${audioId}.${ext}`;
  const filePath = `${userId}/${uniqueFilename}`;

  // Stream the file directly to R2 instead of buffering into memory
  const stream = file.stream();
  await r2Put(env.AUDIO_FILES, filePath, stream as unknown as ReadableStream, getContentType(uniqueFilename));

  try {
    const record = {
      id: audioId, user_id: userId, filename: uniqueFilename,
      original_filename: originalFilename, storage_path: filePath, status: 'uploaded',
    };
    const inserted = (await insertAudio(env, record)) as any;
    return json({ success: true, audioId, filename: uniqueFilename, originalName: originalFilename, filePath, fileSize: file.size, mimeType: file.type, record: inserted?.[0] ?? inserted });
  } catch (e: any) {
    await r2Delete(env.AUDIO_FILES, filePath);
    return json({ error: 'Failed to create audio record', details: e?.message }, 500);
  }
}
