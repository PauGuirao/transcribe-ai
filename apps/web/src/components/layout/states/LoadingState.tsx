export function LoadingState() {
  return (
    <div className="flex h-full flex-1 flex-col bg-gray-50">
      {/* Header skeleton */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div className="h-5 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
      </div>

      {/* Segments skeleton */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {[40, 65, 50, 80, 55, 70, 45, 60].map((w, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-5 w-16 shrink-0 animate-pulse rounded bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div
                  className="h-4 animate-pulse rounded bg-gray-200"
                  style={{ width: `${w}%` }}
                />
                <div
                  className="h-4 animate-pulse rounded bg-gray-200"
                  style={{ width: `${Math.max(20, w - 20)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading transcription...</span>
    </div>
  );
}
