"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Page-level loading skeletons. Use these inside `<AppLayout>` while a page
 * is fetching its initial data. They render the rough shape of the page
 * (header bar + content slots) instead of a centered spinner — feels much
 * faster to users and matches what shadcn / Linear / Notion all do.
 *
 * Pick the variant that most closely matches the page's content:
 *   - "list"      — flat table / row list  (transcriptions, profiles, library)
 *   - "cards"     — grid of cards          (team, organization members)
 *   - "form"      — form sections          (settings, account)
 *   - "detail"    — title + body blocks    (transcription editor, help)
 */
export type PageSkeletonVariant = "list" | "cards" | "form" | "detail";

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
  /** Number of rows / cards to render. Defaults vary per variant. */
  count?: number;
  /** Hide the page-header skeleton — use when the parent already renders one. */
  hideHeader?: boolean;
  /** Optional className on the outer container. */
  className?: string;
}

export function PageSkeleton({ variant = "list", count, hideHeader, className }: PageSkeletonProps) {
  const containerClass = hideHeader ? "" : "w-full px-8 py-6";
  return (
    <div className={[containerClass, className].filter(Boolean).join(" ")} aria-busy="true" aria-live="polite">
      {!hideHeader && <HeaderRow />}
      <div className={hideHeader ? "" : "mt-8"}>
        {variant === "list" && <ListSkeleton rows={count ?? 8} />}
        {variant === "cards" && <CardsSkeleton cards={count ?? 6} />}
        {variant === "form" && <FormSkeleton sections={count ?? 3} />}
        {variant === "detail" && <DetailSkeleton paragraphs={count ?? 4} />}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function HeaderRow() {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-10 w-40" />
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
      <ul className="divide-y divide-neutral-100">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-8 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5" style={{ width: `${40 + ((i * 13) % 50)}%` }} />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardsSkeleton({ cards }: { cards: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FormSkeleton({ sections }: { sections: number }) {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {Array.from({ length: sections }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton({ paragraphs }: { paragraphs: number }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      {Array.from({ length: paragraphs }).map((_, i) => (
        <div key={i} className="space-y-2 py-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}
