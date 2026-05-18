export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-slate-200" />
            <div className="h-3 w-1/2 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
