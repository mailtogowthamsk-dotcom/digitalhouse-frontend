import type { ReactNode } from "react";

export function DetailCard({
  title,
  children,
  empty,
  actions
}: {
  title: string;
  children?: ReactNode;
  empty?: boolean;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        {actions}
      </div>
      {empty ? <p className="text-sm text-slate-400">No data available</p> : children}
    </section>
  );
}

export function FieldGrid({
  fields
}: {
  fields: Array<{ label: string; value: ReactNode; copy?: string }>;
}) {
  const visible = fields.filter((f) => {
    if (f.value == null || f.value === "") return false;
    if (f.value === "—") return true;
    return true;
  });
  if (visible.length === 0) {
    return <p className="text-sm text-slate-400">No data available</p>;
  }
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-xs font-medium text-slate-500">{f.label}</dt>
          <dd className="mt-0.5 flex items-start gap-2 text-sm text-slate-900 break-words">
            <span className="min-w-0">{f.value ?? "—"}</span>
            {f.copy ? (
              <button
                type="button"
                title="Copy"
                className="shrink-0 text-xs font-medium text-primary hover:underline"
                onClick={() => void navigator.clipboard.writeText(f.copy!)}
              >
                Copy
              </button>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function yesNo(v: unknown): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}
