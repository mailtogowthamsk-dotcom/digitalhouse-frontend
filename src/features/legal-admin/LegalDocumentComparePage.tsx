import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { compareLegalDocuments } from "../../api/legalDocumentsAdmin";
import { StatusBadge } from "../../components/StatusBadge";
import { AdminListError, AdminTableSkeleton } from "../../components/admin/AdminListControls";
import { LegalHtmlPreview } from "./components/LegalHtmlPreview";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function VersionMeta({
  label,
  version,
  status,
  updatedAt,
  updatedBy,
  changeSummary
}: {
  label: string;
  version: string;
  status: string;
  updatedAt: string;
  updatedBy: string | null;
  changeSummary: string | null;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="font-mono text-sm font-semibold text-slate-900">v{version}</span>
      <StatusBadge
        status={status}
        variant={
          status === "PUBLISHED" ? "approved" : status === "DRAFT" ? "pending" : "suspended"
        }
      />
      <span className="text-xs text-slate-500">
        {formatWhen(updatedAt)}
        {updatedBy ? ` · ${updatedBy}` : ""}
      </span>
      {changeSummary ? (
        <p className="w-full text-xs text-slate-600">{changeSummary}</p>
      ) : null}
    </div>
  );
}

export function LegalDocumentComparePage() {
  const { documentKey = "" } = useParams<{ documentKey: string }>();
  const [params] = useSearchParams();
  const leftId = Number(params.get("leftId") || "");
  const rightId = Number(params.get("rightId") || "");
  const idsOk = Number.isFinite(leftId) && leftId > 0 && Number.isFinite(rightId) && rightId > 0;

  const compare = useQuery({
    queryKey: ["admin-legal-compare", documentKey, leftId, rightId],
    queryFn: () => compareLegalDocuments(documentKey, leftId, rightId),
    enabled: !!documentKey && idsOk
  });

  if (!documentKey) {
    return <AdminListError message="Missing document key." />;
  }

  if (!idsOk) {
    return (
      <div>
        <AdminListError message="Provide leftId and rightId query parameters to compare versions." />
        <Link
          to={`/settings/legal/${encodeURIComponent(documentKey)}/history`}
          className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          ← Back to history
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Compare versions</h2>
        <p className="mt-1 text-sm text-slate-600">
          Key: <span className="font-mono text-xs">{documentKey}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
          <Link
            to={`/settings/legal/${encodeURIComponent(documentKey)}/history`}
            className="text-slate-500 hover:text-primary"
          >
            ← History
          </Link>
          <Link
            to={`/settings/legal/${encodeURIComponent(documentKey)}`}
            className="text-slate-600 hover:underline"
          >
            Edit
          </Link>
        </div>
      </div>

      {compare.isLoading ? (
        <AdminTableSkeleton rows={8} cols={2} />
      ) : compare.isError ? (
        <AdminListError
          message={
            compare.error instanceof Error ? compare.error.message : "Failed to compare versions."
          }
          onRetry={() => void compare.refetch()}
        />
      ) : compare.data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <VersionMeta
              label="Left"
              version={compare.data.left.version}
              status={String(compare.data.left.status)}
              updatedAt={compare.data.left.updatedAt}
              updatedBy={compare.data.left.updatedBy}
              changeSummary={compare.data.left.changeSummary}
            />
            <LegalHtmlPreview
              html={compare.data.left.content ?? ""}
              className="max-h-[70vh] overflow-y-auto border-0 p-0 shadow-none"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <VersionMeta
              label="Right"
              version={compare.data.right.version}
              status={String(compare.data.right.status)}
              updatedAt={compare.data.right.updatedAt}
              updatedBy={compare.data.right.updatedBy}
              changeSummary={compare.data.right.changeSummary}
            />
            <LegalHtmlPreview
              html={compare.data.right.content ?? ""}
              className="max-h-[70vh] overflow-y-auto border-0 p-0 shadow-none"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
