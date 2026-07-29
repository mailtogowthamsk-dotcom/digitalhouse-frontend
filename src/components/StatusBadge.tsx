type Variant = "pending" | "approved" | "rejected" | "active" | "suspended" | "deleted";

const styles: Record<Variant, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  active: "bg-emerald-100 text-emerald-800",
  suspended: "bg-slate-200 text-slate-700",
  deleted: "bg-slate-800 text-white"
};

export function StatusBadge({
  status,
  variant
}: {
  status: string;
  variant?: Variant;
}) {
  const v: Variant =
    variant ??
    (status === "PENDING" ||
      status === "Pending" ||
      status === "IN_PROGRESS" ||
      status === "REVIEWED" ||
      status === "INTERVIEW_SCHEDULED" ||
      status === "ESCALATED" ||
      status === "CHANGES_REQUESTED" ||
      status === "PENDING_REVIEW"
      ? "pending"
      : status === "APPROVED" ||
          status === "ACTIVE" ||
          status === "Active" ||
          status === "OPEN" ||
          status === "Open" ||
          status === "SHORTLISTED" ||
          status === "SELECTED" ||
          status === "COMPLETED" ||
          status === "RESOLVED"
        ? "approved"
        : status === "REJECTED" ||
            status === "Rejected" ||
            status === "CLOSED" ||
            status === "Closed" ||
            status === "EXPIRED" ||
            status === "WITHDRAWN" ||
            status === "CANCELLED" ||
            status === "DISMISSED"
          ? "rejected"
          : status === "SUSPENDED" || status === "Suspended"
            ? "suspended"
            : status === "DELETED" || status === "SOFT_DELETED"
              ? "deleted"
              : "pending");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[v]}`}
    >
      {status}
    </span>
  );
}
