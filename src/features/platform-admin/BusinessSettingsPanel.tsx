import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listBusinessSettings,
  resetBusinessSetting,
  upsertBusinessSetting,
  type EffectiveBusinessSetting
} from "../../api/platformAdmin";
import { useToast } from "../../context/ToastContext";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
const btnPrimary =
  "rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50";
const btnGhost =
  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

function draftValue(setting: EffectiveBusinessSetting): string {
  if (setting.valueType === "json") {
    try {
      return JSON.stringify(setting.value ?? null, null, 2);
    } catch {
      return setting.rawValue;
    }
  }
  if (setting.valueType === "boolean") {
    return setting.value === true || setting.value === "true" ? "true" : "false";
  }
  return String(setting.value ?? "");
}

function parseDraft(setting: EffectiveBusinessSetting, draft: string): unknown {
  if (setting.valueType === "number") {
    const n = Number(draft);
    if (!Number.isFinite(n)) throw new Error("Enter a valid number");
    return n;
  }
  if (setting.valueType === "boolean") {
    return draft === "true" || draft === "1";
  }
  if (setting.valueType === "json") {
    return JSON.parse(draft);
  }
  return draft;
}

export function BusinessSettingsPanel({
  moduleFilter,
  title,
  description
}: {
  moduleFilter?: string;
  title: string;
  description?: string;
}) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [modulePick, setModulePick] = useState(moduleFilter || "");

  const effectiveModule = moduleFilter || modulePick || undefined;

  const q = useQuery({
    queryKey: ["platform-business-settings", effectiveModule || "all"],
    queryFn: () => listBusinessSettings({ module: effectiveModule }),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  const settings = q.data?.settings ?? [];
  const modules = q.data?.modules ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, EffectiveBusinessSetting[]>();
    for (const s of settings) {
      const cat = s.category || "general";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: async (setting: EffectiveBusinessSetting) => {
      const key = `${setting.module}::${setting.settingKey}`;
      const raw = drafts[key] ?? draftValue(setting);
      const value = parseDraft(setting, raw);
      return upsertBusinessSetting({
        module: setting.module,
        settingKey: setting.settingKey,
        value,
        valueType: setting.valueType
      });
    },
    onSuccess: () => {
      addToast("Setting saved", "success");
      void queryClient.invalidateQueries({ queryKey: ["platform-business-settings"] });
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Save failed", "error")
  });

  const resetMut = useMutation({
    mutationFn: (setting: EffectiveBusinessSetting) =>
      resetBusinessSetting(setting.module, setting.settingKey),
    onSuccess: (res, setting) => {
      addToast(res.message || "Reset to default", "success");
      const key = `${setting.module}::${setting.settingKey}`;
      setDrafts((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: ["platform-business-settings"] });
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Reset failed", "error")
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        {!moduleFilter ? (
          <div className="mt-3 max-w-xs">
            <label className="block text-xs font-medium text-slate-600">
              Module
              <select
                className={`${inputClass} mt-1`}
                value={modulePick}
                onChange={(e) => setModulePick(e.target.value)}
              >
                <option value="">All modules</option>
                {modules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>

      {q.isLoading ? (
        <p className="text-sm text-slate-500">Loading settings…</p>
      ) : q.isError ? (
        <p className="text-sm text-red-600">{(q.error as Error).message}</p>
      ) : settings.length === 0 ? (
        <p className="text-sm text-slate-500">No settings registered for this filter.</p>
      ) : (
        grouped.map(([category, rows]) => (
          <div key={category} className="rounded-xl border border-slate-200 bg-white p-5">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {category}
            </h4>
            <div className="space-y-4">
              {rows.map((s) => {
                const key = `${s.module}::${s.settingKey}`;
                const value = drafts[key] ?? draftValue(s);
                return (
                  <div
                    key={key}
                    className="rounded-lg border border-slate-100 bg-slate-50/80 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {s.module}.{s.settingKey}
                        </p>
                        {s.description ? (
                          <p className="mt-0.5 text-xs text-slate-500">{s.description}</p>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500 ring-1 ring-slate-200">
                        {s.source} · {s.valueType}
                      </span>
                    </div>
                    {s.valueType === "boolean" ? (
                      <select
                        className={inputClass}
                        value={value}
                        disabled={!s.isEditable}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [key]: e.target.value }))
                        }
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : s.valueType === "json" ? (
                      <textarea
                        className={`${inputClass} min-h-[100px] font-mono text-xs`}
                        value={value}
                        disabled={!s.isEditable}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [key]: e.target.value }))
                        }
                      />
                    ) : (
                      <input
                        className={inputClass}
                        type={s.valueType === "number" ? "number" : "text"}
                        value={value}
                        disabled={!s.isEditable}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [key]: e.target.value }))
                        }
                      />
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={btnPrimary}
                        disabled={!s.isEditable || saveMut.isPending}
                        onClick={() => saveMut.mutate(s)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className={btnGhost}
                        disabled={resetMut.isPending}
                        onClick={() => resetMut.mutate(s)}
                      >
                        Reset to default
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
