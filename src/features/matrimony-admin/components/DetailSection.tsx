import { MATRIMONY_FIELD_LABELS } from "../constants";

export function DetailSection({
  title,
  fields
}: {
  title: string;
  fields: { label: string; value: unknown }[];
}) {
  const visible = fields.filter((f) => f.value != null && f.value !== "");
  if (visible.length === 0) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <dl className="grid gap-3 sm:grid-cols-2">
        {visible.map((f) => (
          <div key={f.label}>
            <dt className="text-xs font-medium text-slate-500">{f.label}</dt>
            <dd className="mt-0.5 text-sm text-slate-900 break-words">{String(f.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function fieldsFromRecord(
  record: Record<string, unknown> | null,
  keys: string[],
  labels = MATRIMONY_FIELD_LABELS
): { label: string; value: unknown }[] {
  if (!record) return [];
  return keys.map((k) => ({
    label: labels[k] ?? k,
    value: record[k]
  }));
}
