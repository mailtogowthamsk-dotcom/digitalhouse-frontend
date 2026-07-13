/**
 * Admin Master Data API
 */
import { fetchApi } from "./client";

export type MdmType = {
  code: string;
  name: string;
  description: string | null;
  parent_type_code: string | null;
  parent_optional: boolean;
  is_system: boolean;
};

export type MdmItem = {
  id: number;
  type_code: string;
  code: string | null;
  label: string;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  aliases: string[] | null;
};

export type MdmAudit = {
  id: number;
  item_id: number | null;
  type_code: string;
  action: string;
  before: unknown;
  after: unknown;
  admin_user_id: number | null;
  note: string | null;
  created_at: string;
};

export async function listMasterDataTypes(): Promise<MdmType[]> {
  const data = await fetchApi<{ ok: boolean; types: MdmType[] }>("/api/admin/master-data/types");
  return data.types ?? [];
}

export async function listMasterDataItems(params: {
  type: string;
  parentId?: number;
  q?: string;
  active?: "all" | "active" | "inactive";
  page?: number;
  limit?: number;
  sort?: "label" | "sort_order" | "updated";
}): Promise<{ items: MdmItem[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  qs.set("type", params.type);
  if (params.parentId != null) qs.set("parentId", String(params.parentId));
  if (params.q) qs.set("q", params.q);
  if (params.active) qs.set("active", params.active);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.sort) qs.set("sort", params.sort);
  return fetchApi(`/api/admin/master-data/items?${qs.toString()}`);
}

export async function createMasterDataItem(body: {
  type_code: string;
  label: string;
  code?: string | null;
  parent_id?: number | null;
  sort_order?: number;
  aliases?: string[];
  is_active?: boolean;
}): Promise<MdmItem> {
  const data = await fetchApi<{ ok: boolean; item: MdmItem }>("/api/admin/master-data/items", {
    method: "POST",
    body: JSON.stringify(body)
  });
  return data.item;
}

export async function updateMasterDataItem(
  itemId: number,
  body: Partial<{
    label: string;
    code: string | null;
    parent_id: number | null;
    sort_order: number;
    aliases: string[] | null;
    is_active: boolean;
  }>
): Promise<MdmItem> {
  const data = await fetchApi<{ ok: boolean; item: MdmItem }>(
    `/api/admin/master-data/items/${itemId}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
  return data.item;
}

export async function listMasterDataAudits(params: {
  type?: string;
  itemId?: number;
  page?: number;
  limit?: number;
}): Promise<{ items: MdmAudit[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.type) qs.set("type", params.type);
  if (params.itemId != null) qs.set("itemId", String(params.itemId));
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  return fetchApi(`/api/admin/master-data/audits?${qs.toString()}`);
}
