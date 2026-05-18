import type { MatrimonyWorkflowStatus } from "../types";
import { WORKFLOW_COLORS, WORKFLOW_LABELS } from "../constants";

export function WorkflowBadge({ status }: { status: MatrimonyWorkflowStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${WORKFLOW_COLORS[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {WORKFLOW_LABELS[status] ?? status}
    </span>
  );
}
