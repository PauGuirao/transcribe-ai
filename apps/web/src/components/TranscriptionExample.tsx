'use client';

/**
 * Hero animation for the landing page.
 *
 * Loops a 4-phase sequence that mirrors the real product:
 *   idle      → empty drop zone with a soft cue
 *   uploading → file card lands in the zone, progress bar fills
 *   live      → file collapses to a top chip; waveform appears below with a
 *               play-head sweeping left→right; transcript lines reveal
 *               word-by-word, the active word karaoke-highlighted in amber
 *   done      → final transcript with stats footer; holds, then resets
 *
 * Respects `prefers-reduced-motion`: collapses the loop to a static
 * end-state so motion-sensitive users don't see the full sequence.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  Check,
  Copy,
  FileAudio,
  FileText,
  Mail,
  Pause,
  Play,
  UploadCloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Phase = 'idle' | 'uploading' | 'live' | 'done' | 'exporting' | 'sent';

/** Mock recipient shown in the "sent to …" pill. Locale-neutral. */
const MOCK_RECIPIENT = 'ana@clinic.cat';

interface TranscriptionLine {
  speaker: string;
  text: string;
}

const WAVE_BAR_COUNT = 64;

/** Stable pseudo-random heights so SSR + client match. */
const WAVE_HEIGHTS = (() => {
  // Simple deterministic LCG seeded with a constant.
  let s = 2147483647 / 7;
  const out: number[] = [];
  for (let i = 0; i < WAVE_BAR_COUNT; i++) {
    s = (s * 9301 + 49297) % 233280;
    const noise = s / 233280;
    // Bell-ish profile: higher in the middle, lower at the edges.
    const profile = Math.sin((i / (WAVE_BAR_COUNT - 1)) * Math.PI);
    out.push(0.25 + 0.7 * profile * (0.6 + 0.4 * noise));
  }
  return out;
})();

export function TranscriptionExample() {
  const t = useTranslations('transcriptionExample');
  const reduce = useReducedMotion();
  const lines = (t.raw('lines') as TranscriptionLine[]) ?? [];

  const [phase, setPhase] = useState<Phase>('idle');
  /** 0..1 progress used by both the upload bar and the live play-head. */
  const [progress, setProgress] = useState(0);
  const tickRef = useRef<number | null>(null);

  /* -------------------- Phase sequencing ----------------------------- */
  useEffect(() => {
    if (reduce) {
      // Reduced motion: skip straight to the end-state.
      setPhase('done');
      setProgress(1);
      return;
    }

    let cancelled = false;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(resolve, ms);
        if (cancelled) window.clearTimeout(id);
      });

    const runOnce = async () => {
      // Reset
      setPhase('idle');
      setProgress(0);
      await wait(700);

      // Upload — progress 0→1 over ~1.4s
      setPhase('uploading');
      const uploadDuration = 1400;
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const step = (now: number) => {
          if (cancelled) return resolve();
          const p = Math.min(1, (now - start) / uploadDuration);
          setProgress(p);
          if (p < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });

      await wait(250);

      // Live — play-head sweeps over ~4.5s. Transcript lines reveal in sync.
      setPhase('live');
      setProgress(0);
      const liveDuration = 4500;
      const liveStart = performance.now();
      await new Promise<void>((resolve) => {
        const step = (now: number) => {
          if (cancelled) return resolve();
          const p = Math.min(1, (now - liveStart) / liveDuration);
          setProgress(p);
          if (p < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });

      // Done — brief hold so the reader sees the full transcript.
      setPhase('done');
      await wait(1800);

      // Export menu opens, Mail gets "clicked".
      setPhase('exporting');
      await wait(1700);

      // Document flies to the recipient + "Sent" confirmation.
      setPhase('sent');
      await wait(1900);
    };

    let running = true;
    const loop = async () => {
      while (running && !cancelled) {
        await runOnce();
      }
    };
    void loop();

    return () => {
      running = false;
      cancelled = true;
      if (tickRef.current != null) {
        cancelAnimationFrame(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [reduce]);

  /* -------------------- Derived state -------------------------------- */

  // Words per line, flattened so we can decide which is "active" by the
  // play-head position.
  const flatWords = useMemo(() => {
    const out: Array<{ lineIdx: number; wordIdx: number; word: string }> = [];
    lines.forEach((line, lineIdx) => {
      line.text.split(/\s+/).forEach((word, wordIdx) => {
        out.push({ lineIdx, wordIdx, word });
      });
    });
    return out;
  }, [lines]);

  const totalWords = flatWords.length || 1;
  // After 'done', all later phases (exporting / sent) keep showing the full
  // transcript so the UI stays anchored while the export overlay plays.
  const transcriptComplete =
    phase === 'done' || phase === 'exporting' || phase === 'sent';
  const wordsRevealed =
    phase === 'live'
      ? Math.floor(progress * totalWords)
      : transcriptComplete
        ? totalWords
        : 0;
  const linesRevealed = transcriptComplete
    ? lines.length
    : phase === 'live'
      ? Math.min(
          lines.length,
          (flatWords[Math.max(0, wordsRevealed - 1)]?.lineIdx ?? 0) + 1,
        )
      : 0;
  const activeWordOffset = Math.max(0, wordsRevealed - 1);
  const showLiveOrAfter =
    phase === 'live' || phase === 'done' || phase === 'exporting' || phase === 'sent';

  return (
    <div className="w-full">
      <div className="relative h-[420px] overflow-hidden">
        <LayoutGroup>
          {/* --------- Drop zone / upload (idle + uploading) ------------ */}
          <AnimatePresence>
            {(phase === 'idle' || phase === 'uploading') && (
              <motion.div
                key="dropzone"
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  layoutId="dropzone-frame"
                  className={cn(
                    'flex h-[360px] w-full items-center justify-center rounded-2xl border-2 border-dashed transition-colors',
                    phase === 'uploading'
                      ? 'border-indigo-300 bg-indigo-50/60'
                      : 'border-neutral-200 bg-neutral-50/60',
                  )}
                >
                  {phase === 'idle' && (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex size-12 items-center justify-center rounded-xl border border-neutral-200 bg-white shadow-sm">
                        <UploadCloud className="size-5 text-neutral-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-700">
                          {t('dropzone')}
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                          MP3 · WAV · M4A · OGG
                        </p>
                      </div>
                    </div>
                  )}

                  {phase === 'uploading' && (
                    <FileCard
                      filename={t('filename')}
                      progress={progress}
                      animated
                    />
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* --------- Live + done + export overlay -------------------- */}
          <AnimatePresence>
            {showLiveOrAfter && (
              <motion.div
                key="live"
                className="absolute inset-0 flex flex-col gap-5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                {/* Top: file chip + waveform */}
                <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-center gap-3">
                    <button
                      type="button"
                      tabIndex={-1}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white"
                      aria-hidden="true"
                    >
                      {phase === 'done' ? (
                        <Play className="size-4 translate-x-[1px]" />
                      ) : (
                        <Pause className="size-4" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {t('filename')}
                      </p>
                      <p className="text-[11px] text-neutral-500 tabular-nums">
                        {formatMmSs(progress * 15.5 * 60)} / 15:32
                      </p>
                    </div>
                    <div className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 sm:inline-flex">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      98.5%
                    </div>
                  </div>

                  <Waveform progress={progress} />
                </div>

                {/* Bottom: transcript reveal */}
                <div className="flex-1 overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="space-y-3">
                    {lines.slice(0, linesRevealed).map((line, lineIdx) => {
                      // Words belonging to this line.
                      const wordObjs = flatWords.filter(
                        (w) => w.lineIdx === lineIdx,
                      );
                      // Global offset where this line starts.
                      const lineStart = flatWords.findIndex(
                        (w) => w.lineIdx === lineIdx,
                      );
                      const isLogopeda = line.speaker === t('speaker1');
                      return (
                        <motion.div
                          key={lineIdx}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                          className="flex items-start gap-3"
                        >
                          <span
                            className={cn(
                              'mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white',
                              isLogopeda ? 'bg-blue-500' : 'bg-rose-500',
                            )}
                          >
                            {line.speaker}
                          </span>
                          <p className="text-[13px] leading-relaxed text-neutral-800">
                            {wordObjs.map((w, i) => {
                              const globalIdx = lineStart + i;
                              const shown = globalIdx < wordsRevealed;
                              const isActive =
                                phase === 'live' && globalIdx === activeWordOffset;
                              if (!shown) return null;
                              return (
                                <motion.span
                                  key={`${lineIdx}-${i}`}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.15 }}
                                  className={cn(
                                    'inline rounded px-[2px] transition-colors duration-150',
                                    isActive &&
                                      'bg-amber-300/55 text-neutral-900',
                                  )}
                                >
                                  {w.word}
                                  {i < wordObjs.length - 1 ? ' ' : ''}
                                </motion.span>
                              );
                            })}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Stats footer once transcript is complete */}
                  <AnimatePresence>
                    {transcriptComplete && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                        className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-[11px] text-neutral-500"
                      >
                        <span>
                          {t('duration')}: <span className="tabular-nums">15:32</span>
                        </span>
                        <span>
                          {t('words')}: <span className="tabular-nums">1,247</span>
                        </span>
                        <span>
                          {t('accuracy')}: <span className="tabular-nums">98.5%</span>
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Export overlay — only during the export/sent phases */}
                <ExportOverlay phase={phase} filename={t('filename')} />
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </div>
    </div>
  );
}

/* ----------------------- Export + send overlay ----------------------- */

function ExportOverlay({ phase, filename }: { phase: Phase; filename: string }) {
  if (phase !== 'exporting' && phase !== 'sent') return null;

  // Mail "click" highlight kicks in shortly after the menu opens, then the
  // doc fly-out starts. Both are pure framer-motion transitions; no state.
  const docName = filename.replace(/\.[^.]+$/, '') + '.pdf';

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Recipient chip — the destination the document flies to. */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 shadow-sm"
      >
        <div className="flex size-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-semibold text-white">
          A
        </div>
        {MOCK_RECIPIENT}
      </motion.div>

      {/* Export menu — slides up from the bottom-right. */}
      <AnimatePresence>
        {phase === 'exporting' && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute bottom-3 right-3 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white p-1 shadow-lg"
          >
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Exportar
            </div>
            <ExportRow icon={<FileText className="size-3.5 text-rose-500" />} label="PDF" />
            <ExportRow icon={<FileText className="size-3.5 text-sky-500" />} label="Word" />
            <ExportRow icon={<Copy className="size-3.5 text-neutral-500" />} label="Copiar" />
            <ExportRow
              icon={<Mail className="size-3.5 text-neutral-500" />}
              label="Enviar per correu"
              highlight
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flying document — appears in front of the menu, then translates up to
          the recipient chip and fades out. */}
      <motion.div
        key={phase /* re-run when phase changes */}
        initial={
          phase === 'exporting'
            ? { opacity: 0, scale: 0.9, x: 0, y: 0 }
            : { opacity: 1, scale: 1, x: 0, y: 0 }
        }
        animate={
          phase === 'sent'
            ? { opacity: 0, scale: 0.6, x: 60, y: -180 }
            : { opacity: 1, scale: 1, x: 0, y: 0 }
        }
        transition={{
          duration: phase === 'sent' ? 0.9 : 0.4,
          ease: phase === 'sent' ? [0.4, 0, 0.2, 1] : 'easeOut',
          delay: phase === 'exporting' ? 0.7 : 0,
        }}
        className="absolute bottom-20 right-10 flex w-36 flex-col gap-1 rounded-md border border-neutral-200 bg-white p-2 shadow-md"
      >
        <div className="flex items-center gap-1.5">
          <FileText className="size-3.5 text-rose-500" />
          <span className="truncate text-[11px] font-medium text-neutral-800">
            {docName}
          </span>
        </div>
        <div className="space-y-0.5">
          <div className="h-1 w-full rounded-full bg-neutral-100" />
          <div className="h-1 w-5/6 rounded-full bg-neutral-100" />
          <div className="h-1 w-4/6 rounded-full bg-neutral-100" />
        </div>
      </motion.div>

      {/* "Sent" confirmation toast */}
      <AnimatePresence>
        {phase === 'sent' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-[12px] font-medium text-white shadow-md"
          >
            <Check className="size-3.5" strokeWidth={3} />
            Enviat a {MOCK_RECIPIENT}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExportRow({
  icon,
  label,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={highlight ? { backgroundColor: 'rgba(0,0,0,0)' } : false}
      animate={
        highlight
          ? { backgroundColor: ['rgba(0,0,0,0)', 'rgba(99,102,241,0.10)', 'rgba(99,102,241,0.10)'] }
          : undefined
      }
      transition={{ duration: 0.6, delay: 0.5, times: [0, 0.5, 1] }}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium text-neutral-700"
    >
      {icon}
      {label}
    </motion.div>
  );
}

/* ----------------------- Subcomponents ------------------------------- */

function FileCard({
  filename,
  progress,
  animated,
}: {
  filename: string;
  progress: number;
  animated?: boolean;
}) {
  return (
    <motion.div
      initial={animated ? { y: -40, opacity: 0, scale: 0.95 } : false}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="w-[min(80%,360px)] rounded-xl border border-neutral-200 bg-white p-4 shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <FileAudio className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900">{filename}</p>
          <p className="text-xs text-neutral-500 tabular-nums">
            {Math.round(progress * 100)}% · 15:32
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <motion.div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${progress * 100}%` }}
          transition={{ ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}

function Waveform({ progress }: { progress: number }) {
  return (
    <div className="relative flex h-12 items-center gap-[3px]">
      {WAVE_HEIGHTS.map((h, i) => {
        const barProgress = i / (WAVE_BAR_COUNT - 1);
        const played = barProgress <= progress;
        // Slight scale-up on the active bar for a "pulse" feel.
        const active = Math.abs(barProgress - progress) < 1 / WAVE_BAR_COUNT;
        return (
          <motion.div
            key={i}
            className={cn(
              'flex-1 rounded-full transition-colors duration-200',
              played ? 'bg-indigo-500' : 'bg-neutral-200',
            )}
            style={{ height: `${Math.round(h * 100)}%` }}
            animate={{
              scaleY: active ? 1.15 : 1,
            }}
            transition={{ duration: 0.18 }}
          />
        );
      })}
    </div>
  );
}

function formatMmSs(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
