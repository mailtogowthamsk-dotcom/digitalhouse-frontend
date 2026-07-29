import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLegalDocumentHistory,
  restoreLegalVersion,
  type LegalDocumentVersion
} from "../../api/legalDocumentsAdmin";
import { DataTable, type DataTableColumn } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { ConfirmModal } from "../../components/ConfirmModal";
import {
  AdminListError,
  AdminTableSkeleton
} from "../../components/admin/AdminListControls";
import { PermissionGate } from "../../components/PermissionGate";
import { useToast } from "../../context/ToastContext";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function LegalDocumentHistoryPage() {
  const { documentKey = "" } = useParams<{ documentKey: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [restoreTarget, setRestoreTarget] = useState<LegalDocumentVersion | null>(null);

  const history = useQuery({
    queryKey: ["admin-legal-history", documentKey],
    queryFn: () => getLegalDocumentHistory(documentKey),
    enabled: !!documentKey
  });

  const restoreMutation = useMutation({
    mutationFn: () => restoreLegalVersion(documentKey, restoreTarget!.id),
    onSuccess: () => {
      addToast("Restored into draft.", "success");
      setRestoreTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-legal-history", documentKey] });
      void queryClient.invalidateQueries({ queryKey: ["admin-legal-latest", documentKey] });
      void queryClient.invalidateQueries({ queryKey: ["admin-legal-documents"] });
      navigate(`/settings/legal/${encodeURIComponent(documentKey)}`);
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Restore failed", "error")
  });

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const columns: DataTableColumn<LegalDocumentVersion>[] = useMemo(
    () => [
      {
        key: "pick",
        label: "Compare",
        render: (row) => (
          <input
            type="checkbox"
            checked={selected.includes(row.id)}
            onChange={() => toggleSelect(row.id)}
            aria-label={`Select version ${row.version}`}
          />
        )
      },
      {
        key: "version",
        label: "Version",
        render: (row) => <span className="font-mono text-xs">{row.version}</span>
      },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <StatusBadge
            status={row.status}
            variant={
              row.status === "PUBLISHED"
                ? "approved"
                : row.status === "DRAFT"
                  ? "pending"
                  : "suspended"
            }
          />
        )
      },
      {
        key: "changeSummary",
        label: "Summary",
        render: (row) => (
          <span className="text-xs text-slate-600">{row.changeSummary || "—"}</span>
        )
      },
      {
        key: "updatedAt",
        label: "Updated",
        render: (row) => (
          <div className="text-xs text-slate-600">
            <div>{formatWhen(row.updatedAt)}</div>
            <div className="text-slate-400">{row.updatedBy || row.createdBy || "—"}</div>
          </div>
        )
      },
      {
        key: "actions",
        label: "Actions",
        render: (row) => (
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <PermissionGate action="settings.legal_manage">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setRestoreTarget(row)}
              >
                Restore
              </button>
            </PermissionGate>
            {selected.length === 1 && selected[0] !== row.id ? (
              <Link
                to={`/settings/legal/${encodeURIComponent(documentKey)}/compare?leftId=${selected[0]}&rightId=${row.id}`}
                className="text-slate-600 hover:underline"
              >
                Compare
              </Link>
            ) : null}
          </div>
        )
      }
    ],
    [selected, documentKey]
  );

  const compareHref =
    selected.length === 2
      ? `/settings/legal/${encodeURIComponent(documentKey)}/compare?leftId=${selected[0]}&rightId=${selected[1]}`
      : null;

  if (!documentKey) {
    return <AdminListError message="Missing document key." />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Version history</h2>
          <p className="mt-1 text-sm text-slate-600">
            Key: <span className="font-mono text-xs">{documentKey}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
            <Link to="/settings/legal" className="text-slate-500 hover:text-primary">
              ← All documents
            </Link>
            <Link
              to={`/settings/legal/${encodeURIComponent(documentKey)}`}
              className="text-slate-600 hover:underline"
            >
              Edit
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {compareHref ? (
            <Link
              to={compareHref}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Compare selected
            </Link>
          ) : (
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Select two versions to compare
            </span>
          )}
        </div>
      </div>

      {history.isLoading ? (
        <AdminTableSkeleton rows={6} cols={6} />
      ) : history.isError ? (
        <AdminListError
          message={
            history.error instanceof Error ? history.error.message : "Failed to load history."
          }
          onRetry={() => void history.refetch()}
        />
      ) : (
        <DataTable
          columns={columns as any}
          data={(history.data?.versions ?? []) as any}
          keyExtractor={(r) => (r as LegalDocumentVersion).id}
          emptyMessage="No versions yet."
        />
      )}

      <ConfirmModal
        open={!!restoreTarget}
        title="Restore version"
        message={
          restoreTarget
            ? `Restore v${restoreTarget.version} into the current draft? Unsaved draft content will be overwritten.`
            : ""
        }
        confirmLabel={restoreMutation.isPending ? "Restoring…" : "Restore"}
        confirmDisabled={restoreMutation.isPending}
        variant="danger"
        onCancel={() => {
          if (!restoreMutation.isPending) setRestoreTarget(null);
        }}
        onConfirm={() => restoreMutation.mutate()}
      />
    </div>
  );
}
