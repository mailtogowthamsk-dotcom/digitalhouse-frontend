import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAudits, type AuditLog } from "../../api/platformAdmin";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
const btnGhost =
  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function AuditRow({ item }: { item: AuditLog }) {
  const [open, setOpen] = useState(false);
  const settingLabel =
    item.settingModule && item.setting
      ? `${item.settingModule}.${item.setting}`
      : item.setting || "—";

  return (
    <>
      <tr className="border-b border-slate-100 align-top">
        <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-500">
          {new Date(item.createdAt).toLocaleString()}
        </td>
        <td className="px-4 py-2 text-sm">{item.changedBy || item.adminEmail || "—"}</td>
        <td className="px-4 py-2 text-sm">{item.module}</td>
        <td className="px-4 py-2 text-sm font-medium text-slate-800">{settingLabel}</td>
        <td className="px-4 py-2">
          <pre className="max-w-[180px] overflow-hidden text-ellipsis whitespace-pre-wrap break-all font-mono text-[11px] text-rose-700">
            {formatValue(item.oldValue)}
          </pre>
        </td>
        <td className="px-4 py-2">
          <pre className="max-w-[180px] overflow-hidden text-ellipsis whitespace-pre-wrap break-all font-mono text-[11px] text-emerald-700">
            {formatValue(item.newValue)}
          </pre>
        </td>
        <td className="px-4 py-2 text-sm font-medium">{item.action}</td>
        <td className="px-4 py-2">
          <button type="button" className={btnGhost} onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "Details"}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-slate-100 bg-slate-50">
          <td colSpan={8} className="px-4 py-3">
            <pre className="max-h-64 overflow-auto rounded-lg bg-white p-3 font-mono text-[11px] text-slate-700 ring-1 ring-slate-200">
              {formatValue(item.details)}
            </pre>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function AuditLogsPanel() {
  const [page, setPage] = useState(1);
  const [module, setModule] = useState("business_settings");
  const [configOnly, setConfigOnly] = useState(true);

  const q = useQuery({
    queryKey: ["platform-audits", page, module, configOnly],
    queryFn: () =>
      listAudits(page, 40, module || undefined, {
        configOnly: configOnly && !module ? true : false
      }),
    staleTime: 15_000,
    refetchOnWindowFocus: false
  });

  const modules = q.data?.configModules ?? [
    "business_settings",
    "maintenance",
    "features",
    "menu",
    "subscriptions",
    "version"
  ];

  return (
    <div>
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-800">Configuration history</h3>
        <p className="mt-1 text-sm text-slate-600">
          Every business setting change records module, setting, old value, new value, who changed
          it, and when. History is append-only.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            className={`${inputClass} max-w-xs`}
            value={module}
            onChange={(e) => {
              setModule(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            <option value="notifications">notifications</option>
            <option value="banners">banners</option>
            <option value="ads">ads</option>
            <option value="popups">popups</option>
            <option value="announcements">announcements</option>
          </select>
          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={configOnly}
              onChange={(e) => {
                setConfigOnly(e.target.checked);
                setPage(1);
              }}
              disabled={Boolean(module)}
            />
            Config modules only
          </label>
        </div>
      </div>

      {q.isLoading ? (
        <p className="text-sm text-slate-500">Loading audits…</p>
      ) : q.isError ? (
        <p className="text-sm text-red-600">{(q.error as Error).message}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Changed by</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Setting</th>
                  <th className="px-4 py-3">Old value</th>
                  <th className="px-4 py-3">New value</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(q.data?.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                      No audit entries for this filter.
                    </td>
                  </tr>
                ) : (
                  (q.data?.items ?? []).map((a) => <AuditRow key={a.id} item={a} />)
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className={btnGhost}
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </button>
            <span className="text-xs text-slate-500">
              Page {q.data?.page ?? page} · {q.data?.total ?? 0} total
            </span>
            <button
              type="button"
              className={btnGhost}
              disabled={(q.data?.page ?? 1) * (q.data?.limit ?? 40) >= (q.data?.total ?? 0)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
