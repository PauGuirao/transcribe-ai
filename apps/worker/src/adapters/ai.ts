import type { Env } from '../types';
import { base64FromArrayBuffer } from '../utils/misc';

const AI_MAX_SIZE_MB = 25;
const AI_MAX_SIZE_BYTES = AI_MAX_SIZE_MB * 1024 * 1024;

const INITIAL_PROMPT_CA = 'Sessió de logopèdia en català. Diàleg entre logopeda i pacient.';

export interface TranscribeOptions {
  /** Seconds to add to every segment timestamp. Used when the audio is one chunk of a longer file. */
  timeOffsetSec?: number;
  /** Override language code. Default 'ca'. */
  language?: string;
  /** Override initial prompt. */
  initialPrompt?: string;
  /**
   * Per-user glossary (patient names, technical vocabulary). When provided,
   * it's appended to the default initial prompt so Whisper biases its
   * acoustic decoder toward those exact spellings. Ignored if `initialPrompt`
   * is explicitly set.
   */
  glossary?: string[];
}

export async function transcribeWithWorkersAI(
  env: Env,
  audio: ArrayBuffer,
  filename: string,
  options: TranscribeOptions = {}
) {
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

  console.log(`[AI] Transcribing ${filename}: ${sizeMB.toFixed(2)}MB (offset=${options.timeOffsetSec ?? 0}s)`);

  const baseInitialPrompt = options.initialPrompt ?? INITIAL_PROMPT_CA;
  const initialPrompt =
    options.initialPrompt !== undefined
      ? options.initialPrompt
      : composeInitialPrompt(baseInitialPrompt, options.glossary);

  const response = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
    audio: base64FromArrayBuffer(audio),
    language: options.language ?? 'ca',
    initial_prompt: initialPrompt,
    // Critical for chunked audio: prevent hallucination loops when chunk lacks prior context.
    condition_on_previous_text: false,
    // Skip silent regions (helpful for therapy sessions with quiet pauses).
    vad_filter: true,
  });

  const text = response.text ?? '';
  const offset = options.timeOffsetSec ?? 0;
  const rawSegments = response.segments ?? [{ text, start: 0, end: 0, words: [] }];
  const segments = rawSegments.map((s: any) => ({
    text: s.text ?? '',
    start: (typeof s.start === 'number' ? s.start : 0) + offset,
    end: (typeof s.end === 'number' ? s.end : 0) + offset,
    // Preserve per-word timestamps so the editor can do fine-grained audio
    // sync after the user freely edits the text.
    words: Array.isArray(s.words)
      ? s.words.map((w: any) => ({
          word: typeof w.word === 'string' ? w.word : '',
          start: (typeof w.start === 'number' ? w.start : 0) + offset,
          end: (typeof w.end === 'number' ? w.end : 0) + offset,
        }))
      : undefined,
  }));

  return { text, segments };
}

/**
 * Whisper's `initial_prompt` is limited to ~224 tokens. We append a compact
 * comma-separated glossary so the model favors those exact spellings.
 */
function composeInitialPrompt(base: string, glossary: string[] | undefined): string {
  if (!glossary || glossary.length === 0) return base;
  const joined = glossary.slice(0, 30).join(', ');
  const compact = joined.length > 180 ? joined.slice(0, 177) + '…' : joined;
  return `${base} Termes habituals: ${compact}.`;
}

export function sanitizeSegments(segs: any[]) {
  if (!Array.isArray(segs)) return [];
  return segs.map((s) => ({
    text: s.text ?? '',
    start: typeof s.start === 'number' ? s.start : 0,
    end: typeof s.end === 'number' ? s.end : 0,
    words: Array.isArray(s.words)
      ? s.words.map((w: any) => ({
          word: typeof w.word === 'string' ? w.word : '',
          start: typeof w.start === 'number' ? w.start : 0,
          end: typeof w.end === 'number' ? w.end : 0,
        }))
      : undefined,
  }));
}
