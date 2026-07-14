import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listMasterDataTypes,
  listMasterDataItems,
  createMasterDataItem,
  updateMasterDataItem,
  listMasterDataAudits,
  type MdmType,
  type MdmItem,
  type MdmAudit
} from "../api/masterDataAdmin";
import {
  AdminPagination,
  AdminTableSkeleton
} from "../components/admin/AdminListControls";
import { useToast } from "../context/ToastContext";

export function MasterDataPage() {
  const { addToast } = useToast();
  const [types, setTypes] = useState<MdmType[]>([]);
  const [typeCode, setTypeCode] = useState("DISTRICT");
  const [items, setItems] = useState<MdmItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [active, setActive] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [parentId, setParentId] = useState<number | undefined>();
  const [parents, setParents] = useState<MdmItem[]>([]);
  const [audits, setAudits] = useState<MdmAudit[]>([]);
  const [showAudits, setShowAudits] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MdmItem | null>(null);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [aliases, setAliases] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const selectedType = useMemo(
    () => types.find((t) => t.code === typeCode) ?? null,
    [types, typeCode]
  );

  const loadTypes = useCallback(async () => {
    const list = await listMasterDataTypes();
    setTypes(list);
    if (list.length && !list.some((t) => t.code === typeCode)) {
      setTypeCode(list[0].code);
    }
  }, [typeCode]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMasterDataItems({
        type: typeCode,
        parentId,
        q: q || undefined,
        active,
        page,
        limit,
        sort: "sort_order"
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to load items", "error");
    } finally {
      setLoading(false);
    }
  }, [typeCode, parentId, q, active, page, limit, addToast]);

  useEffect(() => {
    void loadTypes().catch((e) =>
      addToast(e instanceof Error ? e.message : "Failed to load types", "error")
    );
  }, [loadTypes, addToast]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    setParentId(undefined);
    setPage(1);
  }, [typeCode]);

  useEffect(() => {
    setPage(1);
  }, [limit]);

  useEffect(() => {
    const parentType = selectedType?.parent_type_code;
    if (!parentType) {
      setParents([]);
      return;
    }
    void listMasterDataItems({
      type: parentType,
      active: "active",
      page: 1,
      limit: 100,
      sort: "label"
    })
      .then((d) => setParents(d.items))
      .catch((e) =>
        addToast(e instanceof Error ? e.message : "Failed to load parents", "error")
      );
  }, [selectedType?.parent_type_code, addToast]);

  const openCreate = () => {
    setEditing(null);
    setLabel("");
    setCode("");
    setAliases("");
    setSortOrder((items[items.length - 1]?.sort_order ?? 0) + 1);
    setFormOpen(true);
  };

  const openEdit = (item: MdmItem) => {
    setEditing(item);
    setLabel(item.label);
    setCode(item.code ?? "");
    setAliases((item.aliases ?? []).join(", "));
    setSortOrder(item.sort_order);
    setFormOpen(true);
  };

  const saveForm = async () => {
    if (!label.trim()) {
      addToast("Label is required", "error");
      return;
    }
    setSaving(true);
    try {
      const aliasList = aliases
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (editing) {
        await updateMasterDataItem(editing.id, {
          label: label.trim(),
          code: code.trim() || null,
          sort_order: sortOrder,
          aliases: aliasList,
          parent_id: parentId ?? editing.parent_id
        });
        addToast("Updated", "success");
      } else {
        await createMasterDataItem({
          type_code: typeCode,
          label: label.trim(),
          code: code.trim() || null,
          sort_order: sortOrder,
          aliases: aliasList,
          parent_id: parentId ?? null,
          is_active: true
        });
        addToast("Created", "success");
      }
      setFormOpen(false);
      await loadItems();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: MdmItem) => {
    try {
      await updateMasterDataItem(item.id, { is_active: !item.is_active });
      addToast(item.is_active ? "Disabled" : "Enabled", "success");
      await loadItems();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Update failed", "error");
    }
  };

  const loadAudits = async () => {
    try {
      const data = await listMasterDataAudits({ type: typeCode, limit: 40 });
      setAudits(data.items);
      setShowAudits(true);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to load audits", "error");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-600">
          Single source of truth for dropdowns across registration, profile, matrimony,
          marketplace, and filters. Disable values to hide them from new selections without
          breaking existing records.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadAudits()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Audit history
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-95"
          >
            Add value
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t.code}
            type="button"
            onClick={() => {
              setTypeCode(t.code);
              setPage(1);
              setParentId(undefined);
              setItems([]);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              typeCode === t.code
                ? "border-primary bg-primary/10 text-primary"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {selectedType?.parent_type_code ? (
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={parentId ?? ""}
            onChange={(e) => {
              setParentId(e.target.value ? Number(e.target.value) : undefined);
              setPage(1);
            }}
          >
            <option value="">All parents</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        ) : null}
        <input
          className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Search label or code…"
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setQ(qDraft.trim());
              setPage(1);
            }
          }}
        />
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          onClick={() => {
            setQ(qDraft.trim());
            setPage(1);
          }}
        >
          Search
        </button>
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          value={active}
          onChange={(e) => {
            setActive(e.target.value as typeof active);
            setPage(1);
          }}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Disabled</option>
        </select>
      </div>

      {loading ? (
        <AdminTableSkeleton rows={8} cols={6} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Sort</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aliases</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No values yet for {selectedType?.name ?? typeCode}.
                    {selectedType?.parent_type_code ? (
                      <>
                        {" "}
                        Choose a parent ({selectedType.parent_type_code}) filter or use{" "}
                        <span className="font-medium">Add value</span> and pick a parent.
                      </>
                    ) : (
                      <> Use Add value to create the first one.</>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.label}</td>
                    <td className="px-4 py-3 text-slate-500">{item.code ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{item.sort_order}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          item.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-xs text-slate-500">
                      {(item.aliases ?? []).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="mr-2 text-sm font-medium text-primary"
                        onClick={() => openEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-sm font-medium text-slate-600"
                        onClick={() => void toggleActive(item)}
                      >
                        {item.is_active ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AdminPagination
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {editing ? "Edit value" : `Add ${selectedType?.name ?? "value"}`}
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Label</span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Code (optional)</span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="STABLE_CODE"
                />
              </label>
              {selectedType?.parent_type_code ? (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Parent</span>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={parentId ?? ""}
                    onChange={(e) =>
                      setParentId(e.target.value ? Number(e.target.value) : undefined)
                    }
                  >
                    <option value="">Select parent…</option>
                    {parents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Sort order</span>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Aliases (comma-separated spelling variants)
                </span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={aliases}
                  onChange={(e) => setAliases(e.target.value)}
                  placeholder="erode, erodu, erod"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                onClick={() => void saveForm()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAudits ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Audit — {typeCode}</h3>
              <button type="button" className="text-sm text-slate-500" onClick={() => setShowAudits(false)}>
                Close
              </button>
            </div>
            <ul className="space-y-2 text-sm">
              {audits.length === 0 ? (
                <li className="text-slate-500">No audit entries yet.</li>
              ) : (
                audits.map((a) => (
                  <li key={a.id} className="rounded-lg border border-slate-100 px-3 py-2">
                    <div className="font-medium text-slate-800">
                      {a.action} · item #{a.item_id ?? "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(a.created_at).toLocaleString()}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
