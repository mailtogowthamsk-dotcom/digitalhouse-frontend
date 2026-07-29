/**
 * Admin Legal Documents API (settings.legal_manage)
 */
import { fetchApi } from "./client";

export type LegalDocumentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type LegalContentFormat = "html" | "markdown";
export type LegalVersionBump = "minor" | "major";

export type LegalDocumentType = {
  id: number;
  documentKey: string;
  title: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  requiredAtRegistration: boolean;
  requiresReacceptance: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LegalDocumentSummary = LegalDocumentType & {
  currentVersion: string | null;
  publishedStatus: "PUBLISHED" | "DRAFT" | "NONE";
  isPublished: boolean;
  publishedAt: string | null;
  lastUpdatedAt: string;
  lastUpdatedBy: string | null;
  publishedDocumentId: number | null;
  draftDocumentId: number | null;
};

export type LegalDocumentVersion = {
  id: number;
  documentKey: string;
  title: string;
  slug: string;
  content?: string;
  contentFormat: LegalContentFormat | string;
  version: string;
  versionMajor: number;
  versionMinor: number;
  status: LegalDocumentStatus | string;
  isPublished: boolean;
  publishedAt: string | null;
  changeSummary: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateLegalTypeInput = {
  documentKey: string;
  title: string;
  slug: string;
  description?: string | null;
  sortOrder?: number;
  requiredAtRegistration?: boolean;
  requiresReacceptance?: boolean;
  isActive?: boolean;
};

export type UpdateLegalTypeInput = {
  title?: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
  requiredAtRegistration?: boolean;
  requiresReacceptance?: boolean;
  isActive?: boolean;
};

export type CreateLegalDraftInput = {
  documentKey: string;
  title?: string;
  content: string;
  changeSummary?: string | null;
  contentFormat?: LegalContentFormat;
};

export type UpdateLegalDraftInput = {
  title?: string;
  content?: string;
  changeSummary?: string | null;
  contentFormat?: LegalContentFormat;
};

export type PublishLegalInput = {
  bump: LegalVersionBump;
  changeSummary?: string | null;
  documentId?: number;
};

export async function listLegalDocuments(): Promise<{
  ok: boolean;
  documents: LegalDocumentSummary[];
}> {
  return fetchApi("/api/admin/legal/documents");
}

export async function listLegalTypes(includeInactive = false): Promise<{
  ok: boolean;
  types: LegalDocumentType[];
}> {
  const q = includeInactive ? "?includeInactive=1" : "";
  return fetchApi(`/api/admin/legal/types${q}`);
}

export async function createLegalType(input: CreateLegalTypeInput): Promise<{
  ok: boolean;
  type: LegalDocumentType;
}> {
  return fetchApi("/api/admin/legal/types", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateLegalType(
  documentKey: string,
  input: UpdateLegalTypeInput
): Promise<{ ok: boolean; type: LegalDocumentType }> {
  return fetchApi(`/api/admin/legal/types/${encodeURIComponent(documentKey)}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function getLatestLegalDocument(documentKey: string): Promise<{
  ok: boolean;
  document: LegalDocumentVersion | null;
}> {
  return fetchApi(`/api/admin/legal/documents/${encodeURIComponent(documentKey)}/latest`);
}

export async function getLegalDocumentHistory(documentKey: string): Promise<{
  ok: boolean;
  versions: LegalDocumentVersion[];
}> {
  return fetchApi(`/api/admin/legal/documents/${encodeURIComponent(documentKey)}/history`);
}

export async function compareLegalDocuments(
  documentKey: string,
  leftId: number,
  rightId: number
): Promise<{ ok: boolean; left: LegalDocumentVersion; right: LegalDocumentVersion }> {
  const qs = new URLSearchParams({
    leftId: String(leftId),
    rightId: String(rightId)
  });
  return fetchApi(
    `/api/admin/legal/documents/${encodeURIComponent(documentKey)}/compare?${qs}`
  );
}

export async function createLegalDraft(input: CreateLegalDraftInput): Promise<{
  ok: boolean;
  document: LegalDocumentVersion;
}> {
  return fetchApi("/api/admin/legal/documents", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function getLegalVersion(id: number): Promise<{
  ok: boolean;
  document: LegalDocumentVersion;
}> {
  return fetchApi(`/api/admin/legal/versions/${id}`);
}

export async function updateLegalDraft(
  id: number,
  input: UpdateLegalDraftInput
): Promise<{ ok: boolean; document: LegalDocumentVersion }> {
  return fetchApi(`/api/admin/legal/versions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function publishLegalDocument(
  documentKey: string,
  input: PublishLegalInput
): Promise<{ ok: boolean; document: LegalDocumentVersion }> {
  return fetchApi(`/api/admin/legal/documents/${encodeURIComponent(documentKey)}/publish`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function restoreLegalVersion(
  documentKey: string,
  versionId: number
): Promise<{ ok: boolean; document: LegalDocumentVersion }> {
  return fetchApi(`/api/admin/legal/documents/${encodeURIComponent(documentKey)}/restore`, {
    method: "POST",
    body: JSON.stringify({ versionId })
  });
}
