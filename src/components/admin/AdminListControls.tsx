import type { ReactNode } from "react";

export const ADMIN_PAGE_SIZES = [10, 25, 50, 100] as const;
export type AdminPageSize = (typeof ADMIN_PAGE_SIZES)[number];

type Props = {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  /** Show even when only one page (for record count + page size). Default true. */
  alwaysShow?: boolean;
  className?: string;
};

function pageWindow(current: number, totalPages: number, windowSize = 5): number[] {
  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  let start = Math.max(1, current - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - windowSize + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function AdminPagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  alwaysShow = true,
  className = ""
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  const pages = pageWindow(page, totalPages);

  if (!alwaysShow && totalPages <= 1 && !onLimitChange) return null;

  return (
    <div
      className={`mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span>
          Showing <span className="font-semibold text-slate-800">{from}</span>–
          <span className="font-semibold text-slate-800">{to}</span> of{" "}
          <span className="font-semibold text-slate-800">{total}</span>
        </span>
        {onLimitChange ? (
          <label className="flex items-center gap-2">
            <span className="text-slate-500">Per page</span>
            <select
              value={limit}
              onChange={(e) => {
                onLimitChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              {ADMIN_PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="rounded border border-slate-300 px-2.5 py-1.5 text-sm disabled:opacity-40"
          aria-label="First page"
        >
          «
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        {pages[0] > 1 ? <span className="px-1 text-slate-400">…</span> : null}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`min-w-[2.25rem] rounded border px-2.5 py-1.5 text-sm font-medium ${
              p === page
                ? "border-primary bg-primary text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages ? (
          <span className="px-1 text-slate-400">…</span>
        ) : null}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="rounded border border-slate-300 px-2.5 py-1.5 text-sm disabled:opacity-40"
          aria-label="Last page"
        >
          »
        </button>
      </div>
    </div>
  );
}

export function AdminListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  children,
  right
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {onSearchChange ? (
          <input
            type="search"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-xs"
            aria-label="Search"
          />
        ) : null}
        {children}
      </div>
      {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
    </div>
  );
}

export function AdminTableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-lg border border-slate-200 bg-white"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-3 flex-1 rounded bg-slate-200" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-slate-50 px-4 py-3 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-4 flex-1 rounded bg-slate-100" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function AdminListError({
  message,
  onRetry
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      {message}{" "}
      {onRetry ? (
        <button type="button" className="font-semibold underline" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
