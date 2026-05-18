import type { Speaker } from '@/types';

/** Maximum number of speakers per transcription. */
export const MAX_SPEAKERS = 10;

/**
 * Fixed palette of 10 visually-distinguishable colors. Picked to be legible
 * as chip backgrounds with white text and to read distinctly from each other.
 */
export const SPEAKER_COLOR_PALETTE = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16', // lime
];

/** Pick the next unused palette color, or wrap around if all are used. */
export function nextSpeakerColor(existing: Speaker[]): string {
  const used = new Set(existing.map((s) => s.color));
  return (
    SPEAKER_COLOR_PALETTE.find((c) => !used.has(c)) ??
    SPEAKER_COLOR_PALETTE[existing.length % SPEAKER_COLOR_PALETTE.length]
  );
}

/** Generate a stable-ish id without pulling in uuid. */
export function newSpeakerId(): string {
  return `speaker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Default name for a freshly-added speaker. Picks "Speaker N" where N is the
 * smallest positive integer not already in use.
 */
export function newSpeakerName(existing: Speaker[]): string {
  const used = new Set(
    existing
      .map((s) => /^Speaker (\d+)$/.exec(s.name)?.[1])
      .filter((n): n is string => Boolean(n))
      .map(Number),
  );
  let n = 1;
  while (used.has(n)) n += 1;
  return `Speaker ${n}`;
}

/** Convenience: build a fully-formed Speaker with sensible defaults. */
export function createSpeaker(existing: Speaker[], name?: string): Speaker {
  return {
    id: newSpeakerId(),
    name: name?.trim() || newSpeakerName(existing),
    color: nextSpeakerColor(existing),
  };
}
