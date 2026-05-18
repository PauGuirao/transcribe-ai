'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface RecentAudio {
  id: string;
  originalName: string;
  customName?: string | null;
  status: string;
  uploadDate: string;
}

interface Props {
  limit?: number;
  /** Audios just submitted via the modal, prepended optimistically before refetch lands. */
  optimistic?: RecentAudio[];
  /** Show "See all" link to /transcriptions. */
  showSeeAll?: boolean;
  /** Custom empty-state CTA. */
  emptyState?: React.ReactNode;
}

type Status = 'completed' | 'transcribing' | 'processing' | 'pending' | 'uploaded' | 'uploading' | 'error' | 'failed';

const STATUS_META: Record<Status, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  completed:    { label: 'Llest',          color: 'text-emerald-700 bg-emerald-50',  Icon: CheckCircle2 },
  transcribing: { label: 'Transcrivint',   color: 'text-indigo-700 bg-indigo-50',    Icon: Loader2 },
  processing:   { label: 'Processant',     color: 'text-indigo-700 bg-indigo-50',    Icon: Loader2 },
  pending:      { label: 'En cua',         color: 'text-neutral-700 bg-neutral-100', Icon: Clock },
  uploaded:     { label: 'Pujat',          color: 'text-neutral-700 bg-neutral-100', Icon: Clock },
  uploading:    { label: 'Pujant',         color: 'text-neutral-700 bg-neutral-100', Icon: Loader2 },
  error:        { label: 'Error',          color: 'text-rose-700 bg-rose-50',         Icon: AlertCircle },
  failed:       { label: 'Error',          color: 'text-rose-700 bg-rose-50',         Icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const key = (String(status ?? '').toLowerCase() as Status);
  const meta = STATUS_META[key] ?? STATUS_META.pending;
  const Icon = meta.Icon;
  const spinning = meta.Icon === Loader2;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium', meta.color)}>
      <Icon className={cn('size-3', spinning && 'animate-spin')} />
      {meta.label}
    </span>
  );
}

export function RecentTranscriptionsList({ limit = 10, optimistic, showSeeAll = true, emptyState }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<RecentAudio[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOnce = async () => {
    try {
      // Ask the API only for the rows we're going to render — no point pulling
      // the whole library just to slice it client-side. `limit` is the visible
      // cap; we don't need server-side pagination beyond it here because the
      // "See all" link routes to /transcriptions for that.
      const res = await fetch(`/api/audio?limit=${limit}&page=1`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: RecentAudio[] = (data.audioFiles ?? []).map((f: any) => ({
        id: f.id,
        originalName: f.originalName,
        customName: f.customName,
        status: f.status,
        uploadDate: f.uploadDate,
      }));
      setItems(list);
    } catch (e: any) {
      setError(e?.message ?? 'No s\'han pogut carregar les transcripcions');
    }
  };

  useEffect(() => {
    void fetchOnce();
    // Re-fetch if the cap changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  // Merge optimistic rows; the real fetch will overwrite once they land.
  const merged = useMemo(() => {
    const base = items ?? [];
    if (!optimistic?.length) return base;
    const ids = new Set(base.map((r) => r.id));
    const extra = optimistic.filter((r) => !ids.has(r.id));
    return [...extra, ...base];
  }, [items, optimistic]);

  // Auto-poll while anything is still in-flight.
  useEffect(() => {
    const inflight = merged.some((r) =>
      ['transcribing', 'processing', 'pending', 'uploaded', 'uploading'].includes(String(r.status).toLowerCase())
    );
    if (inflight && !pollRef.current) {
      pollRef.current = setInterval(fetchOnce, 5000);
    } else if (!inflight && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [merged]);

  const visible = merged.slice(0, limit);

  if (items === null && !optimistic?.length) {
    // Skeleton matches the final row shape (icon + two-line text + status pill)
    // so the layout doesn't shift when the data lands.
    const skeletonRows = Math.min(limit, 6);
    return (
      <div
        className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
        aria-busy="true"
        aria-live="polite"
      >
        <ul className="divide-y divide-neutral-100">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton
                  className="h-3.5"
                  style={{ width: `${45 + ((i * 13) % 45)}%` }}
                />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </li>
          ))}
        </ul>
        <span className="sr-only">Carregant transcripcions…</span>
      </div>
    );
  }

  if (visible.length === 0) {
    return emptyState ?? (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-12 text-center">
        <p className="text-sm font-medium text-neutral-900">Encara no tens cap transcripció.</p>
        <p className="mt-1 text-xs text-neutral-500">Comença pujant un àudio amb el botó "Nova transcripció".</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <ul className="divide-y divide-neutral-100">
        {visible.map((file) => {
          const interactive = String(file.status).toLowerCase() !== 'error' && String(file.status).toLowerCase() !== 'failed';
          return (
            <li key={file.id}>
              <button
                type="button"
                onClick={() => interactive && router.push(`/transcribe?audioId=${file.id}`)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                  interactive ? 'hover:bg-neutral-50' : 'cursor-not-allowed opacity-70'
                )}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
                  <FileText className="size-4 text-neutral-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {file.customName || file.originalName}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(file.uploadDate).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <StatusBadge status={file.status} />
              </button>
            </li>
          );
        })}
      </ul>

      {showSeeAll && (items?.length ?? 0) > limit && (
        <button
          type="button"
          onClick={() => router.push('/transcriptions')}
          className="w-full border-t border-neutral-100 px-4 py-3 text-center text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Veure totes les transcripcions →
        </button>
      )}

      {error && <p className="border-t border-neutral-100 px-4 py-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
