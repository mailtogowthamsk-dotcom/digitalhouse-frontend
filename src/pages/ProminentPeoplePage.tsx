import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProminentPerson,
  deleteProminentPerson,
  getProminentPerson,
  listProminentCategories,
  listProminentPeople,
  setProminentFeatured,
  setProminentPublished,
  updateProminentPerson,
  uploadProminentImage,
  type ProminentGalleryItem,
  type ProminentPersonCard,
  type ProminentPersonWriteBody,
  type ProminentTimelineEntry,
  type ProminentUploadKind
} from "../api/prominentPeopleAdmin";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  AdminListError,
  AdminPagination,
  AdminTableSkeleton
} from "../components/admin/AdminListControls";
import { useToast } from "../context/ToastContext";

type PublishedFilter = "all" | "published" | "draft";
type FeaturedFilter = "all" | "featured" | "not_featured";

type ConfirmState =
  | { type: "delete" | "publish" | "unpublish" | "feature" | "unfeature"; item: ProminentPersonCard }
  | null;

type GalleryDraft = {
  localId: string;
  imageKey: string;
  caption: string;
  previewUrl: string | null;
  sortOrder: number;
};

type TimelineDraft = {
  localId: string;
  year: string;
  title: string;
  description: string;
};

type FormState = {
  fullName: string;
  categoryId: number | "";
  occupation: string;
  currentDesignation: string;
  shortDescription: string;
  biography: string;
  education: string;
  achievements: string;
  awards: string;
  communityContribution: string;
  profileImageKey: string | null;
  profilePreviewUrl: string | null;
  heroImageKey: string | null;
  heroPreviewUrl: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  featuredSortOrder: number;
  sortOrder: number;
  timeline: TimelineDraft[];
  gallery: GalleryDraft[];
};

function emptyForm(): FormState {
  return {
    fullName: "",
    categoryId: "",
    occupation: "",
    currentDesignation: "",
    shortDescription: "",
    biography: "",
    education: "",
    achievements: "",
    awards: "",
    communityContribution: "",
    profileImageKey: null,
    profilePreviewUrl: null,
    heroImageKey: null,
    heroPreviewUrl: null,
    isFeatured: false,
    isPublished: false,
    featuredSortOrder: 0,
    sortOrder: 0,
    timeline: [],
    gallery: []
  };
}

function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nullIfEmpty(v: string): string | null {
  const t = v.trim();
  return t ? t : null;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-sm font-medium text-slate-700">{children}</span>;
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
const textareaCls = `${inputCls} min-h-[88px] resize-y`;

export function ProminentPeoplePage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [publishedFilter, setPublishedFilter] = useState<PublishedFilter>("all");
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>("all");
  const [sort, setSort] = useState<"latest" | "alphabetical">("latest");

  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [limit, categoryId, publishedFilter, featuredFilter, sort, searchQ]);

  const categoriesQuery = useQuery({
    queryKey: ["admin-prominent-categories"],
    queryFn: listProminentCategories
  });

  const listQuery = useQuery({
    queryKey: [
      "admin-prominent-people",
      page,
      limit,
      searchQ,
      categoryId,
      publishedFilter,
      featuredFilter,
      sort
    ],
    queryFn: () =>
      listProminentPeople({
        page,
        limit,
        q: searchQ || undefined,
        categoryId: categoryId === "" ? undefined : categoryId,
        published:
          publishedFilter === "all"
            ? undefined
            : publishedFilter === "published"
              ? true
              : false,
        featured:
          featuredFilter === "all"
            ? undefined
            : featuredFilter === "featured"
              ? true
              : false,
        sort
      })
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-prominent-people"] });
  };

  const publishMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      setProminentPublished(id, value),
    onSuccess: (_d, vars) => {
      invalidate();
      setConfirm(null);
      addToast(vars.value ? "Published." : "Unpublished.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to update publish", "error")
  });

  const featureMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      setProminentFeatured(id, value),
    onSuccess: (_d, vars) => {
      invalidate();
      setConfirm(null);
      addToast(vars.value ? "Marked featured." : "Removed from featured.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to update featured", "error")
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProminentPerson(id),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      if (editingId != null) {
        setFormOpen(false);
        setEditingId(null);
      }
      addToast("Person deleted.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to delete", "error")
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.fullName.trim() || form.fullName.trim().length < 2) {
        throw new Error("Full name is required (min 2 characters).");
      }
      if (form.categoryId === "") {
        throw new Error("Category is required.");
      }
      const body: ProminentPersonWriteBody = {
        fullName: form.fullName.trim(),
        categoryId: form.categoryId,
        occupation: nullIfEmpty(form.occupation),
        currentDesignation: nullIfEmpty(form.currentDesignation),
        shortDescription: nullIfEmpty(form.shortDescription),
        biography: nullIfEmpty(form.biography),
        education: nullIfEmpty(form.education),
        achievements: nullIfEmpty(form.achievements),
        awards: nullIfEmpty(form.awards),
        communityContribution: nullIfEmpty(form.communityContribution),
        profileImageKey: form.profileImageKey,
        heroImageKey: form.heroImageKey,
        isFeatured: form.isFeatured,
        isPublished: form.isPublished,
        featuredSortOrder: form.featuredSortOrder,
        sortOrder: form.sortOrder,
        timeline: form.timeline
          .filter((t) => t.year.trim() && t.title.trim())
          .map((t, i) => ({
            year: t.year.trim(),
            title: t.title.trim(),
            description: nullIfEmpty(t.description),
            sortOrder: i
          })),
        gallery: form.gallery.map((g, i) => ({
          imageKey: g.imageKey,
          caption: nullIfEmpty(g.caption),
          sortOrder: i
        }))
      };
      if (editingId != null) {
        return updateProminentPerson(editingId, body);
      }
      return createProminentPerson(body);
    },
    onSuccess: () => {
      const wasEdit = editingId != null;
      invalidate();
      setFormOpen(false);
      setEditingId(null);
      addToast(wasEdit ? "Person updated." : "Person created.", "success");
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to save", "error")
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = async (id: number) => {
    setEditingId(id);
    setFormOpen(true);
    setForm(emptyForm());
    try {
      const { person } = await getProminentPerson(id);
      setForm({
        fullName: person.fullName ?? "",
        categoryId: person.category?.id ?? "",
        occupation: person.occupation ?? "",
        currentDesignation: person.currentDesignation ?? "",
        shortDescription: person.shortDescription ?? "",
        biography: person.biography ?? "",
        education: person.education ?? "",
        achievements: person.achievements ?? "",
        awards: person.awards ?? "",
        communityContribution: person.communityContribution ?? "",
        profileImageKey: person.profileImageKey,
        profilePreviewUrl: person.profileImageUrl,
        heroImageKey: person.heroImageKey,
        heroPreviewUrl: person.heroImageUrl,
        isFeatured: !!person.isFeatured,
        isPublished: !!person.isPublished,
        featuredSortOrder: person.featuredSortOrder ?? 0,
        sortOrder: person.sortOrder ?? 0,
        timeline: (person.timeline ?? []).map((t: ProminentTimelineEntry) => ({
          localId: uid(),
          year: t.year ?? "",
          title: t.title ?? "",
          description: t.description ?? ""
        })),
        gallery: (person.gallery ?? []).map((g: ProminentGalleryItem, i: number) => ({
          localId: uid(),
          imageKey: g.imageKey,
          caption: g.caption ?? "",
          previewUrl: g.imageUrl ?? null,
          sortOrder: g.sortOrder ?? i
        }))
      });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to load person", "error");
      setFormOpen(false);
      setEditingId(null);
    }
  };

  const patchForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (
    file: File | undefined,
    kind: ProminentUploadKind,
    onDone: (key: string, publicUrl: string) => void
  ) => {
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      addToast("Only JPEG, PNG, or WebP images are allowed.", "error");
      return;
    }
    setUploading(kind);
    try {
      const { key, publicUrl } = await uploadProminentImage(file, kind);
      onDone(key, publicUrl);
      addToast("Image uploaded.", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(null);
    }
  };

  const moveTimeline = (index: number, dir: -1 | 1) => {
    setForm((prev) => {
      const next = [...prev.timeline];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, timeline: next };
    });
  };

  const moveGallery = (index: number, dir: -1 | 1) => {
    setForm((prev) => {
      const next = [...prev.gallery];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, gallery: next };
    });
  };

  const mutationPending =
    publishMutation.isPending ||
    featureMutation.isPending ||
    deleteMutation.isPending ||
    saveMutation.isPending;

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const categories = categoriesQuery.data ?? [];

  const columns = useMemo(
    () => [
      {
        key: "person",
        label: "Person",
        render: (r: ProminentPersonCard) => (
          <div className="flex items-center gap-3">
            {r.profileImageUrl ? (
              <img
                src={r.profileImageUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                {r.fullName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-medium text-slate-900">{r.fullName}</div>
              <div className="text-xs text-slate-500">
                {r.occupation || r.currentDesignation || "—"}
              </div>
            </div>
          </div>
        )
      },
      {
        key: "category",
        label: "Category",
        render: (r: ProminentPersonCard) =>
          r.category ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
              style={
                r.category.color
                  ? { backgroundColor: `${r.category.color}22`, color: r.category.color }
                  : undefined
              }
            >
              {r.category.label}
            </span>
          ) : (
            "—"
          )
      },
      {
        key: "published",
        label: "Published",
        render: (r: ProminentPersonCard) => (
          <StatusBadge
            status={r.isPublished ? "Published" : "Draft"}
            variant={r.isPublished ? "approved" : "suspended"}
          />
        )
      },
      {
        key: "featured",
        label: "Featured",
        render: (r: ProminentPersonCard) =>
          r.isFeatured ? (
            <StatusBadge status="Featured" variant="active" />
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )
      },
      {
        key: "actions",
        label: "Actions",
        render: (r: ProminentPersonCard) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void openEdit(r.id)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() =>
                setConfirm({ type: r.isPublished ? "unpublish" : "publish", item: r })
              }
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              {r.isPublished ? "Unpublish" : "Publish"}
            </button>
            <button
              type="button"
              onClick={() =>
                setConfirm({ type: r.isFeatured ? "unfeature" : "feature", item: r })
              }
              className="text-sm font-medium text-amber-700 hover:underline"
            >
              {r.isFeatured ? "Unfeature" : "Feature"}
            </button>
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
    // openEdit is stable enough for row actions; recreate when toast identity changes rarely
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-2xl text-sm text-slate-600">
          Manage community prominent people profiles — biography, gallery, timeline, and
          featured placement for the mobile app.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-95"
        >
          Add person
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={categoryId}
          onChange={(e) =>
            setCategoryId(e.target.value ? Number(e.target.value) : "")
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={publishedFilter}
          onChange={(e) => setPublishedFilter(e.target.value as PublishedFilter)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All publish status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select
          value={featuredFilter}
          onChange={(e) => setFeaturedFilter(e.target.value as FeaturedFilter)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All featured</option>
          <option value="featured">Featured only</option>
          <option value="not_featured">Not featured</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "latest" | "alphabetical")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="latest">Sort: Latest</option>
          <option value="alphabetical">Sort: A–Z</option>
        </select>
        <input
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setSearchQ(searchDraft.trim());
            }
          }}
          placeholder="Search name, occupation…"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => setSearchQ(searchDraft.trim())}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => {
            setSearchDraft("");
            setSearchQ("");
            setCategoryId("");
            setPublishedFilter("all");
            setFeaturedFilter("all");
            setSort("latest");
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Reset
        </button>
      </div>

      {listQuery.isError ? (
        <AdminListError
          message={
            listQuery.error instanceof Error
              ? listQuery.error.message
              : "Failed to load prominent people"
          }
          onRetry={() => void listQuery.refetch()}
        />
      ) : listQuery.isLoading ? (
        <AdminTableSkeleton rows={8} cols={5} />
      ) : (
        <DataTable
          columns={columns as any}
          data={items as any}
          keyExtractor={(row) => (row as ProminentPersonCard).id}
          emptyMessage="No prominent people yet. Click Add person to create one."
        />
      )}

      <AdminPagination
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingId != null ? "Edit person" : "Add person"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setEditingId(null);
                }}
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
              <section className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <FieldLabel>Full name *</FieldLabel>
                  <input
                    className={inputCls}
                    value={form.fullName}
                    onChange={(e) => patchForm("fullName", e.target.value)}
                  />
                </label>
                <label className="block">
                  <FieldLabel>Category *</FieldLabel>
                  <select
                    className={inputCls}
                    value={form.categoryId}
                    onChange={(e) =>
                      patchForm(
                        "categoryId",
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                  >
                    <option value="">Select category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <FieldLabel>Occupation</FieldLabel>
                  <input
                    className={inputCls}
                    value={form.occupation}
                    onChange={(e) => patchForm("occupation", e.target.value)}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <FieldLabel>Current designation</FieldLabel>
                  <input
                    className={inputCls}
                    value={form.currentDesignation}
                    onChange={(e) => patchForm("currentDesignation", e.target.value)}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <FieldLabel>Short description</FieldLabel>
                  <textarea
                    className={textareaCls}
                    value={form.shortDescription}
                    onChange={(e) => patchForm("shortDescription", e.target.value)}
                    maxLength={500}
                  />
                </label>
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-800">Long-form content</h4>
                {(
                  [
                    ["biography", "Biography"],
                    ["education", "Education"],
                    ["achievements", "Achievements"],
                    ["awards", "Awards"],
                    ["communityContribution", "Community contribution"]
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block">
                    <FieldLabel>{label}</FieldLabel>
                    <textarea
                      className={textareaCls}
                      value={form[key]}
                      onChange={(e) => patchForm(key, e.target.value)}
                    />
                  </label>
                ))}
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Profile image</FieldLabel>
                  {form.profilePreviewUrl ? (
                    <img
                      src={form.profilePreviewUrl}
                      alt=""
                      className="mb-2 h-24 w-24 rounded-full object-cover"
                    />
                  ) : null}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading === "profile"}
                    onChange={(e) =>
                      void handleImageUpload(e.target.files?.[0], "profile", (key, url) => {
                        setForm((prev) => ({
                          ...prev,
                          profileImageKey: key,
                          profilePreviewUrl: url
                        }));
                      })
                    }
                    className="block w-full text-sm text-slate-600"
                  />
                  {form.profileImageKey ? (
                    <button
                      type="button"
                      className="mt-1 text-xs text-red-600 hover:underline"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          profileImageKey: null,
                          profilePreviewUrl: null
                        }))
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div>
                  <FieldLabel>Hero image</FieldLabel>
                  {form.heroPreviewUrl ? (
                    <img
                      src={form.heroPreviewUrl}
                      alt=""
                      className="mb-2 h-24 w-full rounded-lg object-cover"
                    />
                  ) : null}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading === "hero"}
                    onChange={(e) =>
                      void handleImageUpload(e.target.files?.[0], "hero", (key, url) => {
                        setForm((prev) => ({
                          ...prev,
                          heroImageKey: key,
                          heroPreviewUrl: url
                        }));
                      })
                    }
                    className="block w-full text-sm text-slate-600"
                  />
                  {form.heroImageKey ? (
                    <button
                      type="button"
                      className="mt-1 text-xs text-red-600 hover:underline"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          heroImageKey: null,
                          heroPreviewUrl: null
                        }))
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => patchForm("isPublished", e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => patchForm("isFeatured", e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Featured
                </label>
                <label className="block">
                  <FieldLabel>Featured sort order</FieldLabel>
                  <input
                    type="number"
                    className={inputCls}
                    value={form.featuredSortOrder}
                    onChange={(e) =>
                      patchForm("featuredSortOrder", Number(e.target.value) || 0)
                    }
                  />
                </label>
                <label className="block">
                  <FieldLabel>Sort order</FieldLabel>
                  <input
                    type="number"
                    className={inputCls}
                    value={form.sortOrder}
                    onChange={(e) => patchForm("sortOrder", Number(e.target.value) || 0)}
                  />
                </label>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">Timeline</h4>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        timeline: [
                          ...prev.timeline,
                          { localId: uid(), year: "", title: "", description: "" }
                        ]
                      }))
                    }
                  >
                    Add entry
                  </button>
                </div>
                {form.timeline.length === 0 ? (
                  <p className="text-xs text-slate-500">No timeline entries yet.</p>
                ) : (
                  <div className="space-y-3">
                    {form.timeline.map((t, index) => (
                      <div
                        key={t.localId}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="mb-2 flex flex-wrap gap-2">
                          <input
                            className={`${inputCls} max-w-[100px]`}
                            placeholder="Year"
                            value={t.year}
                            onChange={(e) =>
                              setForm((prev) => {
                                const next = [...prev.timeline];
                                next[index] = { ...next[index], year: e.target.value };
                                return { ...prev, timeline: next };
                              })
                            }
                          />
                          <input
                            className={`${inputCls} min-w-[160px] flex-1`}
                            placeholder="Title"
                            value={t.title}
                            onChange={(e) =>
                              setForm((prev) => {
                                const next = [...prev.timeline];
                                next[index] = { ...next[index], title: e.target.value };
                                return { ...prev, timeline: next };
                              })
                            }
                          />
                        </div>
                        <textarea
                          className={textareaCls}
                          placeholder="Description (optional)"
                          value={t.description}
                          onChange={(e) =>
                            setForm((prev) => {
                              const next = [...prev.timeline];
                              next[index] = { ...next[index], description: e.target.value };
                              return { ...prev, timeline: next };
                            })
                          }
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveTimeline(index, -1)}
                            className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-40"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            disabled={index === form.timeline.length - 1}
                            onClick={() => moveTimeline(index, 1)}
                            className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-40"
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                timeline: prev.timeline.filter((_, i) => i !== index)
                              }))
                            }
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">Gallery</h4>
                  <label className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    {uploading === "gallery" ? "Uploading…" : "Add images"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      disabled={uploading === "gallery"}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        e.target.value = "";
                        for (const file of files) {
                          await handleImageUpload(file, "gallery", (key, url) => {
                            setForm((prev) => ({
                              ...prev,
                              gallery: [
                                ...prev.gallery,
                                {
                                  localId: uid(),
                                  imageKey: key,
                                  caption: "",
                                  previewUrl: url,
                                  sortOrder: prev.gallery.length
                                }
                              ]
                            }));
                          });
                        }
                      }}
                    />
                  </label>
                </div>
                {form.gallery.length === 0 ? (
                  <p className="text-xs text-slate-500">No gallery images yet.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {form.gallery.map((g, index) => (
                      <div
                        key={g.localId}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        {g.previewUrl ? (
                          <img
                            src={g.previewUrl}
                            alt=""
                            className="mb-2 h-28 w-full rounded-md object-cover"
                          />
                        ) : (
                          <div className="mb-2 flex h-28 items-center justify-center rounded-md bg-slate-200 text-xs text-slate-500">
                            No preview
                          </div>
                        )}
                        <input
                          className={inputCls}
                          placeholder="Caption (optional)"
                          value={g.caption}
                          onChange={(e) =>
                            setForm((prev) => {
                              const next = [...prev.gallery];
                              next[index] = { ...next[index], caption: e.target.value };
                              return { ...prev, gallery: next };
                            })
                          }
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveGallery(index, -1)}
                            className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-40"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            disabled={index === form.gallery.length - 1}
                            onClick={() => moveGallery(index, 1)}
                            className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-40"
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                gallery: prev.gallery.filter((_, i) => i !== index)
                              }))
                            }
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {uploading ? (
                <p className="text-sm text-slate-500">Uploading {uploading} image…</p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setFormOpen(false);
                  setEditingId(null);
                }}
                disabled={saveMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || uploading != null}
              >
                {saveMutation.isPending ? "Saving…" : editingId != null ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={confirm != null}
        title={
          confirm?.type === "delete"
            ? "Delete person"
            : confirm?.type === "publish"
              ? "Publish person"
              : confirm?.type === "unpublish"
                ? "Unpublish person"
                : confirm?.type === "feature"
                  ? "Feature person"
                  : "Remove featured"
        }
        message={
          confirm?.type === "delete"
            ? `Permanently delete “${confirm.item.fullName}”? This cannot be undone.`
            : confirm?.type === "publish"
              ? `Publish “${confirm.item.fullName}” so they appear in the app?`
              : confirm?.type === "unpublish"
                ? `Unpublish “${confirm.item.fullName}”? They will be hidden from the app.`
                : confirm?.type === "feature"
                  ? `Mark “${confirm.item.fullName}” as featured?`
                  : confirm
                    ? `Remove “${confirm.item.fullName}” from featured?`
                    : ""
        }
        confirmLabel={
          confirm?.type === "delete"
            ? "Delete"
            : confirm?.type === "publish"
              ? "Publish"
              : confirm?.type === "unpublish"
                ? "Unpublish"
                : confirm?.type === "feature"
                  ? "Feature"
                  : "Unfeature"
        }
        variant={confirm?.type === "delete" ? "danger" : "default"}
        confirmDisabled={mutationPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === "delete") {
            deleteMutation.mutate(confirm.item.id);
          } else if (confirm.type === "publish" || confirm.type === "unpublish") {
            publishMutation.mutate({
              id: confirm.item.id,
              value: confirm.type === "publish"
            });
          } else {
            featureMutation.mutate({
              id: confirm.item.id,
              value: confirm.type === "feature"
            });
          }
        }}
      />
    </div>
  );
}
