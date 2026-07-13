import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelAdminHelpRequest,
  completeAdminHelpRequest,
  deleteAdminHelpRequest,
  getAdminHelpRequest,
  listAdminHelpRequests,
  reopenAdminHelpRequest,
  type AdminHelpItem,
  type HelpStatusFilter
} from "../api/helpingHandsAdmin";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "BLOOD_DONATION", label: "Blood Donation" },
  { value: "MEDICAL", label: "Medical Help" },
  { value: "EDUCATION", label: "Education" },
  { value: "FOOD", label: "Food" },
  { value: "FINANCIAL", label: "Financial Help" },
  { value: "VOLUNTEER", label: "Volunteer" },
  { value: "OTHERS", label: "Others" }
];

type ConfirmState =
  | { type: "cancel" | "reopen" | "complete" | "delete"; item: AdminHelpItem }
  | null;

export function HelpingHandPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<HelpStatusFilter>("all");
  const [category, setCategory] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-helping-hands", page, statusFilter, searchQ, category],
    queryFn: () =>
      listAdminHelpRequests(page, 20, statusFilter, searchQ || undefined, category || undefined)
  });

  const detailQuery = useQuery({
    queryKey: ["admin-helping-hands-detail", viewingId],
    queryFn: () => getAdminHelpRequest(viewingId!),
    enabled: viewingId != null
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-helping-hands"] });
    queryClient.invalidateQueries({ queryKey: ["admin-helping-hands-detail"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelAdminHelpRequest(id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      addToast("Request cancelled / frozen.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to cancel", "error")
  });

  const reopenMutation = useMutation({
    mutationFn: (id: number) => reopenAdminHelpRequest(id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      addToast("Request reopened.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to reopen", "error")
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => completeAdminHelpRequest(id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      addToast("Request marked completed.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to complete", "error")
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminHelpRequest(id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      setViewingId(null);
      addToast("Request deleted.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to delete", "error")
  });

  const mutationPending =
    cancelMutation.isPending ||
    reopenMutation.isPending ||
    completeMutation.isPending ||
    deleteMutation.isPending;

  const counts = data?.counts;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 20)));
  const detail = detailQuery.data?.request;

  const columns = useMemo(
    () => [
      { key: "id", label: "ID" },
      {
        key: "title",
        label: "Request",
        render: (r: AdminHelpItem) => (
          <div>
            <div className="font-medium text-slate-900">{r.title}</div>
            <div className="text-xs text-slate-500">
              {r.helpCategoryLabel ?? r.helpCategory ?? "—"}
              {r.helpUrgency && r.helpUrgency !== "NORMAL" ? ` · ${r.helpUrgency}` : ""}
            </div>
          </div>
        )
      },
      {
        key: "location",
        label: "Location",
        render: (r: AdminHelpItem) => r.helpLocation ?? "—"
      },
      {
        key: "author",
        label: "Requester",
        render: (r: AdminHelpItem) => (
          <div>
            <div>{r.author.fullName}</div>
            <div className="text-xs text-slate-500">{r.author.email}</div>
          </div>
        )
      },
      {
        key: "helpers",
        label: "Helpers",
        render: (r: AdminHelpItem) => r.helperCount
      },
      {
        key: "status",
        label: "Status",
        render: (r: AdminHelpItem) => <StatusBadge status={r.helpStatus} />
      },
      {
        key: "createdAt",
        label: "Posted",
        render: (r: AdminHelpItem) => new Date(r.createdAt).toLocaleDateString()
      },
      {
        key: "actions",
        label: "Actions",
        render: (r: AdminHelpItem) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewingId(r.id)}
              className="text-sm font-medium text-primary hover:underline"
            >
              View
            </button>
            {r.helpStatus !== "CANCELLED" && r.helpStatus !== "COMPLETED" ? (
              <button
                type="button"
                onClick={() => setConfirm({ type: "cancel", item: r })}
                className="text-sm font-medium text-amber-700 hover:underline"
              >
                Freeze
              </button>
            ) : null}
            {r.helpStatus === "CANCELLED" ? (
              <button
                type="button"
                onClick={() => setConfirm({ type: "reopen", item: r })}
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                Reopen
              </button>
            ) : null}
            {r.helpStatus !== "COMPLETED" && r.helpStatus !== "CANCELLED" ? (
              <button
                type="button"
                onClick={() => setConfirm({ type: "complete", item: r })}
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                Complete
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setConfirm({ type: "delete", item: r })}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        )
      }
    ],
    []
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Helping Hands Moderation</h2>
          <p className="mt-1 text-sm text-slate-600">
            Review community help requests, freeze suspicious posts, mark completed, or remove abuse.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-800">
            Open: {counts?.open ?? 0}
          </span>
          <span className="rounded-lg bg-amber-50 px-3 py-1.5 font-medium text-amber-800">
            In progress: {counts?.in_progress ?? 0}
          </span>
          <span className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-800">
            Completed: {counts?.completed ?? 0}
          </span>
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
            Cancelled: {counts?.cancelled ?? 0}
          </span>
          <span className="rounded-lg bg-slate-50 px-3 py-1.5 font-medium text-slate-600">
            All: {counts?.all ?? 0}
          </span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as HelpStatusFilter);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="open">Open / Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled / Frozen</option>
        </select>
        <select
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value || "all"} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              setSearchQ(searchDraft.trim());
            }
          }}
          placeholder="Search title, location, phone…"
          className="min-w-[240px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setSearchQ(searchDraft.trim());
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading help requests…
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : "Failed to load help requests."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns as any}
          data={(data?.requests ?? []) as any}
          keyExtractor={(r) => (r as AdminHelpItem).id}
          emptyMessage="No help requests found."
        />
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} of {totalPages} · {data?.total ?? 0} results
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {viewingId != null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Request #{viewingId}</h3>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-800"
                onClick={() => setViewingId(null)}
              >
                Close
              </button>
            </div>
            {detailQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : detailQuery.isError ? (
              <p className="text-sm text-red-600">
                {detailQuery.error instanceof Error
                  ? detailQuery.error.message
                  : "Failed to load details"}
              </p>
            ) : detail ? (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-400">Title</div>
                  <div className="font-medium text-slate-900">{detail.title}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={detail.helpStatus} />
                  {detail.helpUrgency ? (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
                      {detail.helpUrgency}
                    </span>
                  ) : null}
                  {detail.helpCategoryLabel ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {detail.helpCategoryLabel}
                    </span>
                  ) : null}
                </div>
                {detail.description ? (
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-400">Description</div>
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">{detail.description}</p>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-400">Location</div>
                    <div>{detail.helpLocation ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-400">Phone</div>
                    <div>{detail.helpContactPhone ?? "—"}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-400">Requester</div>
                  <div className="font-medium">{detail.author.fullName}</div>
                  <div className="text-slate-500">{detail.author.email}</div>
                  {detail.author.community ? (
                    <div className="text-slate-500">{detail.author.community}</div>
                  ) : null}
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase text-slate-400">
                    Volunteers ({detail.helpers?.length ?? 0})
                  </div>
                  {(detail.helpers?.length ?? 0) === 0 ? (
                    <p className="text-slate-500">No helpers yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                      {detail.helpers.map((h) => (
                        <li key={h.id} className="px-3 py-2">
                          <div className="font-medium text-slate-800">{h.name}</div>
                          <div className="text-xs text-slate-500">{h.email ?? "—"}</div>
                          {h.message ? (
                            <div className="mt-1 text-xs italic text-slate-600">“{h.message}”</div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={confirm != null}
        title={
          confirm?.type === "cancel"
            ? "Freeze request?"
            : confirm?.type === "reopen"
              ? "Reopen request?"
              : confirm?.type === "complete"
                ? "Mark completed?"
                : "Delete request?"
        }
        message={
          confirm?.type === "cancel"
            ? `"${confirm.item.title}" will be cancelled and hidden from the public Helping Hands feed.`
            : confirm?.type === "reopen"
              ? `"${confirm.item.title}" will be set back to Open.`
              : confirm?.type === "complete"
                ? `"${confirm.item.title}" will be marked completed. Helpers will be notified.`
                : confirm
                  ? `"${confirm.item.title}" and related offers/appreciations will be permanently deleted.`
                  : ""
        }
        confirmLabel={
          confirm?.type === "cancel"
            ? "Freeze"
            : confirm?.type === "reopen"
              ? "Reopen"
              : confirm?.type === "complete"
                ? "Complete"
                : "Delete"
        }
        variant={confirm?.type === "delete" || confirm?.type === "cancel" ? "danger" : "default"}
        confirmDisabled={mutationPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === "cancel") cancelMutation.mutate(confirm.item.id);
          else if (confirm.type === "reopen") reopenMutation.mutate(confirm.item.id);
          else if (confirm.type === "complete") completeMutation.mutate(confirm.item.id);
          else deleteMutation.mutate(confirm.item.id);
        }}
      />
    </div>
  );
}
