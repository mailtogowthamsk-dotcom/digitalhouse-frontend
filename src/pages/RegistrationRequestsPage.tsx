import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getRegistrationSummary,
  listRegistrationRequests,
  type RegistrationDeskStatus
} from "../api/registrationDesk";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { AdminListError, AdminPagination } from "../components/admin/AdminListControls";

const FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "unassigned", label: "Unassigned" },
  { id: "assigned", label: "Assigned" },
  { id: "in_progress", label: "In progress" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" }
];

function statusLabel(status: RegistrationDeskStatus): string {
  if (status === "IN_PROGRESS") return "IN PROGRESS";
  if (status === "CHANGES_REQUESTED") return "CHANGES REQUESTED";
  return status;
}

export function RegistrationRequestsPage() {
  const [filter, setFilter] = useState("new");
  const [scope, setScope] = useState<"" | "mine">("");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const summary = useQuery({
    queryKey: ["registration-summary"],
    queryFn: getRegistrationSummary
  });
  const list = useQuery({
    queryKey: ["registration-requests", filter, scope, page, search],
    queryFn: () =>
      listRegistrationRequests({ filter, scope, page, limit: 20, q: search, sort: "submitted", dir: "desc" })
  });

  const stats = summary.data;
  const cards = [
    ["Total", stats?.total],
    ["New", stats?.newRequests],
    ["Unassigned", stats?.unassigned],
    ["Assigned", stats?.assigned],
    ["In progress", stats?.inProgress],
    ["Approved", stats?.approved],
    ["Rejected", stats?.rejected]
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Registration Requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            New members stay outside the community until an admin approves them.
          </p>
        </div>
        <Link to="/support-team" className="text-sm font-semibold text-primary hover:underline">
          Support team
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
            <div className="text-xs font-medium text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{value ?? "—"}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filter === item.id ? "bg-primary text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
            onClick={() => {
              setFilter(item.id);
              setPage(1);
            }}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            scope === "mine" ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
          }`}
          onClick={() => {
            setScope((s) => (s === "mine" ? "" : "mine"));
            setPage(1);
          }}
        >
          My assigned
        </button>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
          setPage(1);
        }}
      >
        <input
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search name, email, mobile, or request ID"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
          Search
        </button>
      </form>

      {list.isError ? (
        <AdminListError message={list.error instanceof Error ? list.error.message : "Could not load requests"} />
      ) : (
        <DataTable
          data={(list.data?.items ?? []) as unknown as Record<string, unknown>[]}
          keyExtractor={(row) => String(row.requestId)}
          emptyMessage={list.isLoading ? "Loading…" : "No registration requests"}
          columns={[
            { key: "requestId", label: "Request", render: (row) => `#${row.requestId}` },
            { key: "applicantName", label: "Name" },
            { key: "email", label: "Email" },
            { key: "mobile", label: "Mobile", render: (row) => String(row.mobile || "—") },
            {
              key: "submittedAt",
              label: "Submitted",
              render: (row) => new Date(String(row.submittedAt)).toLocaleString()
            },
            {
              key: "status",
              label: "Status",
              render: (row) => <StatusBadge status={statusLabel(row.status as RegistrationDeskStatus)} />
            },
            { key: "assignedTo", label: "Assigned to", render: (row) => String(row.assignedTo || "—") },
            {
              key: "action",
              label: "",
              render: (row) => (
                <Link className="font-semibold text-primary hover:underline" to={`/registration-requests/${row.requestId}`}>
                  Open
                </Link>
              )
            }
          ]}
        />
      )}

      <AdminPagination
        page={page}
        limit={20}
        total={list.data?.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
