import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkModeratePosts,
  getAdminPostDetail,
  getPostModerationOverview,
  hardDeleteAdminPost,
  hideAdminPost,
  listAdminPosts,
  restoreAdminPost,
  softDeleteAdminPost,
  updateAdminPost,
  type AdminPostDetail,
  type AdminPostListItem
} from "../api/postsAdmin";
import { AdminListError, AdminPagination, AdminTableSkeleton } from "../components/admin/AdminListControls";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

type Filters = {
  page: number;
  limit: number;
  q?: string;
  status?: "all" | "ACTIVE" | "HIDDEN" | "SOFT_DELETED";
  postType?: string;
  visibility?: "all" | "PUBLIC" | "CONNECTIONS";
  reportStatus?: "all" | "REPORTED" | "UNREPORTED";
  sortBy?: "createdAt" | "updatedAt" | "reportCount" | "likeCount" | "commentCount" | "viewCount";
  sortDir?: "asc" | "desc";
};

const defaults: Filters = {
  page: 1,
  limit: 20,
  status: "all",
  postType: "all",
  visibility: "all",
  reportStatus: "all",
  sortBy: "createdAt",
  sortDir: "desc"
};

export function PostsModerationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();
  const { hasAction } = useAuth();
  const canManage = hasAction("posts.manage");
  const canHardDelete = hasAction("posts.delete_hard");
  const queryClient = useQueryClient();
  const [searchDraft, setSearchDraft] = useState(searchParams.get("q") ?? "");
  const [filters, setFilters] = useState<Filters>({
    ...defaults
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selectedPostId = Number(searchParams.get("postId") || "");
  const linkedReportId = Number(searchParams.get("reportId") || "");

  useEffect(() => {
    const t = window.setTimeout(() => {
      setFilters((prev) => ({ ...prev, page: 1, q: searchDraft.trim() || undefined }));
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["admin-posts-overview"],
    queryFn: getPostModerationOverview
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-posts", filters],
    queryFn: () => listAdminPosts(filters as Record<string, string | number | undefined>)
  });

  const detailQuery = useQuery({
    queryKey: ["admin-posts-detail", selectedPostId],
    queryFn: () => getAdminPostDetail(selectedPostId),
    enabled: Number.isFinite(selectedPostId) && selectedPostId > 0
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-posts-overview"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-posts-detail"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-reports-detail"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const items = data?.items ?? [];
  const allOnPageSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));

  const quickCards = useMemo(
    () => [
      { label: "Total posts", value: overview?.totalPosts ?? 0 },
      { label: "Active posts", value: overview?.activePosts ?? 0 },
      { label: "Reported posts", value: overview?.reportedPosts ?? 0 },
      { label: "Hidden posts", value: overview?.hiddenPosts ?? 0 },
      { label: "Soft deleted", value: overview?.deletedPosts ?? 0 },
      { label: "Today's reports", value: overview?.todaysReports ?? 0 }
    ],
    [overview]
  );

  const openDetail = (postId: number, reportId?: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("postId", String(postId));
    if (reportId) next.set("reportId", String(reportId));
    else next.delete("reportId");
    setSearchParams(next);
  };

  const closeDetail = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("postId");
    next.delete("reportId");
    setSearchParams(next);
  };

  const promptAction = async (type: "hide" | "restore" | "soft-delete" | "hard-delete", item: AdminPostListItem) => {
    const reason = type === "restore" ? undefined : window.prompt("Reason (optional)") || undefined;
    const remarks = window.prompt("Internal remarks (optional)") || undefined;
    try {
      if (type === "hide") await hideAdminPost(item.id, { reason, remarks, reportId: linkedReportId || undefined });
      else if (type === "restore") await restoreAdminPost(item.id, { remarks });
      else if (type === "soft-delete") await softDeleteAdminPost(item.id, { reason, remarks });
      else {
        if (!window.confirm("Permanently delete this post and related moderation/report rows?")) return;
        await hardDeleteAdminPost(item.id, { reason, remarks });
      }
      addToast(`Post ${type}d.`, "success");
      refresh();
      if (selectedPostId === item.id && type === "hard-delete") closeDetail();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Action failed", "error");
    }
  };

  const onBulk = async (action: "hide" | "restore" | "soft_delete") => {
    if (!selectedIds.length) return;
    try {
      await bulkModeratePosts({
        postIds: selectedIds,
        action,
        reason: action === "restore" ? undefined : window.prompt("Reason (optional)") || undefined,
        remarks: window.prompt("Internal remarks (optional)") || undefined
      });
      addToast("Bulk action completed.", "success");
      setSelectedIds([]);
      refresh();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Bulk action failed", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-600">
            Production moderation workspace for published posts. Reports stay the complaint workflow, while this page handles direct content actions.
          </p>
          {linkedReportId > 0 ? (
            <p className="mt-1 text-xs text-violet-700">
              Opened from report #{linkedReportId}. You can moderate the post here and then return to{" "}
              <Link to="/reports" className="font-medium underline">
                Reports
              </Link>
              .
            </p>
          ) : null}
        </div>
        <Link to="/reports" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Open Reports Workflow
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {quickCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{overviewLoading ? "—" : card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search post, author, ID..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as Filters["status"], page: 1 }))}>
            <option value="all">All states</option>
            <option value="ACTIVE">Active</option>
            <option value="HIDDEN">Hidden</option>
            <option value="SOFT_DELETED">Soft deleted</option>
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.reportStatus} onChange={(e) => setFilters((f) => ({ ...f, reportStatus: e.target.value as Filters["reportStatus"], page: 1 }))}>
            <option value="all">All reports</option>
            <option value="REPORTED">Reported only</option>
            <option value="UNREPORTED">Unreported only</option>
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.visibility} onChange={(e) => setFilters((f) => ({ ...f, visibility: e.target.value as Filters["visibility"], page: 1 }))}>
            <option value="all">All visibility</option>
            <option value="PUBLIC">Public</option>
            <option value="CONNECTIONS">Connections</option>
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.sortBy} onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value as Filters["sortBy"], page: 1 }))}>
            <option value="createdAt">Newest</option>
            <option value="updatedAt">Updated</option>
            <option value="reportCount">Most reported</option>
            <option value="likeCount">Most liked</option>
            <option value="commentCount">Most commented</option>
            <option value="viewCount">Most viewed</option>
          </select>
          {canManage ? (
            <>
              <button type="button" onClick={() => void onBulk("hide")} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 disabled:opacity-50" disabled={!selectedIds.length}>
                Bulk hide
              </button>
              <button type="button" onClick={() => void onBulk("restore")} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 disabled:opacity-50" disabled={!selectedIds.length}>
                Bulk restore
              </button>
              <button type="button" onClick={() => void onBulk("soft_delete")} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50" disabled={!selectedIds.length}>
                Bulk soft delete
              </button>
            </>
          ) : null}
        </div>
      </div>

      {isLoading && !data ? (
        <AdminTableSkeleton rows={8} cols={8} />
      ) : isError ? (
        <AdminListError message={error instanceof Error ? error.message : "Failed to load posts"} onRetry={() => void refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked ? [...new Set([...selectedIds, ...items.map((item) => item.id)])] : selectedIds.filter((id) => !items.some((item) => item.id === id))
                      )
                    }
                  />
                </th>
                <th className="px-4 py-3">Post</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Engagement</th>
                <th className="px-4 py-3">Reports</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">No posts found.</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) =>
                          setSelectedIds((prev) => (e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)))
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">#{item.id} · {item.title}</div>
                      <div className="max-w-md truncate text-xs text-slate-500">{item.description || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{item.authorName}</div>
                      <div className="text-xs text-slate-500">#{item.userId} · {item.authorDistrict ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{item.postType}</div>
                      <div className="text-xs text-slate-500">{item.visibility}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.moderationStatus} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div>Likes {item.likeCount}</div>
                      <div>Comments {item.commentCount}</div>
                      <div>Views {item.viewCount}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.reportCount > 0 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                        {item.reportCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">{new Date(item.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-3 text-sm">
                        <button type="button" className="font-medium text-primary hover:underline" onClick={() => openDetail(item.id)}>
                          View
                        </button>
                        {canManage && item.moderationStatus === "ACTIVE" ? (
                          <>
                            <button type="button" className="text-amber-700 hover:underline" onClick={() => void promptAction("hide", item)}>Hide</button>
                            <button type="button" className="text-red-700 hover:underline" onClick={() => void promptAction("soft-delete", item)}>Soft Delete</button>
                          </>
                        ) : null}
                        {canManage && item.moderationStatus !== "ACTIVE" ? (
                          <button type="button" className="text-emerald-700 hover:underline" onClick={() => void promptAction("restore", item)}>Restore</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <AdminPagination page={data?.page ?? 1} total={data?.total ?? 0} limit={filters.limit ?? 20} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} onLimitChange={(limit) => setFilters((f) => ({ ...f, limit, page: 1 }))} className="px-4 pb-3" />
        </div>
      )}

      {selectedPostId > 0 ? (
        <PostDetailDrawer
          detail={detailQuery.data}
          loading={detailQuery.isLoading}
          onClose={closeDetail}
          onRefresh={refresh}
          linkedReportId={linkedReportId || undefined}
          canManage={canManage}
          canHardDelete={canHardDelete}
        />
      ) : null}
    </div>
  );
}

function PostDetailDrawer({
  detail,
  loading,
  onClose,
  onRefresh,
  linkedReportId,
  canManage = false,
  canHardDelete = false
}: {
  detail?: AdminPostDetail;
  loading?: boolean;
  onClose: () => void;
  onRefresh: () => void;
  linkedReportId?: number;
  canManage?: boolean;
  canHardDelete?: boolean;
}) {
  const { addToast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "CONNECTIONS">("PUBLIC");
  const [hashtags, setHashtags] = useState("");

  useEffect(() => {
    if (!detail) return;
    setTitle(detail.post.title);
    setDescription(detail.post.description ?? "");
    setVisibility((detail.post.visibility as "PUBLIC" | "CONNECTIONS") ?? "PUBLIC");
    setHashtags((detail.post.hashtags ?? []).join(", "));
  }, [detail]);

  const runAction = async (type: "hide" | "restore" | "soft-delete" | "hard-delete") => {
    if (!detail) return;
    try {
      if (type === "hide") await hideAdminPost(detail.post.id, { reason: window.prompt("Reason") || undefined, remarks: window.prompt("Remarks") || undefined, reportId: linkedReportId });
      else if (type === "restore") await restoreAdminPost(detail.post.id, { remarks: window.prompt("Remarks") || undefined });
      else if (type === "soft-delete") await softDeleteAdminPost(detail.post.id, { reason: window.prompt("Reason") || undefined, remarks: window.prompt("Remarks") || undefined });
      else {
        if (!window.confirm("Permanently delete this post?")) return;
        await hardDeleteAdminPost(detail.post.id, { reason: window.prompt("Reason") || undefined, remarks: window.prompt("Remarks") || undefined });
        onClose();
      }
      addToast("Post updated.", "success");
      onRefresh();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Action failed", "error");
    }
  };

  const saveEdit = async () => {
    if (!detail) return;
    try {
      await updateAdminPost(detail.post.id, {
        title,
        description,
        visibility,
        hashtags: hashtags.split(",").map((tag) => tag.trim()).filter(Boolean),
        remarks: window.prompt("Edit note (optional)") || undefined
      });
      addToast("Post updated.", "success");
      setEditMode(false);
      onRefresh();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to update post", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-3xl overflow-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{loading || !detail ? "Loading..." : `Post #${detail.post.id}`}</h3>
            {linkedReportId ? <p className="text-xs text-violet-700">Linked from report #{linkedReportId}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800">Close</button>
        </div>

        {loading || !detail ? (
          <p className="mt-4 text-sm text-slate-500">Loading details…</p>
        ) : (
          <div className="mt-4 space-y-6">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={detail.post.moderationStatus} />
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{detail.post.postType}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{detail.post.visibility}</span>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Reports" value={detail.reports.length} />
              <StatCard label="Likes" value={detail.post.likeCount} />
              <StatCard label="Comments" value={detail.post.commentCount} />
              <StatCard label="Views" value={detail.post.viewCount} />
            </div>

            <div className="flex flex-wrap gap-2">
              {canManage && detail.post.moderationStatus === "ACTIVE" ? (
                <>
                  <button type="button" onClick={() => void runAction("hide")} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">Hide</button>
                  <button type="button" onClick={() => void runAction("soft-delete")} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">Soft Delete</button>
                </>
              ) : null}
              {canManage && detail.post.moderationStatus !== "ACTIVE" ? (
                <button type="button" onClick={() => void runAction("restore")} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">Restore</button>
              ) : null}
              {canManage ? (
                <button type="button" onClick={() => setEditMode((v) => !v)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">Edit</button>
              ) : null}
              {canHardDelete ? (
                <button type="button" onClick={() => void runAction("hard-delete")} className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700">Permanent Delete</button>
              ) : null}
              {detail.author ? <Link to={`/users/${detail.author.id}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">View User</Link> : null}
            </div>

            {editMode ? (
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-semibold text-slate-900">Edit Post</h4>
                <div className="mt-3 space-y-3">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="tag1, tag2" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <select value={visibility} onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "CONNECTIONS")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="PUBLIC">Public</option>
                    <option value="CONNECTIONS">Connections</option>
                  </select>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void saveEdit()} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white">Save</button>
                    <button type="button" onClick={() => setEditMode(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="font-semibold text-slate-900">Post Details</h4>
              <p className="mt-2 font-medium text-slate-900">{detail.post.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{detail.post.description || "—"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {detail.post.hashtags.map((tag) => (
                  <span key={tag} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">#{tag}</span>
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {detail.post.mediaGallery.filter(Boolean).map((url, index) => (
                  <a key={`${url}-${index}`} href={url!} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <img src={url!} alt="" className="h-52 w-full object-cover" />
                  </a>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="font-semibold text-slate-900">Reports</h4>
                <div className="mt-3 space-y-3">
                  {detail.reports.length === 0 ? <p className="text-sm text-slate-500">No reports.</p> : detail.reports.map((report) => (
                    <div key={report.id} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-slate-900">Report #{report.id}</p>
                        <StatusBadge status={report.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{report.reason}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(report.createdAt).toLocaleString()}</p>
                      <Link to={`/reports`} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">Open in Reports</Link>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="font-semibold text-slate-900">Timeline</h4>
                <div className="mt-3 space-y-3">
                  {detail.timeline.length === 0 ? <p className="text-sm text-slate-500">No moderation actions yet.</p> : detail.timeline.map((event) => (
                    <div key={event.id} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-slate-900">{event.action}</p>
                        <p className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{event.adminEmail}</p>
                      {event.note ? <p className="mt-1 text-sm text-slate-600">{event.note}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
