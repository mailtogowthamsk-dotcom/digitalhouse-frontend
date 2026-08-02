import { useMemo, useState } from "react";
import { isMatrimonyMediaField, MediaFieldPreview } from "./MediaFieldPreview";

export type FieldChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

function formatVal(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "string" && v.startsWith("http")) return "Uploaded file";
  if (typeof v === "string" && v.length > 160) return `${v.slice(0, 160)}…`;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function ValueCell({
  field,
  value,
  labels
}: {
  field: string;
  value: unknown;
  labels: Record<string, string>;
}) {
  if (value == null || value === "") return <span className="text-slate-400">—</span>;
  if (typeof value === "string" && isMatrimonyMediaField(field) && value.startsWith("http")) {
    return <MediaFieldPreview url={value} label={labels[field] ?? field} />;
  }
  return <span className="break-words">{formatVal(value)}</span>;
}

/**
 * Shows only changed fields by default; unchanged keys can be expanded.
 * Used for snapshot→pending and approved→pending comparisons.
 */
export function FieldChangeViewer({
  title,
  subtitle,
  fieldChanges,
  labels,
  previousLabel = "Previous",
  currentLabel = "New",
  emptyMessage = "No field differences to show."
}: {
  title: string;
  subtitle?: string;
  fieldChanges: FieldChange[];
  labels: Record<string, string>;
  previousLabel?: string;
  currentLabel?: string;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(true);
  const sorted = useMemo(
    () =>
      [...fieldChanges].sort((a, b) =>
        (labels[a.field] ?? a.field).localeCompare(labels[b.field] ?? b.field)
      ),
    [fieldChanges, labels]
  );

  if (sorted.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-semibold text-amber-800">{sorted.length} fields changed</span>
            {subtitle ? ` · ${subtitle}` : null}
          </p>
        </div>
        <span className="text-xs font-medium text-slate-500">{open ? "Collapse" : "Expand"}</span>
      </button>

      {open ? (
        <ul className="mt-4 space-y-3">
          {sorted.map((c) => (
            <li
              key={c.field}
              className="rounded-lg border border-amber-100 bg-amber-50/40 px-4 py-3"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {labels[c.field] ?? c.field}
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-slate-400">{previousLabel}</p>
                  <div className="mt-1 text-sm text-slate-700">
                    <ValueCell field={c.field} value={c.oldValue} labels={labels} />
                  </div>
                </div>
                <div className="hidden pt-5 text-center text-slate-400 sm:block" aria-hidden>
                  ↓
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-emerald-700">{currentLabel}</p>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    <ValueCell field={c.field} value={c.newValue} labels={labels} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
