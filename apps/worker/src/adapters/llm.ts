// LLM revision adapter — second-pass correction for ASR output.
//
// Pipeline:
//   Whisper → reviseTranscript() → corrected segments → R2 + Supabase
//
// We use Workers AI's Mistral Small 3.1 24B by default. It's multilingual
// (strong on Catalan/Spanish), supports JSON output, and is cheap+fast enough
// to run on every transcription. Falls back to the original segments if the
// model returns malformed JSON or errors out — the user should never see a
// worse result than what Whisper produced.

import type { Env } from '../types';

export const DEFAULT_REVISION_MODEL = '@cf/mistralai/mistral-small-3.1-24b-instruct';

export interface Segment {
  text: string;
  start: number;
  end: number;
  words?: Array<{ word: string; start: number; end: number }>;
}

export interface ReviseOptions {
  segments: Segment[];
  /** ISO locale, e.g. 'ca-ES', 'es-ES', 'en-US'. Defaults to Catalan. */
  locale?: string;
  /** Per-user glossary (patient names, technical terms). */
  glossary?: string[];
  /** Override model id. */
  model?: string;
  /** Hard upper bound on input segments per request. Longer transcripts are split. */
  batchSize?: number;
}

export interface ReviseResult {
  segments: Segment[];
  /** Model id that produced the revision. Null when we fell back to the original. */
  model: string | null;
  /** True if revision succeeded for every batch. */
  ok: boolean;
}

/**
 * Run a second-pass LLM revision over Whisper segments.
 *
 * Contract:
 *   - Returns segments with the SAME count and SAME start/end values.
 *   - Only `text` (and optionally `words[].word`) may change.
 *   - On any error, returns the original segments and `ok=false`.
 */
export async function reviseTranscript(
  env: Env,
  opts: ReviseOptions,
): Promise<ReviseResult> {
  const { segments, glossary = [] } = opts;
  const locale = (opts.locale ?? 'ca-ES').toLowerCase();
  const model = opts.model ?? DEFAULT_REVISION_MODEL;
  const batchSize = opts.batchSize ?? 80;

  if (!segments.length) return { segments, model: null, ok: true };

  // Split very long transcripts into batches so we don't blow context. The
  // model returns each batch independently; we concat the results.
  const batches: Segment[][] = [];
  for (let i = 0; i < segments.length; i += batchSize) {
    batches.push(segments.slice(i, i + batchSize));
  }

  const out: Segment[] = [];
  let allOk = true;

  for (const [i, batch] of batches.entries()) {
    try {
      const revised = await reviseBatch(env, model, batch, locale, glossary);
      out.push(...revised);
    } catch (err: any) {
      console.warn(`[LLM] revision batch ${i + 1}/${batches.length} failed:`, err?.message || err);
      out.push(...batch); // keep original
      allOk = false;
    }
  }

  return { segments: out, model: allOk ? model : null, ok: allOk };
}

/* -------------------------------------------------------------------------- */
/* Internals                                                                  */
/* -------------------------------------------------------------------------- */

function buildSystemPrompt(locale: string, glossary: string[]): string {
  const isCatalan = locale.startsWith('ca');
  const isSpanish = locale.startsWith('es');
  const langLabel = isCatalan ? 'Catalan' : isSpanish ? 'Spanish' : 'English';
  const targetCopy = isCatalan
    ? 'Catalan, possibly mixed with Spanish'
    : isSpanish
    ? 'Spanish, possibly mixed with Catalan'
    : 'English';

  const glossaryBlock = glossary.length
    ? `\nGlossary (always trust these spellings, do NOT change them):\n${glossary.map((g) => `  - ${g}`).join('\n')}`
    : '';

  return `You are correcting an ASR (speech-to-text) transcript of a clinical session in ${targetCopy}.

Your job:
  • Fix obvious phonetic errors using context (coche/porche, valla/vaya, b/v, ll/y).
  • Add punctuation and capitalization where missing.
  • Keep the SAME number of segments with the SAME start/end values.
  • Only the "text" field may change.
  • Do NOT invent content. If you are not confident, leave the segment as-is.
  • Do NOT translate. Keep the original language (${langLabel}).
  • Do NOT merge or split segments.${glossaryBlock}

Return ONLY a JSON object of the form: { "segments": [{ "text": "..." }, ...] }
with EXACTLY as many entries as the input.`;
}

async function reviseBatch(
  env: Env,
  model: string,
  batch: Segment[],
  locale: string,
  glossary: string[],
): Promise<Segment[]> {
  const system = buildSystemPrompt(locale, glossary);

  // Send only the text fields — keeps tokens low and avoids confusing the
  // model with timing data it shouldn't touch.
  const inputJson = JSON.stringify({
    segments: batch.map((s, i) => ({ i, text: s.text })),
  });

  const response: any = await env.AI.run(model, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: inputJson },
    ],
    max_tokens: Math.min(8192, batch.length * 80 + 512),
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  // Workers AI returns `{ response: "..." }` for chat models. Newer models may
  // also return `{ choices: [{ message: { content: "..." } }] }`. Handle both.
  const raw =
    typeof response?.response === 'string'
      ? response.response
      : response?.choices?.[0]?.message?.content ?? '';

  const parsed = safeParse(raw);
  const revisedSegments: any[] = Array.isArray(parsed?.segments) ? parsed.segments : [];

  if (revisedSegments.length !== batch.length) {
    throw new Error(`segment count mismatch: got ${revisedSegments.length}, expected ${batch.length}`);
  }

  // Merge: keep original timings + words, replace text only.
  return batch.map((orig, i) => {
    const incoming = revisedSegments[i];
    const newText =
      typeof incoming?.text === 'string' && incoming.text.trim().length > 0
        ? incoming.text.trim()
        : orig.text;
    return { ...orig, text: newText };
  });
}

function safeParse(s: string): any {
  if (!s) return null;
  // Some models wrap JSON in markdown fences. Strip them defensively.
  const cleaned = s
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Last-ditch: pull the first {...} block.
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Glossary helpers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Compose a Whisper `initial_prompt` from the user's glossary. Whisper uses
 * this string to bias acoustic decoding — exact-token hints work best.
 *
 * Keep it short (<224 tokens / ~200 chars) — longer prompts are truncated.
 */
export function glossaryToInitialPrompt(glossary: string[] | undefined, fallback: string): string {
  if (!glossary || glossary.length === 0) return fallback;
  const joined = glossary.slice(0, 30).join(', ');
  const compact = joined.length > 180 ? joined.slice(0, 177) + '…' : joined;
  return `${fallback} Termes habituals: ${compact}.`;
}
