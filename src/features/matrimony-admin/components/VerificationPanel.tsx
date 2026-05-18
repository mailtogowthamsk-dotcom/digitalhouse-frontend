import type { VerificationState } from "../types";
import { VERIFICATION_LABELS } from "../constants";

const KEYS = Object.keys(VERIFICATION_LABELS);

export function VerificationPanel({
  verification,
  onToggle,
  disabled
}: {
  verification: VerificationState;
  onToggle: (key: string, checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Verification checklist
      </h3>
      <ul className="space-y-3">
        {KEYS.map((key) => {
          const item = verification[key];
          const checked = item?.checked === true;
          return (
            <li
              key={key}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => onToggle(key, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary"
                />
                {VERIFICATION_LABELS[key]}
              </label>
              {item?.by && (
                <span className="text-xs text-slate-500">
                  {item.by} · {item.at ? new Date(item.at).toLocaleString() : ""}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
