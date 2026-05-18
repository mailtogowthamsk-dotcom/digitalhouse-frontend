import { isMatrimonyMediaField, MediaFieldPreview } from "./MediaFieldPreview";

type FieldChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

export function SubmissionCompare({
  previous,
  current,
  fieldChanges,
  labels
}: {
  previous: Record<string, unknown> | null;
  current: Record<string, unknown> | null;
  fieldChanges: FieldChange[];
  labels: Record<string, string>;
}) {
  if (!previous && fieldChanges.length === 0) {
    return <p className="text-sm text-slate-500">No previous submission snapshot yet.</p>;
  }

  const highlightKeys = new Set(
    fieldChanges.length > 0 ? fieldChanges.map((c) => c.field) : Object.keys(previous ?? {})
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Previous vs updated submission
      </h3>
      {fieldChanges.length > 0 && (
        <p className="mb-3 text-sm text-slate-600">
          {fieldChanges.length} field(s) changed since admin requested corrections.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="mb-2 text-xs font-bold uppercase text-slate-500">Previous submission</h4>
          <dl className="space-y-2 text-sm">
            {[...highlightKeys].map((key) => (
              <div key={key}>
                <dt className="font-medium text-slate-500">{labels[key] ?? key}</dt>
                <dd className="break-words text-slate-800">
                  <ValueCell field={key} value={previous?.[key]} labels={labels} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <h4 className="mb-2 text-xs font-bold uppercase text-amber-800">Current (pending)</h4>
          <dl className="space-y-2 text-sm">
            {[...highlightKeys].map((key) => {
              const changed = fieldChanges.some((c) => c.field === key);
              return (
                <div key={key} className={changed ? "rounded bg-amber-100 px-2 py-1" : ""}>
                  <dt className="font-medium text-slate-500">{labels[key] ?? key}</dt>
                  <dd className="break-words text-slate-800">
                    <ValueCell field={key} value={current?.[key]} labels={labels} />
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
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
  if (value == null || value === "") return <>—</>;
  if (typeof value === "string" && isMatrimonyMediaField(field) && value.startsWith("http")) {
    return <MediaFieldPreview url={value} label={labels[field] ?? field} />;
  }
  return <>{formatVal(value)}</>;
}

function formatVal(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "string" && v.startsWith("http")) return "Uploaded file";
  if (typeof v === "string" && v.length > 120) return `${v.slice(0, 120)}…`;
  return String(v);
}
