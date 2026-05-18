import type { Env } from '../types';
import { base64FromArrayBuffer } from '../utils/misc';

// AI service limit
const AI_MAX_SIZE_MB = 25;
const AI_MAX_SIZE_BYTES = AI_MAX_SIZE_MB * 1024 * 1024;

export async function transcribeWithWorkersAI(env: Env, audio: ArrayBuffer, filename: string) {
  const sizeBytes = audio.byteLength;
  const sizeMB = sizeBytes / (1024 * 1024);

  if (sizeBytes > AI_MAX_SIZE_BYTES) {
    const error = new Error(
      `El fitxer d'àudio és massa gran per a la transcripció. ` +
      `Mida actual: ${sizeMB.toFixed(2)} MB, màxim permès: ${AI_MAX_SIZE_MB} MB. ` +
      `Si us plau, comprimir l'àudio abans de pujar-lo.`
    );
    (error as any).code = 'AI_FILE_TOO_LARGE';
    (error as any).fileSize = sizeBytes;
    (error as any).maxSize = AI_MAX_SIZE_BYTES;
    (error as any).filename = filename;
    throw error;
  }

  console.log(`[AI] Transcribing ${filename}: ${sizeMB.toFixed(2)}MB`);

  const response = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
    audio: base64FromArrayBuffer(audio),
    language: 'ca',
  });

  const text = response.text ?? '';
  const segments = response.segments ?? [{ text, start:0, end:0 }];
  return { text, segments };
}

export function sanitizeSegments(segs: any[]) {
  if (!Array.isArray(segs)) return [];
  return segs.map(s => ({ text: s.text ?? '', start: typeof s.start==='number'?s.start:0, end: typeof s.end==='number'?s.end:0 }));
}
