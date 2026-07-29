import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLegalDraft,
  getLatestLegalDocument,
  publishLegalDocument,
  updateLegalDraft,
  type LegalVersionBump
} from "../../api/legalDocumentsAdmin";
import { ConfirmModal } from "../../components/ConfirmModal";
import { AdminListError, AdminTableSkeleton } from "../../components/admin/AdminListControls";
import { PermissionGate } from "../../components/PermissionGate";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { LegalRichTextEditor } from "./components/LegalRichTextEditor";
import { LegalHtmlPreview } from "./components/LegalHtmlPreview";

export function LegalDocumentEditPage() {
  const { documentKey = "" } = useParams<{ documentKey: string }>();
  const { addToast } = useToast();
  const { hasAction } = useAuth();
  const canManage = hasAction("settings.legal_manage");
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [baseline, setBaseline] = useState({ title: "", content: "", changeSummary: "" });
  const [publishOpen, setPublishOpen] = useState(false);
  const [bump, setBump] = useState<LegalVersionBump>("minor");
  const [publishSummary, setPublishSummary] = useState("");

  const latest = useQuery({
    queryKey: ["admin-legal-latest", documentKey],
    queryFn: () => getLatestLegalDocument(documentKey),
    enabled: !!documentKey
  });

  const doc = latest.data?.document ?? null;
  const isDraft = doc?.status === "DRAFT";
  const dirty =
    title !== baseline.title ||
    content !== baseline.content ||
    changeSummary !== baseline.changeSummary;

  useUnsavedChanges(dirty);

  useEffect(() => {
    if (!latest.isSuccess) return;
    const d = latest.data.document;
    const next = {
      title: d?.title ?? "",
      content: d?.content ?? "",
      changeSummary: d?.changeSummary ?? ""
    };
    setTitle(next.title);
    setContent(next.content);
    setChangeSummary(next.changeSummary);
    setBaseline(next);
  }, [latest.isSuccess, latest.dataUpdatedAt, documentKey]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["admin-legal-latest", documentKey] });
    void queryClient.invalidateQueries({ queryKey: ["admin-legal-documents"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-legal-history", documentKey] });
  }, [queryClient, documentKey]);

  const persistDraft = useCallback(async () => {
    if (!documentKey) throw new Error("Missing document key");
    if (!content.trim()) throw new Error("Content is required.");
    if (isDraft && doc?.id) {
      return updateLegalDraft(doc.id, {
        title: title.trim() || undefined,
        content,
        changeSummary: changeSummary.trim() || null
      });
    }
    return createLegalDraft({
      documentKey,
      title: title.trim() || undefined,
      content,
      changeSummary: changeSummary.trim() || null
    });
  }, [documentKey, content, isDraft, doc?.id, title, changeSummary]);

  const applySaved = useCallback(
    (res: { document: { title: string; content?: string; changeSummary: string | null } }) => {
      const next = {
        title: res.document.title,
        content: res.document.content ?? content,
        changeSummary: res.document.changeSummary ?? ""
      };
      setTitle(next.title);
      setContent(next.content);
      setChangeSummary(next.changeSummary);
      setBaseline(next);
      invalidate();
    },
    [content, invalidate]
  );

  const saveMutation = useMutation({
    mutationFn: persistDraft,
    onSuccess: (res) => {
      applySaved(res);
      addToast(isDraft ? "Draft saved." : "Draft created.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to save draft", "error")
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      let documentId = isDraft ? doc?.id : undefined;
      if (dirty) {
        const saved = await persistDraft();
        applySaved(saved);
        documentId = saved.document.id;
      } else if (!isDraft) {
        throw new Error("Save a draft before publishing.");
      }
      return publishLegalDocument(documentKey, {
        bump,
        changeSummary: publishSummary.trim() || changeSummary.trim() || null,
        documentId
      });
    },
    onSuccess: (res) => {
      addToast(`Published as v${res.document.version}.`, "success");
      setPublishOpen(false);
      setPublishSummary("");
      setBump("minor");
      invalidate();
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Publish failed", "error")
  });

  const statusLabel = useMemo(() => {
    if (!doc) return "Empty";
    if (doc.status === "DRAFT") return "Draft";
    if (doc.isPublished) return "Published";
    return String(doc.status);
  }, [doc]);

  if (!documentKey) {
    return <AdminListError message="Missing document key." />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {doc?.title || documentKey}
            </h2>
            <StatusBadge
              status={statusLabel}
              variant={
                statusLabel === "Published"
                  ? "approved"
                  : statusLabel === "Draft"
                    ? "pending"
                    : "suspended"
              }
            />
            {doc?.version ? (
              <span className="font-mono text-xs text-slate-500">v{doc.version}</span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Key: <span className="font-mono">{documentKey}</span>
            {!isDraft && doc ? (
              <span className="ml-2 text-amber-700">
                Editing published content will create a new draft on save.
              </span>
            ) : null}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
            <Link to="/settings/legal" className="text-slate-500 hover:text-primary">
              ← All documents
            </Link>
            <Link
              to={`/settings/legal/${encodeURIComponent(documentKey)}/history`}
              className="text-slate-600 hover:underline"
            >
              History
            </Link>
          </div>
        </div>

        <PermissionGate
          action="settings.legal_manage"
          otherwise={
            <p className="text-xs text-slate-500">View only — you lack publish permission.</p>
          }
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saveMutation.isPending || (!dirty && isDraft)}
              onClick={() => saveMutation.mutate()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {saveMutation.isPending
                ? "Saving…"
                : isDraft
                  ? "Save draft"
                  : "Create draft"}
            </button>
            <button
              type="button"
              disabled={!isDraft && !dirty}
              onClick={() => {
                setPublishSummary(changeSummary);
                setPublishOpen(true);
              }}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Publish…
            </button>
          </div>
        </PermissionGate>
      </div>

      {latest.isLoading ? (
        <AdminTableSkeleton rows={6} cols={2} />
      ) : latest.isError ? (
        <AdminListError
          message={
            latest.error instanceof Error ? latest.error.message : "Failed to load document."
          }
          onRetry={() => void latest.refetch()}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Title
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                value={title}
                disabled={!canManage}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Change summary
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                value={changeSummary}
                disabled={!canManage}
                onChange={(e) => setChangeSummary(e.target.value)}
                maxLength={500}
                placeholder="Internal note for this draft"
              />
            </label>
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Content</div>
              <LegalRichTextEditor
                value={content}
                onChange={setContent}
                disabled={!canManage}
              />
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm font-medium text-slate-700">Live preview</div>
            <LegalHtmlPreview html={content} className="max-h-[70vh] overflow-y-auto" />
          </div>
        </div>
      )}

      <ConfirmModal
        open={publishOpen}
        title="Publish document"
        message="Publishing replaces the live version. Choose a version bump and optional summary for members."
        confirmLabel={publishMutation.isPending ? "Publishing…" : "Publish"}
        confirmDisabled={publishMutation.isPending}
        onCancel={() => {
          if (!publishMutation.isPending) setPublishOpen(false);
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
              <option value="minor">Minor</option>
              <option value="major">Major</option>
            </select>
          </label>
          <label className="block text-sm text-slate-700">
            Change summary
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={publishSummary}
              onChange={(e) => setPublishSummary(e.target.value)}
              maxLength={500}
            />
          </label>
        </div>
      </ConfirmModal>

    </div>
  );
}
