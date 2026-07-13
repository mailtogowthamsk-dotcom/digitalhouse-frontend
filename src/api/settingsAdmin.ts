/**
 * Admin Settings & Roles API
 */
import { fetchApi } from "./client";

export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "MODERATOR";

export type SettingsOverview = {
  ok: boolean;
  me: {
    email: string | null;
    role: AdminRole;
    roleLabel: string;
  };
  auth: {
    mode: string;
    note: string;
    whitelistCount: number;
  };
  admins: Array<{
    email: string;
    role: AdminRole;
    roleLabel: string;
    isDefaultSuper: boolean;
  }>;
  matrix: {
    roles: Array<{ code: AdminRole; label: string }>;
    modules: Array<{
      code: string;
      label: string;
      access: Record<AdminRole, boolean>;
    }>;
    actions: Array<{
      code: string;
      label: string;
      access: Record<AdminRole, boolean>;
    }>;
  };
  updatedAt: string | null;
  updatedBy: string | null;
};

export type AdminMeResponse = {
  ok: boolean;
  admin: {
    email: string | null;
    role: AdminRole;
    roleLabel: string;
    modules: string[];
    actions: string[];
  };
};

export async function getAdminSettings(): Promise<SettingsOverview> {
  return fetchApi("/api/admin/settings");
}

export async function getAdminMe(): Promise<AdminMeResponse> {
  return fetchApi("/api/admin/settings/me");
}

export async function setAdminRole(
  email: string,
  role: AdminRole
): Promise<{ message: string; overview: SettingsOverview }> {
  return fetchApi("/api/admin/settings/roles", {
    method: "PUT",
    body: JSON.stringify({ email, role })
  });
}
