type Variant = "pending" | "approved" | "rejected" | "active" | "suspended";

const styles: Record<Variant, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  active: "bg-emerald-100 text-emerald-800",
  suspended: "bg-slate-200 text-slate-700"
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
    (status === "PENDING" || status === "Pending"
      ? "pending"
      : status === "APPROVED" || status === "Active" || status === "APPROVED"
        ? "approved"
        : status === "REJECTED" || status === "Rejected"
          ? "rejected"
          : status === "Suspended"
            ? "suspended"
            : "pending");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[v]}`}
    >
      {status}
    </span>
  );
}
