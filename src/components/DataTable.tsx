import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  label: ReactNode;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
};

type SortDir = "asc" | "desc";

type Props<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyMessage?: string;
  sortKey?: string | null;
  sortDir?: SortDir;
  onSortChange?: (key: string, dir: SortDir) => void;
  /** Sticky thead for long tables */
  stickyHeader?: boolean;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data",
  sortKey,
  sortDir = "desc",
  onSortChange,
  stickyHeader = true
}: Props<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead
          className={`bg-slate-50 ${stickyHeader ? "sticky top-0 z-10 shadow-sm" : ""}`}
        >
          <tr>
            {columns.map((col) => {
              const active = sortKey === col.key;
              const canSort = Boolean(col.sortable && onSortChange);
              return (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-semibold text-slate-700 ${col.headerClassName ?? ""}`}
                >
                  {canSort ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                      onClick={() => {
                        const nextDir: SortDir =
                          active && sortDir === "asc" ? "desc" : "asc";
                        // First click on new column → desc (newest / Z–A feel for dates)
                        const dir: SortDir = active ? nextDir : "desc";
                        onSortChange!(col.key, dir);
                      }}
                    >
                      {col.label}
                      <span className="text-xs text-slate-400" aria-hidden>
                        {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={String(keyExtractor(row))} className="hover:bg-slate-50">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-slate-700 ${col.className ?? ""}`}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as any)[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
