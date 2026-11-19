import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmModal } from "../components/ConfirmModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  deleteAdminStory,
  listAdminStories,
  publishAdminStory,
  uploadAdminStoryMedia,
  type AdminStoryItem
} from "../api/adminStories";

const CAPTION_MAX = 200;
const VIDEO_MAX_SEC = 60;

type StoryType = "image" | "video" | "text";

function statusBadge(status: AdminStoryItem["status"]) {
  if (status === "active") return "bg-emerald-100 text-emerald-800";
  if (status === "expired") return "bg-amber-100 text-amber-800";
  return "bg-slate-200 text-slate-600";
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function StoriesManagementPage() {
  const { hasAction } = useAuth();
  const canManage = hasAction("stories.manage");
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [storyType, setStoryType] = useState<StoryType>("image");
  const [caption, setCaption] = useState("");
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminStoryItem | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-stories"],
    queryFn: () => listAdminStories(true)
  });

  const items = data?.items ?? [];
  const identityName = data?.identity?.name ?? "VettuvaGounder";
  const ownerConfigured = data?.identity?.owner_user_id != null;

  const clearDraft = useCallback(() => {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(null);
    setLocalFile(null);
    setCaption("");
    setUploadPct(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [localPreviewUrl]);

  const onPickFile = (file: File | null) => {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    if (!file) {
      setLocalFile(null);
      setLocalPreviewUrl(null);
      return;
    }
    setLocalFile(file);
    setLocalPreviewUrl(URL.createObjectURL(file));
    if (file.type.startsWith("video/")) setStoryType("video");
    else if (file.type.startsWith("image/")) setStoryType("image");
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminStory(id),
    onSuccess: () => {
      addToast("Story deleted", "success");
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-stories"] });
    },
    onError: (e: Error) => addToast(e.message || "Delete failed", "error")
  });

  const publish = async () => {
    if (!canManage || publishing) return;
    setPublishing(true);
    try {
      if (storyType === "text") {
        const text = caption.trim();
        if (!text) {
          addToast("Enter story text", "error");
          return;
        }
        await publishAdminStory({
          media_type: "text",
          caption: text,
          mime_type: "text/plain"
        });
      } else {
        if (!localFile) {
          addToast("Choose an image or video", "error");
          return;
        }
        setUploadPct(0);
        const uploaded = await uploadAdminStoryMedia(
          localFile,
          localFile.type || "application/octet-stream",
          setUploadPct
        );
        if (uploaded.media_kind === "video") {
          const d = uploaded.duration_seconds;
          if (d == null || d > VIDEO_MAX_SEC) {
            addToast(`Video must be ${VIDEO_MAX_SEC}s or less`, "error");
            return;
          }
        }
        await publishAdminStory({
          media_type: uploaded.media_kind,
          media_url: uploaded.key,
          caption: caption.trim() || null,
          mime_type: uploaded.mime_type,
          file_size: uploaded.byte_size,
          duration_seconds: uploaded.duration_seconds
        });
      }
      addToast("Story published — visible to all members for 24 hours", "success");
      clearDraft();
      void queryClient.invalidateQueries({ queryKey: ["admin-stories"] });
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Publish failed", "error");
    } finally {
      setPublishing(false);
      setUploadPct(null);
    }
  };

  const activeCount = useMemo(
    () => items.filter((i) => i.status === "active").length,
    [items]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt={identityName}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-200"
          />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Stories Management</h1>
            <p className="text-sm text-slate-600">
              Publishes as <span className="font-semibold">{identityName}</span> — first in every
              member&apos;s story tray. Expires after 24 hours.
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {activeCount} active
        </div>
      </div>

      {!ownerConfigured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Set <code className="font-mono">OFFICIAL_STORY_OWNER_USER_ID</code> on the API server to an
          existing member user id before publishing.
        </div>
      ) : null}

      {canManage ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
            Publish story
          </h2>
          <div className="mb-4 flex flex-wrap gap-2">
            {(["image", "video", "text"] as StoryType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setStoryType(t);
                  if (t === "text") onPickFile(null);
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${
                  storyType === t
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t === "image" ? "Photo" : t}
              </button>
            ))}
          </div>

          {storyType !== "text" ? (
            <div className="mb-4">
              <input
                ref={fileRef}
                type="file"
                accept={
                  storyType === "video"
                    ? "video/mp4,video/quicktime,video/*"
                    : "image/jpeg,image/png,image/webp"
                }
                className="block w-full text-sm text-slate-600"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
              {localPreviewUrl ? (
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
                  {storyType === "video" || localFile?.type.startsWith("video/") ? (
                    <video
                      src={localPreviewUrl}
                      controls
                      className="mx-auto max-h-72 w-full object-contain"
                    />
                  ) : (
                    <img
                      src={localPreviewUrl}
                      alt="Preview"
                      className="mx-auto max-h-72 w-full object-contain"
                    />
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Preview appears after you choose a file.</p>
              )}
            </div>
          ) : (
            <div className="mb-4 rounded-lg border border-dashed border-slate-300 bg-slate-900 p-6 text-center text-white">
              <p className="whitespace-pre-wrap text-lg font-semibold">
                {caption.trim() || "Text story preview"}
              </p>
            </div>
          )}

          <label className="mb-1 block text-sm font-medium text-slate-700">
            {storyType === "text" ? "Story text" : "Caption (optional)"}
          </label>
          <textarea
            value={caption}
            maxLength={CAPTION_MAX}
            onChange={(e) => setCaption(e.target.value)}
            rows={storyType === "text" ? 4 : 2}
            className="mb-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder={storyType === "text" ? "Write the story…" : "Optional caption"}
          />
          <p className="mb-4 text-xs text-slate-500">
            {caption.length}/{CAPTION_MAX}
          </p>

          {uploadPct != null ? (
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs text-slate-600">
                <span>Uploading…</span>
                <span>{uploadPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={publishing || !ownerConfigured}
              onClick={() => void publish()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {publishing ? "Publishing…" : "Publish"}
            </button>
            <button
              type="button"
              disabled={publishing}
              onClick={clearDraft}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          You can view stories but need <code>stories.manage</code> permission to publish or delete.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Official stories
          </h2>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Refresh
          </button>
        </div>
        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <p className="p-6 text-sm text-red-600">
            {(error as Error).message || "Failed to load"}
          </p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No official stories yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${statusBadge(item.status)}`}
                >
                  {item.status}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-700">
                  {item.media_type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.caption || "(no caption)"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Published {formatWhen(item.created_at)} · Expires {formatWhen(item.expires_at)}
                    {item.created_by_admin_email ? ` · ${item.created_by_admin_email}` : ""}
                    {` · ${item.view_count} views`}
                  </p>
                </div>
                {canManage && item.status === "active" ? (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmModal
        open={deleteTarget != null}
        title="Delete official story?"
        message="This removes the story from every member tray immediately. Media will be purged."
        confirmLabel={deleteMutation.isPending ? "Deleting…" : "Delete"}
        variant="danger"
        confirmDisabled={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
