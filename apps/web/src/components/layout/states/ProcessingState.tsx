"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Rendered while the queue is still transcribing an audio. The skeleton
 * mirrors the layout of the editor that will replace it once `status` flips
 * to `completed` — header bar + transcript-shaped lines + audio-player bar.
 */
export function ProcessingState() {
  return (
    <div className="flex h-full flex-1 flex-col bg-white" aria-busy="true" aria-live="polite">
      {/* Header (same height as TranscriptionHeader so layout doesn't shift) */}
      <div className="flex h-14 items-center justify-between gap-3 border-b border-neutral-200 px-5">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Transcript-shaped body */}
      <div className="flex-1 overflow-hidden px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-5">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          {[78, 64, 86, 52, 72, 60, 80, 55].map((w, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-5 w-14 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5" style={{ width: `${w}%` }} />
                <Skeleton className="h-3.5" style={{ width: `${Math.max(25, w - 18)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Player placeholder */}
      <div className="border-t border-neutral-200 bg-neutral-50 px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-2 flex-1 rounded-full" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>

      <span className="sr-only">Transcribing audio…</span>
    </div>
  );
}
