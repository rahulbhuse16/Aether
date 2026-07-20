export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`}
      aria-hidden="true"
    />
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function TaskBoardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {[0, 1, 2].map((col) => (
        <div key={col}>
          <Skeleton className="mb-3 h-4 w-24" />
          <div className="space-y-2">
            <TaskCardSkeleton />
            <TaskCardSkeleton />
          </div>
        </div>
      ))}
    </div>
  );
}