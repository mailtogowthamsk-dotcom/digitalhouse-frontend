import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminSettings,
  setAdminRole,
  type AdminRole,
  type SettingsOverview
} from "../api/settingsAdmin";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const ROLE_COLORS: Record<AdminRole, string> = {
  SUPER_ADMIN: "bg-violet-100 text-violet-800",
  ADMIN: "bg-blue-100 text-blue-800",
  MODERATOR: "bg-amber-100 text-amber-800"
};

export function SettingsPage() {
  const { adminEmail, adminRole, setAdminRoleLocal } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"admins" | "matrix">("admins");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: getAdminSettings
  });

  useEffect(() => {
    if (data?.me?.role) setAdminRoleLocal(data.me.role);
  }, [data?.me?.role, setAdminRoleLocal]);

  const canManageRoles = data?.me?.role === "SUPER_ADMIN";

  const roleMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: AdminRole }) =>
      setAdminRole(email, role),
    onSuccess: (res) => {
      queryClient.setQueryData(["admin-settings"], res.overview);
      addToast(res.message || "Role updated.", "success");
      if (res.overview?.me?.email === adminEmail && res.overview.me.role) {
        setAdminRoleLocal(res.overview.me.role);
      }
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to update role", "error")
  });

  const overview = data as SettingsOverview | undefined;
  const matrix = overview?.matrix;

  const myRole = overview?.me?.role ?? adminRole;

  const roleSummary = useMemo(
    () => [
      {
        code: "SUPER_ADMIN" as AdminRole,
        title: "Super Admin",
        blurb: "Full access including role assignment, suspensions, and escalations."
      },
      {
        code: "ADMIN" as AdminRole,
        title: "Admin",
        blurb: "Users, matrimony, marketplace, master data, reports — cannot reassign roles."
      },
      {
        code: "MODERATOR" as AdminRole,
        title: "Moderator",
        blurb: "Content & reports focus: posts, jobs, marketplace, helping hands, warn users."
      }
    ],
    []
  );

  const onRoleChange = useCallback(
    (email: string, role: AdminRole) => {
      if (!canManageRoles) {
        addToast("Only Super Admin can assign roles.", "error");
        return;
      }
      roleMutation.mutate({ email, role });
    },
    [canManageRoles, roleMutation, addToast]
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Settings & Roles</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Manage admin roles for whitelisted accounts. Permissions are enforced on sensitive
            actions (approve users, suspend, escalate, master data writes, broadcasts, role
            changes).
          </p>
        </div>
        {myRole ? (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLE_COLORS[myRole]}`}>
            You: {overview?.me?.roleLabel ?? myRole}
          </span>
        ) : null}
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {roleSummary.map((r) => (
          <div key={r.code} className="rounded-xl border border-slate-200 bg-white p-4">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[r.code]}`}>
              {r.title}
            </span>
            <p className="mt-2 text-sm text-slate-600">{r.blurb}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span className="font-medium text-slate-800">Auth:</span>{" "}
        {overview?.auth?.note ??
          "Admins come from ADMIN_EMAILS with a shared ADMIN_PASSWORD. Add emails in backend .env."}
        {overview?.auth?.whitelistCount != null ? (
          <span className="ml-1 text-slate-500">({overview.auth.whitelistCount} emails)</span>
        ) : null}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("admins")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "admins" ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-700"
          }`}
        >
          Admins
        </button>
        <button
          type="button"
          onClick={() => setTab("matrix")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "matrix" ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-700"
          }`}
        >
          Permission matrix
        </button>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading settings…
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : "Failed to load settings."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      ) : tab === "admins" ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(overview?.admins ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                    No admins in ADMIN_EMAILS. Add emails in backend/.env.
                  </td>
                </tr>
              ) : (
                overview!.admins.map((admin) => (
                  <tr key={admin.email} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {admin.email}
                      {admin.email === overview?.me?.email ? (
                        <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {canManageRoles ? (
                        <select
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                          value={admin.role}
                          disabled={roleMutation.isPending}
                          onChange={(e) =>
                            onRoleChange(admin.email, e.target.value as AdminRole)
                          }
                        >
                          <option value="SUPER_ADMIN">Super Admin</option>
                          <option value="ADMIN">Admin</option>
                          <option value="MODERATOR">Moderator</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[admin.role]}`}
                        >
                          {admin.roleLabel}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {admin.isDefaultSuper
                        ? "Default Super Admin (first whitelist email)"
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {overview?.updatedAt ? (
            <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              Last role change: {new Date(overview.updatedAt).toLocaleString()}
              {overview.updatedBy ? ` by ${overview.updatedBy}` : ""}
            </div>
          ) : null}
          {!canManageRoles ? (
            <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
              Role assignment is Super Admin only. You can still view the permission matrix.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
              Module access
            </div>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Module</th>
                  {(matrix?.roles ?? []).map((r) => (
                    <th key={r.code} className="px-4 py-3 text-center">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(matrix?.modules ?? []).map((m) => (
                  <tr key={m.code}>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{m.label}</td>
                    {(matrix?.roles ?? []).map((r) => (
                      <td key={r.code} className="px-4 py-2.5 text-center">
                        {m.access[r.code] ? (
                          <span className="text-emerald-600">✓</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
              Sensitive actions
            </div>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Action</th>
                  {(matrix?.roles ?? []).map((r) => (
                    <th key={r.code} className="px-4 py-3 text-center">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(matrix?.actions ?? []).map((a) => (
                  <tr key={a.code}>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{a.label}</td>
                    {(matrix?.roles ?? []).map((r) => (
                      <td key={r.code} className="px-4 py-2.5 text-center">
                        {a.access[r.code] ? (
                          <span className="text-emerald-600">✓</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
