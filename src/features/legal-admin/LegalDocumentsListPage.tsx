import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listLegalDocuments,
  publishLegalDocument,
  type LegalDocumentSummary,
  type LegalVersionBump
} from "../../api/legalDocumentsAdmin";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { ConfirmModal } from "../../components/ConfirmModal";
import {
  AdminListError,
  AdminListToolbar,
  AdminTableSkeleton
} from "../../components/admin/AdminListControls";
import { PermissionGate } from "../../components/PermissionGate";
import { useToast } from "../../context/ToastContext";

function statusVariant(
  status: string
): "pending" | "approved" | "rejected" | "suspended" {
  if (status === "PUBLISHED") return "approved";
  if (status === "DRAFT") return "pending";
  if (status === "NONE") return "suspended";
  return "suspended";
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function LegalDocumentsListPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [publishTarget, setPublishTarget] = useState<LegalDocumentSummary | null>(null);
  const [bump, setBump] = useState<LegalVersionBump>("minor");
  const [changeSummary, setChangeSummary] = useState("");

  const query = useQuery({
    queryKey: ["admin-legal-documents"],
    queryFn: listLegalDocuments
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      publishLegalDocument(publishTarget!.documentKey, {
        bump,
        changeSummary: changeSummary.trim() || null,
        documentId: publishTarget!.draftDocumentId ?? undefined
      }),
    onSuccess: () => {
      addToast("Document published.", "success");
      setPublishTarget(null);
      setChangeSummary("");
      setBump("minor");
      void queryClient.invalidateQueries({ queryKey: ["admin-legal-documents"] });
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Publish failed", "error")
  });

  const filtered = useMemo(() => {
    const rows = query.data?.documents ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.documentKey.toLowerCase().includes(q) ||
        (r.slug ?? "").toLowerCase().includes(q)
    );
  }, [query.data?.documents, search]);

  const columns: DataTableColumn<LegalDocumentSummary>[] = useMemo(
    () => [
      {
        key: "title",
        label: "Title",
        render: (row) => (
          <div>
            <div className="font-medium text-slate-900">{row.title}</div>
            <div className="text-xs text-slate-500">{row.documentKey}</div>
          </div>
        )
      },
      {
        key: "currentVersion",
        label: "Version",
        render: (row) => (
          <span className="font-mono text-xs text-slate-700">
            {row.currentVersion ?? (row.draftDocumentId ? "draft" : "—")}
          </span>
        )
      },
      {
        key: "publishedStatus",
        label: "Status",
        render: (row) => {
          const label =
            row.publishedStatus === "PUBLISHED"
              ? row.draftDocumentId
                ? "Published + draft"
                : "Published"
              : row.publishedStatus === "DRAFT"
                ? "Draft"
                : "No content";
          return (
            <StatusBadge
              status={label}
              variant={statusVariant(row.publishedStatus)}
            />
          );
        }
      },
      {
        key: "lastUpdatedAt",
        label: "Last updated",
        render: (row) => (
          <div className="text-xs text-slate-600">
            <div>{formatWhen(row.lastUpdatedAt)}</div>
            {row.lastUpdatedBy ? (
              <div className="text-slate-400">{row.lastUpdatedBy}</div>
            ) : null}
          </div>
        )
      },
      {
        key: "actions",
        label: "Actions",
        render: (row) => (
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <Link
              to={`/settings/legal/${encodeURIComponent(row.documentKey)}`}
              className="text-primary hover:underline"
            >
              {row.draftDocumentId || row.publishedDocumentId ? "View / Edit" : "Edit"}
            </Link>
            <PermissionGate action="settings.legal_manage">
              <button
                type="button"
                disabled={!row.draftDocumentId}
                className="text-emerald-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-300"
                onClick={() => {
                  setBump("minor");
                  setChangeSummary("");
                  setPublishTarget(row);
                }}
              >
                Publish
              </button>
            </PermissionGate>
            <Link
              to={`/settings/legal/${encodeURIComponent(row.documentKey)}/history`}
              className="text-slate-600 hover:underline"
            >
              History
            </Link>
          </div>
        )
      }
    ],
    []
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="max-w-2xl text-sm text-slate-600">
            Manage privacy, terms, and policy documents shown to members. Publish a draft to
            bump the live version (minor or major).
          </p>
          <Link
            to="/settings"
            className="mt-1 inline-block text-xs font-medium text-slate-500 hover:text-primary"
          >
            ← Back to Settings
          </Link>
        </div>
      </div>

      <AdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by title or key…"
        right={
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        }
      />

      {query.isLoading ? (
        <AdminTableSkeleton rows={7} cols={5} />
      ) : query.isError ? (
        <AdminListError
          message={query.error instanceof Error ? query.error.message : "Failed to load documents."}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <DataTable
          columns={columns as any}
          data={filtered as any}
          keyExtractor={(r) => (r as LegalDocumentSummary).documentKey}
          emptyMessage="No legal document types found."
        />
      )}

      <ConfirmModal
        open={!!publishTarget}
        title="Publish legal document"
        message={
          publishTarget
            ? `Publish the draft for “${publishTarget.title}”? Members who must re-accept will be prompted on next login.`
            : ""
        }
        confirmLabel={publishMutation.isPending ? "Publishing…" : "Publish"}
        confirmDisabled={publishMutation.isPending}
        onCancel={() => {
          if (!publishMutation.isPending) setPublishTarget(null);
        }}
        onConfirm={() => publishMutation.mutate()}
      >
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-slate-700">
            Version bump
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={bump}
              onChange={(e) => setBump(e.target.value as LegalVersionBump)}
            >
              <option value="minor">Minor (e.g. 1.0 → 1.1)</option>
              <option value="major">Major (e.g. 1.1 → 2.0)</option>
            </select>
          </label>
          <label className="block text-sm text-slate-700">
            Change summary (optional)
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              maxLength={500}
              placeholder="What changed for members?"
            />
          </label>
        </div>
      </ConfirmModal>
    </div>
  );
}
