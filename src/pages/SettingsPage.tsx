import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminUser,
  getAdminSettings,
  setAdminRole,
  updateAdminUser,
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
  const { adminEmail, adminRole, setAdminRoleLocal, hasAction } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"admins" | "matrix">("admins");
  const canManageRoles = hasAction("settings.manage_roles");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "ADMIN" as AdminRole
  });
  const [passwordReset, setPasswordReset] = useState<Record<string, string>>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: getAdminSettings
  });

  useEffect(() => {
    if (data?.me?.role) setAdminRoleLocal(data.me.role);
  }, [data?.me?.role, setAdminRoleLocal]);

  const applyOverview = useCallback(
    (overview: SettingsOverview | undefined, message?: string) => {
      if (overview) queryClient.setQueryData(["admin-settings"], overview);
      if (message) addToast(message, "success");
      if (overview?.me?.email === adminEmail && overview.me.role) {
        setAdminRoleLocal(overview.me.role);
      }
    },
    [queryClient, addToast, adminEmail, setAdminRoleLocal]
  );

  const roleMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: AdminRole }) =>
      setAdminRole(email, role),
    onSuccess: (res) => applyOverview(res.overview, res.message || "Role updated."),
    onError: (err) => addToast(err instanceof Error ? err.message : "Failed to update role", "error")
  });

  const createMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: (res) => {
      applyOverview(res.overview, res.message || "Admin created.");
      setForm({ name: "", email: "", password: "", role: "ADMIN" });
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to create admin", "error")
  });

  const updateMutation = useMutation({
    mutationFn: ({
      email,
      patch
    }: {
      email: string;
      patch: { isActive?: boolean; password?: string };
    }) => updateAdminUser(email, patch),
    onSuccess: (res, vars) => {
      applyOverview(res.overview, res.message || "Admin updated.");
      if (vars.patch.password) {
        setPasswordReset((prev) => {
          const next = { ...prev };
          delete next[vars.email];
          return next;
        });
      }
    },
    onError: (err) =>
      addToast(err instanceof Error ? err.message : "Failed to update admin", "error")
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
        <p className="max-w-2xl text-sm text-slate-600">
          Manage admin accounts and roles. Role assignments are stored in the database;
          whitelist + shared password remain available during migration.
        </p>
        {myRole ? (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLE_COLORS[myRole]}`}>
            You: {overview?.me?.roleLabel ?? myRole}
          </span>
        ) : null}
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {roleSummary.map((r) => (
          <div key={r.code} className="rounded-xl border border-slate-200 bg-white p-4">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[r.code]}`}
            >
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
          <span className="ml-1 text-slate-500">
            ({overview.auth.whitelistCount} whitelist
            {overview.auth.databaseCount != null
              ? `, ${overview.auth.databaseCount} database`
              : ""}
            )
          </span>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
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
        <Link
          to="/settings/legal"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Legal documents
        </Link>
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
        <div className="space-y-4">
          {canManageRoles ? (
            <form
              className="rounded-xl border border-slate-200 bg-white p-4"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
            >
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Create admin account</h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  minLength={2}
                />
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Password (min 8)"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                />
                <select
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminRole }))}
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MODERATOR">Moderator</option>
                </select>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {createMutation.isPending ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last login</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(overview?.admins ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No admins yet. Create an account above or add emails to ADMIN_EMAILS.
                    </td>
                  </tr>
                ) : (
                  overview!.admins.map((admin) => (
                    <tr key={admin.email} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {admin.name || admin.email.split("@")[0]}
                          {admin.email === overview?.me?.email ? (
                            <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-slate-500">{admin.email}</div>
                        <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">
                          {admin.source}
                          {admin.isDefaultSuper ? " · default super" : ""}
                        </div>
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
                      <td className="px-4 py-3 text-xs">
                        {admin.source === "database" ? (
                          <span
                            className={
                              admin.isActive === false
                                ? "font-medium text-red-600"
                                : "font-medium text-emerald-600"
                            }
                          >
                            {admin.isActive === false ? "Inactive" : "Active"}
                          </span>
                        ) : (
                          <span className="text-slate-500">Whitelist only</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {admin.lastLoginAt
                          ? new Date(admin.lastLoginAt).toLocaleString()
                          : admin.source === "database"
                            ? "Never"
                            : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {canManageRoles && admin.source === "database" ? (
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              disabled={updateMutation.isPending}
                              className="text-left text-xs font-medium text-slate-700 hover:text-primary"
                              onClick={() =>
                                updateMutation.mutate({
                                  email: admin.email,
                                  patch: { isActive: admin.isActive === false }
                                })
                              }
                            >
                              {admin.isActive === false ? "Activate" : "Deactivate"}
                            </button>
                            <div className="flex gap-1">
                              <input
                                type="password"
                                className="w-28 rounded border border-slate-200 px-1.5 py-1 text-xs"
                                placeholder="New password"
                                value={passwordReset[admin.email] ?? ""}
                                onChange={(e) =>
                                  setPasswordReset((p) => ({
                                    ...p,
                                    [admin.email]: e.target.value
                                  }))
                                }
                              />
                              <button
                                type="button"
                                disabled={
                                  updateMutation.isPending ||
                                  !(passwordReset[admin.email]?.length >= 8)
                                }
                                className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
                                onClick={() =>
                                  updateMutation.mutate({
                                    email: admin.email,
                                    patch: { password: passwordReset[admin.email] }
                                  })
                                }
                              >
                                Set
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
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
