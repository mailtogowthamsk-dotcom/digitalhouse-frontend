import type { MatrimonyAdminRequestType } from "../types";
import { REQUEST_TYPE_COLORS, REQUEST_TYPE_LABELS } from "../constants";

export function RequestTypeBadge({ type }: { type?: MatrimonyAdminRequestType | null }) {
  if (!type) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${REQUEST_TYPE_COLORS[type]}`}
    >
      {REQUEST_TYPE_LABELS[type]}
    </span>
  );
}
