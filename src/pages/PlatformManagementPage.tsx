import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createNotification,
  getAdAnalytics,
  getMaintenance,
  getPlatformDashboard,
  listAds,
  listAnnouncements,
  listAudits,
  listBanners,
  listFeatures,
  listMenu,
  listNotifications,
  listPopups,
  listVersions,
  processScheduledNotifications,
  saveAd,
  saveAnnouncement,
  saveBanner,
  savePopup,
  saveVersion,
  sendNotification,
  setFeature,
  setMenu,
  updateMaintenance,
  type AppPlatform,
  type VersionStatus
} from "../api/platformAdmin";
import { useToast } from "../context/ToastContext";

type TabId =
  | "dashboard"
  | "versions"
  | "maintenance"
  | "notifications"
  | "emergency"
  | "popups"
  | "announcements"
  | "banners"
  | "features"
  | "menu"
  | "subscriptions"
  | "ads"
  | "analytics"
  | "audits";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "versions", label: "Versions" },
  { id: "maintenance", label: "Maintenance" },
  { id: "notifications", label: "Global Notifications" },
  { id: "emergency", label: "Emergency" },
  { id: "popups", label: "Alert Popups" },
  { id: "announcements", label: "Announcements" },
  { id: "banners", label: "Banners" },
  { id: "features", label: "Feature Toggles" },
  { id: "menu", label: "Menu" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "ads", label: "Advertisements" },
  { id: "analytics", label: "Ad Analytics" },
  { id: "audits", label: "Audit Logs" }
];

const VERSION_STATUSES: VersionStatus[] = [
  "DRAFT",
  "SOFT_UPDATE",
  "FORCE_UPDATE",
  "DISABLED",
  "ROLLED_BACK"
];

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
const btnPrimary =
  "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";
const btnGhost =
  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

export function PlatformManagementPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [auditPage, setAuditPage] = useState(1);
  const [auditModule, setAuditModule] = useState("");

  const dashQ = useQuery({
    queryKey: ["platform-dashboard"],
    queryFn: getPlatformDashboard,
    enabled: tab === "dashboard"
  });
  const versionsQ = useQuery({
    queryKey: ["platform-versions"],
    queryFn: () => listVersions(),
    enabled: tab === "versions"
  });
  const maintQ = useQuery({
    queryKey: ["platform-maintenance"],
    queryFn: getMaintenance,
    enabled: tab === "maintenance"
  });
  const notifKind = tab === "emergency" ? "EMERGENCY" : "GLOBAL";
  const notifsQ = useQuery({
    queryKey: ["platform-notifications", notifKind],
    queryFn: () => listNotifications(notifKind),
    enabled: tab === "notifications" || tab === "emergency"
  });
  const popupsQ = useQuery({
    queryKey: ["platform-popups"],
    queryFn: listPopups,
    enabled: tab === "popups"
  });
  const annQ = useQuery({
    queryKey: ["platform-announcements"],
    queryFn: listAnnouncements,
    enabled: tab === "announcements"
  });
  const bannersQ = useQuery({
    queryKey: ["platform-banners"],
    queryFn: listBanners,
    enabled: tab === "banners"
  });
  const featuresQ = useQuery({
    queryKey: ["platform-features"],
    queryFn: listFeatures,
    enabled: tab === "features"
  });
  const menuQ = useQuery({
    queryKey: ["platform-menu"],
    queryFn: listMenu,
    enabled: tab === "menu"
  });
  const adsQ = useQuery({
    queryKey: ["platform-ads"],
    queryFn: listAds,
    enabled: tab === "ads"
  });
  const analyticsQ = useQuery({
    queryKey: ["platform-ad-analytics"],
    queryFn: getAdAnalytics,
    enabled: tab === "analytics"
  });
  const auditsQ = useQuery({
    queryKey: ["platform-audits", auditPage, auditModule],
    queryFn: () => listAudits(auditPage, 40, auditModule || undefined),
    enabled: tab === "audits"
  });

  const invalidate = (...keys: string[]) => {
    keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    queryClient.invalidateQueries({ queryKey: ["platform-dashboard"] });
  };

  // ── Version form ──
  const [verForm, setVerForm] = useState({
    id: undefined as number | undefined,
    platform: "ANDROID" as AppPlatform,
    versionName: "",
    versionCode: 0,
    minSupportedVersion: "1.0.0",
    latestVersion: "1.0.0",
    releaseNotes: "",
    releaseDate: "",
    storeUrl: "",
    status: "DRAFT" as VersionStatus
  });

  const saveVerMut = useMutation({
    mutationFn: () =>
      saveVersion({
        ...verForm,
        releaseNotes: verForm.releaseNotes || null,
        releaseDate: verForm.releaseDate || null,
        storeUrl: verForm.storeUrl || null
      }),
    onSuccess: () => {
      invalidate("platform-versions");
      addToast("Version saved.", "success");
      setVerForm((f) => ({ ...f, id: undefined, versionName: "", releaseNotes: "", storeUrl: f.storeUrl }));
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  // ── Maintenance form ──
  const maint = maintQ.data?.maintenance;

  const saveMaintMut = useMutation({
    mutationFn: (patch: Parameters<typeof updateMaintenance>[0]) => updateMaintenance(patch),
    onSuccess: () => {
      invalidate("platform-maintenance");
      addToast("Maintenance updated.", "success");
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  // ── Notification form ──
  const [notifForm, setNotifForm] = useState({
    title: "",
    body: "",
    imageUrl: "",
    deepLink: "",
    audience: "ALL",
    scheduledAt: "",
    sendNow: true
  });
  const createNotifMut = useMutation({
    mutationFn: (kind: "GLOBAL" | "EMERGENCY") =>
      createNotification({
        kind,
        title: notifForm.title,
        body: notifForm.body,
        imageUrl: notifForm.imageUrl || null,
        deepLink: notifForm.deepLink || null,
        audience: notifForm.audience,
        scheduledAt: fromLocalInput(notifForm.scheduledAt),
        sendNow: kind === "EMERGENCY" ? true : notifForm.sendNow
      }),
    onSuccess: () => {
      invalidate("platform-notifications");
      addToast("Notification created.", "success");
      setNotifForm({
        title: "",
        body: "",
        imageUrl: "",
        deepLink: "",
        audience: "ALL",
        scheduledAt: "",
        sendNow: true
      });
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });
  const sendNotifMut = useMutation({
    mutationFn: (id: number) => sendNotification(id),
    onSuccess: () => {
      invalidate("platform-notifications");
      addToast("Notification sent.", "success");
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });
  const processScheduledMut = useMutation({
    mutationFn: () => processScheduledNotifications(),
    onSuccess: (res) => {
      invalidate("platform-notifications");
      addToast(
        res.sent > 0 ? `Sent ${res.sent} scheduled notification(s).` : "No due scheduled notifications.",
        "success"
      );
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  // ── Popup / Announcement / Banner / Ad forms ──
  const [popupForm, setPopupForm] = useState({
    title: "",
    body: "",
    popupType: "ONE_TIME" as "ONE_TIME" | "REPEAT" | "MANDATORY",
    acknowledgementRequired: false,
    scheduledAt: "",
    expiresAt: "",
    isActive: true
  });
  const savePopupMut = useMutation({
    mutationFn: () =>
      savePopup({
        ...popupForm,
        scheduledAt: fromLocalInput(popupForm.scheduledAt),
        expiresAt: fromLocalInput(popupForm.expiresAt)
      } as any),
    onSuccess: () => {
      invalidate("platform-popups");
      addToast("Popup saved.", "success");
      setPopupForm({
        title: "",
        body: "",
        popupType: "ONE_TIME",
        acknowledgementRequired: false,
        scheduledAt: "",
        expiresAt: "",
        isActive: true
      });
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  const [annForm, setAnnForm] = useState({
    title: "",
    description: "",
    bannerImage: "",
    publishAt: "",
    expiresAt: "",
    priority: 0,
    isActive: true
  });
  const saveAnnMut = useMutation({
    mutationFn: () =>
      saveAnnouncement({
        ...annForm,
        bannerImage: annForm.bannerImage || null,
        publishAt: fromLocalInput(annForm.publishAt) || new Date().toISOString(),
        expiresAt: fromLocalInput(annForm.expiresAt)
      } as any),
    onSuccess: () => {
      invalidate("platform-announcements");
      addToast("Announcement saved.", "success");
      setAnnForm({
        title: "",
        description: "",
        bannerImage: "",
        publishAt: "",
        expiresAt: "",
        priority: 0,
        isActive: true
      });
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  const [bannerForm, setBannerForm] = useState({
    message: "",
    backgroundColor: "#0f172a",
    icon: "",
    clickAction: "",
    expiresAt: "",
    priority: 0,
    isActive: true
  });
  const saveBannerMut = useMutation({
    mutationFn: () =>
      saveBanner({
        ...bannerForm,
        icon: bannerForm.icon || null,
        clickAction: bannerForm.clickAction || null,
        expiresAt: fromLocalInput(bannerForm.expiresAt)
      } as any),
    onSuccess: () => {
      invalidate("platform-banners");
      addToast("Banner saved.", "success");
      setBannerForm({
        message: "",
        backgroundColor: "#0f172a",
        icon: "",
        clickAction: "",
        expiresAt: "",
        priority: 0,
        isActive: true
      });
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  const [adForm, setAdForm] = useState({
    kind: "BANNER" as "BANNER" | "SPONSORED" | "INTERNAL",
    title: "",
    imageUrl: "",
    targetScreen: "",
    clickAction: "",
    priority: 0,
    startsAt: "",
    endsAt: "",
    isActive: true
  });
  const saveAdMut = useMutation({
    mutationFn: () =>
      saveAd({
        ...adForm,
        imageUrl: adForm.imageUrl || null,
        targetScreen: adForm.targetScreen || null,
        clickAction: adForm.clickAction || null,
        startsAt: fromLocalInput(adForm.startsAt),
        endsAt: fromLocalInput(adForm.endsAt)
      } as any),
    onSuccess: () => {
      invalidate("platform-ads", "platform-ad-analytics");
      addToast("Advertisement saved.", "success");
      setAdForm({
        kind: "BANNER",
        title: "",
        imageUrl: "",
        targetScreen: "",
        clickAction: "",
        priority: 0,
        startsAt: "",
        endsAt: "",
        isActive: true
      });
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  const featureMut = useMutation({
    mutationFn: ({ code, enabled }: { code: string; enabled: boolean }) => setFeature(code, enabled),
    onSuccess: () => {
      invalidate("platform-features");
      addToast("Feature updated.", "success");
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  const menuMut = useMutation({
    mutationFn: ({ code, enabled }: { code: string; enabled: boolean }) => setMenu(code, { enabled }),
    onSuccess: () => {
      invalidate("platform-menu");
      addToast("Menu updated.", "success");
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  const togglePopupMut = useMutation({
    mutationFn: (p: { id: number; isActive: boolean }) => savePopup(p as any),
    onSuccess: () => invalidate("platform-popups"),
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });
  const toggleAnnMut = useMutation({
    mutationFn: (p: { id: number; isActive: boolean }) => saveAnnouncement(p as any),
    onSuccess: () => invalidate("platform-announcements"),
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });
  const toggleBannerMut = useMutation({
    mutationFn: (p: { id: number; isActive: boolean }) => saveBanner(p as any),
    onSuccess: () => invalidate("platform-banners"),
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });
  const toggleAdMut = useMutation({
    mutationFn: (p: { id: number; isActive: boolean }) => saveAd(p as any),
    onSuccess: () => invalidate("platform-ads", "platform-ad-analytics"),
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  return (
    <div>
      <div className="mb-6">
        <p className="max-w-3xl text-sm text-slate-600">
          Operational control center for versions, maintenance, communications, feature visibility,
          subscriptions, and future monetization — without redeploying the apps.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.id
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ DASHBOARD ═══════ */}
      {tab === "dashboard" && (
        <div>
          {dashQ.isLoading ? (
            <p className="text-sm text-slate-500">Loading dashboard…</p>
          ) : dashQ.isError ? (
            <p className="text-sm text-red-600">{(dashQ.error as Error).message}</p>
          ) : (
            <>
              <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Active users",
                    value: dashQ.data?.activeUsers ?? 0
                  },
                  {
                    label: "Active subscriptions",
                    value: dashQ.data?.activeSubscriptions ?? 0
                  },
                  {
                    label: "Features on",
                    value: `${dashQ.data?.featuresEnabled ?? 0}/${dashQ.data?.featuresTotal ?? 0}`
                  },
                  {
                    label: "Active ads",
                    value: dashQ.data?.activeAds ?? 0
                  },
                  {
                    label: "Pending announcements",
                    value: dashQ.data?.pendingAnnouncements ?? 0
                  },
                  {
                    label: "Pending notifications",
                    value: dashQ.data?.pendingNotifications ?? 0
                  },
                  {
                    label: "Maintenance",
                    value: dashQ.data?.maintenance?.enabled ? "ON" : "OFF",
                    warn: dashQ.data?.maintenance?.enabled
                  }
                ].map((c) => (
                  <div
                    key={c.label}
                    className={`rounded-xl border p-4 ${
                      c.warn ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {c.label}
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-slate-900">{c.value}</div>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-800">Current app versions</h3>
                  {(dashQ.data?.versions ?? []).length === 0 ? (
                    <p className="text-sm text-slate-500">No active soft/force update published.</p>
                  ) : (
                    <ul className="space-y-2">
                      {dashQ.data!.versions.map((v) => (
                        <li
                          key={v.id}
                          className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                        >
                          <span className="font-medium">{v.platform}</span>
                          <span className="text-slate-600">
                            {v.latestVersion} · {v.status.replace("_", " ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-800">Feature flags</h3>
                  <div className="flex flex-wrap gap-2">
                    {(dashQ.data?.features ?? []).map((f) => (
                      <span
                        key={f.code}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          f.enabled
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-slate-100 text-slate-500 line-through"
                        }`}
                      >
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════ VERSIONS ═══════ */}
      {tab === "versions" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-800">
              {verForm.id ? "Edit version" : "Publish version"}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Platform">
                  <select
                    className={inputClass}
                    value={verForm.platform}
                    onChange={(e) =>
                      setVerForm((f) => ({ ...f, platform: e.target.value as AppPlatform }))
                    }
                  >
                    <option value="ANDROID">Android</option>
                    <option value="IOS">iOS</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    className={inputClass}
                    value={verForm.status}
                    onChange={(e) =>
                      setVerForm((f) => ({ ...f, status: e.target.value as VersionStatus }))
                    }
                  >
                    {VERSION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Version name">
                <input
                  className={inputClass}
                  value={verForm.versionName}
                  onChange={(e) => setVerForm((f) => ({ ...f, versionName: e.target.value }))}
                  placeholder="1.2.0"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latest version">
                  <input
                    className={inputClass}
                    value={verForm.latestVersion}
                    onChange={(e) => setVerForm((f) => ({ ...f, latestVersion: e.target.value }))}
                  />
                </Field>
                <Field label="Min supported">
                  <input
                    className={inputClass}
                    value={verForm.minSupportedVersion}
                    onChange={(e) =>
                      setVerForm((f) => ({ ...f, minSupportedVersion: e.target.value }))
                    }
                  />
                </Field>
              </div>
              <Field label="Release date">
                <input
                  type="date"
                  className={inputClass}
                  value={verForm.releaseDate}
                  onChange={(e) => setVerForm((f) => ({ ...f, releaseDate: e.target.value }))}
                />
              </Field>
              <Field label="Store URL (Play Store / App Store)">
                <input
                  className={inputClass}
                  value={verForm.storeUrl}
                  onChange={(e) => setVerForm((f) => ({ ...f, storeUrl: e.target.value }))}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                />
              </Field>
              <Field label="Release notes">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={verForm.releaseNotes}
                  onChange={(e) => setVerForm((f) => ({ ...f, releaseNotes: e.target.value }))}
                />
              </Field>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={saveVerMut.isPending || !verForm.versionName}
                  onClick={() => saveVerMut.mutate()}
                >
                  Save
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    setVerForm((f) => ({ ...f, status: "SOFT_UPDATE" }))
                  }
                >
                  Soft update
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    setVerForm((f) => ({ ...f, status: "FORCE_UPDATE" }))
                  }
                >
                  Force update
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => setVerForm((f) => ({ ...f, status: "DISABLED" }))}
                >
                  Disable
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => setVerForm((f) => ({ ...f, status: "ROLLED_BACK" }))}
                >
                  Rollback
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Soft: “A new version is available” with Later. Force: blocks app until updated.
                Only one soft/force can be active per platform.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Version history</h3>
            {versionsQ.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : (
              <div className="max-h-[520px] space-y-2 overflow-y-auto">
                {(versionsQ.data?.versions ?? []).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left text-sm hover:border-slate-300"
                    onClick={() =>
                      setVerForm({
                        id: v.id,
                        platform: v.platform,
                        versionName: v.versionName,
                        versionCode: v.versionCode,
                        minSupportedVersion: v.minSupportedVersion,
                        latestVersion: v.latestVersion,
                        releaseNotes: v.releaseNotes || "",
                        releaseDate: v.releaseDate || "",
                        storeUrl: v.storeUrl || "",
                        status: v.status
                      })
                    }
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">
                        {v.platform} · {v.versionName}
                      </span>
                      <span className="text-xs text-slate-500">{v.status}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      Latest {v.latestVersion} · Min {v.minSupportedVersion}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ MAINTENANCE ═══════ */}
      {tab === "maintenance" && (
        <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-5">
          {maintQ.isLoading || !maint ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <MaintenanceEditor
              key={maint.updatedBy + String(maint.enabled) + maint.title}
              initial={maint}
              saving={saveMaintMut.isPending}
              onSave={(patch) => saveMaintMut.mutate(patch)}
            />
          )}
        </div>
      )}

      {/* ═══════ NOTIFICATIONS / EMERGENCY ═══════ */}
      {(tab === "notifications" || tab === "emergency") && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-800">
              {tab === "emergency" ? "Send emergency alert" : "Create global notification"}
            </h3>
            {tab === "emergency" && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                Emergency notifications send immediately and use the highest priority system
                channel.
              </p>
            )}
            <div className="space-y-3">
              <Field label="Title">
                <input
                  className={inputClass}
                  value={notifForm.title}
                  onChange={(e) => setNotifForm((f) => ({ ...f, title: e.target.value }))}
                />
              </Field>
              <Field label="Description">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={notifForm.body}
                  onChange={(e) => setNotifForm((f) => ({ ...f, body: e.target.value }))}
                />
              </Field>
              <Field label="Image URL (optional)">
                <input
                  className={inputClass}
                  value={notifForm.imageUrl}
                  onChange={(e) => setNotifForm((f) => ({ ...f, imageUrl: e.target.value }))}
                />
              </Field>
              <Field label="Deep link (optional)">
                <input
                  className={inputClass}
                  value={notifForm.deepLink}
                  onChange={(e) => setNotifForm((f) => ({ ...f, deepLink: e.target.value }))}
                />
              </Field>
              <Field label="Audience">
                <select
                  className={inputClass}
                  value={notifForm.audience}
                  onChange={(e) => setNotifForm((f) => ({ ...f, audience: e.target.value }))}
                >
                  {["ALL", "PREMIUM", "FREE", "ANDROID", "IOS"].map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </Field>
              {tab === "notifications" && (
                <>
                  <Field label="Schedule (optional)">
                    <input
                      type="datetime-local"
                      className={inputClass}
                      value={notifForm.scheduledAt}
                      onChange={(e) =>
                        setNotifForm((f) => ({ ...f, scheduledAt: e.target.value }))
                      }
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={notifForm.sendNow}
                      onChange={(e) =>
                        setNotifForm((f) => ({ ...f, sendNow: e.target.checked }))
                      }
                    />
                    Send immediately
                  </label>
                </>
              )}
              <button
                type="button"
                className={btnPrimary}
                disabled={
                  createNotifMut.isPending || !notifForm.title.trim() || !notifForm.body.trim()
                }
                onClick={() =>
                  createNotifMut.mutate(tab === "emergency" ? "EMERGENCY" : "GLOBAL")
                }
              >
                {tab === "emergency" ? "Send emergency" : "Create notification"}
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">History</h3>
              {tab === "notifications" ? (
                <button
                  type="button"
                  className={btnGhost}
                  disabled={processScheduledMut.isPending}
                  onClick={() => processScheduledMut.mutate()}
                >
                  Process due now
                </button>
              ) : null}
            </div>
            <div className="max-h-[520px] space-y-2 overflow-y-auto">
              {(notifsQ.data?.notifications ?? []).map((n) => (
                <div
                  key={n.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{n.title}</div>
                      <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {n.audience} · {n.status}
                        {n.sentAt ? ` · sent ${new Date(n.sentAt).toLocaleString()}` : ""}
                      </div>
                    </div>
                    {n.status !== "SENT" && (
                      <button
                        type="button"
                        className={btnGhost}
                        disabled={sendNotifMut.isPending}
                        onClick={() => sendNotifMut.mutate(n.id)}
                      >
                        Send
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ POPUPS ═══════ */}
      {tab === "popups" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold">Create alert popup</h3>
            <div className="space-y-3">
              <Field label="Title">
                <input
                  className={inputClass}
                  value={popupForm.title}
                  onChange={(e) => setPopupForm((f) => ({ ...f, title: e.target.value }))}
                />
              </Field>
              <Field label="Body">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={popupForm.body}
                  onChange={(e) => setPopupForm((f) => ({ ...f, body: e.target.value }))}
                />
              </Field>
              <Field label="Type">
                <select
                  className={inputClass}
                  value={popupForm.popupType}
                  onChange={(e) =>
                    setPopupForm((f) => ({
                      ...f,
                      popupType: e.target.value as typeof f.popupType
                    }))
                  }
                >
                  <option value="ONE_TIME">One-time</option>
                  <option value="REPEAT">Repeat</option>
                  <option value="MANDATORY">Mandatory acknowledgement</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={popupForm.acknowledgementRequired}
                  onChange={(e) =>
                    setPopupForm((f) => ({ ...f, acknowledgementRequired: e.target.checked }))
                  }
                />
                Require acknowledgement
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Schedule">
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={popupForm.scheduledAt}
                    onChange={(e) => setPopupForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  />
                </Field>
                <Field label="Expires">
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={popupForm.expiresAt}
                    onChange={(e) => setPopupForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  />
                </Field>
              </div>
              <button
                type="button"
                className={btnPrimary}
                disabled={savePopupMut.isPending || !popupForm.title}
                onClick={() => savePopupMut.mutate()}
              >
                Save popup
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold">Active popups</h3>
            <div className="space-y-2">
              {(popupsQ.data?.popups ?? []).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-slate-500">
                      {p.popupType}
                      {!p.isActive ? " · disabled" : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() =>
                      togglePopupMut.mutate({ id: p.id, isActive: !p.isActive })
                    }
                  >
                    {p.isActive ? "Disable" : "Enable"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ ANNOUNCEMENTS ═══════ */}
      {tab === "announcements" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold">Create announcement</h3>
            <div className="space-y-3">
              <Field label="Title">
                <input
                  className={inputClass}
                  value={annForm.title}
                  onChange={(e) => setAnnForm((f) => ({ ...f, title: e.target.value }))}
                />
              </Field>
              <Field label="Description">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={annForm.description}
                  onChange={(e) => setAnnForm((f) => ({ ...f, description: e.target.value }))}
                />
              </Field>
              <Field label="Banner image URL">
                <input
                  className={inputClass}
                  value={annForm.bannerImage}
                  onChange={(e) => setAnnForm((f) => ({ ...f, bannerImage: e.target.value }))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Publish">
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={annForm.publishAt}
                    onChange={(e) => setAnnForm((f) => ({ ...f, publishAt: e.target.value }))}
                  />
                </Field>
                <Field label="Expiry">
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={annForm.expiresAt}
                    onChange={(e) => setAnnForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Priority">
                <input
                  type="number"
                  className={inputClass}
                  value={annForm.priority}
                  onChange={(e) =>
                    setAnnForm((f) => ({ ...f, priority: Number(e.target.value) || 0 }))
                  }
                />
              </Field>
              <button
                type="button"
                className={btnPrimary}
                disabled={saveAnnMut.isPending || !annForm.title}
                onClick={() => saveAnnMut.mutate()}
              >
                Save announcement
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold">Announcements</h3>
            <div className="space-y-2">
              {(annQ.data?.announcements ?? []).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-slate-500">
                      Priority {a.priority}
                      {!a.isActive ? " · off" : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => toggleAnnMut.mutate({ id: a.id, isActive: !a.isActive })}
                  >
                    {a.isActive ? "Disable" : "Enable"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ BANNERS ═══════ */}
      {tab === "banners" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold">Create maintenance / promo banner</h3>
            <div className="space-y-3">
              <Field label="Message">
                <input
                  className={inputClass}
                  value={bannerForm.message}
                  onChange={(e) => setBannerForm((f) => ({ ...f, message: e.target.value }))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Background color">
                  <input
                    className={inputClass}
                    value={bannerForm.backgroundColor}
                    onChange={(e) =>
                      setBannerForm((f) => ({ ...f, backgroundColor: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Icon">
                  <input
                    className={inputClass}
                    value={bannerForm.icon}
                    onChange={(e) => setBannerForm((f) => ({ ...f, icon: e.target.value }))}
                    placeholder="info"
                  />
                </Field>
              </div>
              <Field label="Click action">
                <input
                  className={inputClass}
                  value={bannerForm.clickAction}
                  onChange={(e) => setBannerForm((f) => ({ ...f, clickAction: e.target.value }))}
                />
              </Field>
              <Field label="Expires">
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={bannerForm.expiresAt}
                  onChange={(e) => setBannerForm((f) => ({ ...f, expiresAt: e.target.value }))}
                />
              </Field>
              <div
                className="rounded-lg px-3 py-2 text-sm text-white"
                style={{ backgroundColor: bannerForm.backgroundColor || "#0f172a" }}
              >
                {bannerForm.icon ? `${bannerForm.icon} ` : ""}
                {bannerForm.message || "Preview"}
              </div>
              <button
                type="button"
                className={btnPrimary}
                disabled={saveBannerMut.isPending || !bannerForm.message}
                onClick={() => saveBannerMut.mutate()}
              >
                Save banner
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold">Banners</h3>
            <div className="space-y-2">
              {(bannersQ.data?.banners ?? []).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-white"
                  style={{ backgroundColor: b.backgroundColor || "#0f172a" }}
                >
                  <span>{b.message}</span>
                  <button
                    type="button"
                    className="rounded bg-white/20 px-2 py-0.5 text-xs"
                    onClick={() =>
                      toggleBannerMut.mutate({ id: b.id, isActive: !b.isActive })
                    }
                  >
                    {b.isActive ? "Disable" : "Enable"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ FEATURES ═══════ */}
      {tab === "features" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-2 text-sm font-semibold">Feature toggles</h3>
          <p className="mb-4 text-xs text-slate-500">
            Disabled features disappear from mobile navigation. No app redeploy required.
          </p>
          <div className="divide-y divide-slate-100">
            {(featuresQ.data?.features ?? []).map((f) => (
              <div key={f.code} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">{f.label}</div>
                  <div className="text-xs text-slate-500">{f.code}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={f.enabled}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    f.enabled ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  disabled={featureMut.isPending}
                  onClick={() => featureMut.mutate({ code: f.code, enabled: !f.enabled })}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                      f.enabled ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ MENU ═══════ */}
      {tab === "menu" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-2 text-sm font-semibold">Menu management</h3>
          <p className="mb-4 text-xs text-slate-500">
            Control menu visibility. Linked feature flags also hide items when disabled. Platform
            and role scopes are future-ready.
          </p>
          <div className="divide-y divide-slate-100">
            {(menuQ.data?.menu ?? []).map((m) => (
              <div key={m.code} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-xs text-slate-500">
                    {m.code}
                    {m.featureFlag ? ` · flag:${m.featureFlag}` : ""}
                    {m.platformScope ? ` · ${m.platformScope}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    m.enabled ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"
                  }`}
                  disabled={menuMut.isPending}
                  onClick={() => menuMut.mutate({ code: m.code, enabled: !m.enabled })}
                >
                  {m.enabled ? "ON" : "OFF"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ SUBSCRIPTIONS ═══════ */}
      {tab === "subscriptions" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-800">Subscription administration</h3>
            <p className="mt-2 text-sm text-slate-600">
              Manual assign, gift, lifetime, premium / gold / platinum plans, extend, cancel,
              revoke, renewal queues, and full payment history (including Razorpay IDs) are managed
              in the existing Subscriptions & Revenue module — kept as the single source of truth
              so Platform Management does not duplicate billing workflows.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/matrimony-subscriptions" className={btnPrimary}>
                Open Subscriptions & Revenue
              </Link>
              <Link
                to="/matrimony-subscriptions"
                className={btnGhost}
              >
                History · Renewals · Export
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              "Manual / gift / lifetime assignment",
              "Extend · cancel · revoke",
              "Upcoming expiry & reminder notifications",
              "Failed / cancelled renewal queues",
              "Razorpay payment & order IDs",
              "Search, filters, CSV export"
            ].map((t) => (
              <div
                key={t}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ ADS ═══════ */}
      {tab === "ads" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold">Create advertisement</h3>
            <p className="mb-3 text-xs text-slate-500">
              Internal promotions only — no external ad networks.
            </p>
            <div className="space-y-3">
              <Field label="Kind">
                <select
                  className={inputClass}
                  value={adForm.kind}
                  onChange={(e) =>
                    setAdForm((f) => ({ ...f, kind: e.target.value as typeof f.kind }))
                  }
                >
                  <option value="BANNER">Banner</option>
                  <option value="SPONSORED">Sponsored card</option>
                  <option value="INTERNAL">Internal promotion</option>
                </select>
              </Field>
              <Field label="Title">
                <input
                  className={inputClass}
                  value={adForm.title}
                  onChange={(e) => setAdForm((f) => ({ ...f, title: e.target.value }))}
                />
              </Field>
              <Field label="Image URL">
                <input
                  className={inputClass}
                  value={adForm.imageUrl}
                  onChange={(e) => setAdForm((f) => ({ ...f, imageUrl: e.target.value }))}
                />
              </Field>
              <Field label="Target screen">
                <input
                  className={inputClass}
                  value={adForm.targetScreen}
                  onChange={(e) => setAdForm((f) => ({ ...f, targetScreen: e.target.value }))}
                />
              </Field>
              <Field label="Click action">
                <input
                  className={inputClass}
                  value={adForm.clickAction}
                  onChange={(e) => setAdForm((f) => ({ ...f, clickAction: e.target.value }))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts">
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={adForm.startsAt}
                    onChange={(e) => setAdForm((f) => ({ ...f, startsAt: e.target.value }))}
                  />
                </Field>
                <Field label="Ends">
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={adForm.endsAt}
                    onChange={(e) => setAdForm((f) => ({ ...f, endsAt: e.target.value }))}
                  />
                </Field>
              </div>
              <button
                type="button"
                className={btnPrimary}
                disabled={saveAdMut.isPending || !adForm.title}
                onClick={() => saveAdMut.mutate()}
              >
                Save ad
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold">Campaigns</h3>
            <div className="space-y-2">
              {(adsQ.data?.ads ?? []).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {a.title}{" "}
                      <span className="text-xs text-slate-400">{a.kind}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {a.views} views · {a.clicks} clicks · CTR {a.ctr}%
                    </div>
                  </div>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => toggleAdMut.mutate({ id: a.id, isActive: !a.isActive })}
                  >
                    {a.isActive ? "Disable" : "Enable"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ ANALYTICS ═══════ */}
      {tab === "analytics" && (
        <div>
          {analyticsQ.isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <>
              <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { label: "Campaigns", value: analyticsQ.data?.totalCampaigns ?? 0 },
                  { label: "Active", value: analyticsQ.data?.activeCampaigns ?? 0 },
                  { label: "Expired", value: analyticsQ.data?.expiredCampaigns ?? 0 },
                  { label: "Views", value: analyticsQ.data?.totalViews ?? 0 },
                  { label: "CTR %", value: analyticsQ.data?.ctr ?? 0 }
                ].map((c) => (
                  <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase text-slate-500">{c.label}</div>
                    <div className="mt-1 text-2xl font-semibold">{c.value}</div>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Campaign</th>
                      <th className="px-4 py-3">Kind</th>
                      <th className="px-4 py-3">Views</th>
                      <th className="px-4 py-3">Clicks</th>
                      <th className="px-4 py-3">CTR</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analyticsQ.data?.campaigns ?? []).map((c) => (
                      <tr key={c.id} className="border-b border-slate-100">
                        <td className="px-4 py-2 font-medium">{c.title}</td>
                        <td className="px-4 py-2">{c.kind}</td>
                        <td className="px-4 py-2">{c.views}</td>
                        <td className="px-4 py-2">{c.clicks}</td>
                        <td className="px-4 py-2">{c.ctr}%</td>
                        <td className="px-4 py-2">{c.isActive ? "Active" : "Off"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════ AUDITS ═══════ */}
      {tab === "audits" && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              className={`${inputClass} max-w-xs`}
              placeholder="Filter by module (e.g. version)"
              value={auditModule}
              onChange={(e) => {
                setAuditModule(e.target.value);
                setAuditPage(1);
              }}
            />
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Module</th>
                </tr>
              </thead>
              <tbody>
                {(auditsQ.data?.items ?? []).map((a) => (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-500">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{a.adminEmail ?? "—"}</td>
                    <td className="px-4 py-2 font-medium">{a.action}</td>
                    <td className="px-4 py-2">{a.module}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className={btnGhost}
              disabled={auditPage <= 1}
              onClick={() => setAuditPage((p) => p - 1)}
            >
              Prev
            </button>
            <span className="text-xs text-slate-500">
              Page {auditsQ.data?.page ?? auditPage} · {auditsQ.data?.total ?? 0} total
            </span>
            <button
              type="button"
              className={btnGhost}
              disabled={
                (auditsQ.data?.page ?? 1) * (auditsQ.data?.limit ?? 40) >=
                (auditsQ.data?.total ?? 0)
              }
              onClick={() => setAuditPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MaintenanceEditor({
  initial,
  saving,
  onSave
}: {
  initial: {
    enabled: boolean;
    title: string;
    description: string | null;
    expectedEndAt: string | null;
    contactInfo: string | null;
    scheduledStartAt: string | null;
  };
  saving: boolean;
  onSave: (patch: {
    enabled?: boolean;
    title?: string;
    description?: string | null;
    expectedEndAt?: string | null;
    contactInfo?: string | null;
    scheduledStartAt?: string | null;
  }) => void;
}) {
  const [form, setForm] = useState({
    title: initial.title,
    description: initial.description || "",
    expectedEndAt: toLocalInput(initial.expectedEndAt),
    contactInfo: initial.contactInfo || "",
    scheduledStartAt: toLocalInput(initial.scheduledStartAt)
  });

  return (
    <div className="space-y-3">
      <div
        className={`rounded-lg px-3 py-2 text-sm ${
          initial.enabled
            ? "bg-amber-50 text-amber-900"
            : "bg-emerald-50 text-emerald-900"
        }`}
      >
        Maintenance is currently <strong>{initial.enabled ? "ENABLED" : "disabled"}</strong>.
        Users cannot access the app while enabled.
      </div>
      <Field label="Title">
        <input
          className={inputClass}
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
      </Field>
      <Field label="Description">
        <textarea
          className={inputClass}
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </Field>
      <Field label="Expected completion">
        <input
          type="datetime-local"
          className={inputClass}
          value={form.expectedEndAt}
          onChange={(e) => setForm((f) => ({ ...f, expectedEndAt: e.target.value }))}
        />
      </Field>
      <Field label="Contact (optional)">
        <input
          className={inputClass}
          value={form.contactInfo}
          onChange={(e) => setForm((f) => ({ ...f, contactInfo: e.target.value }))}
        />
      </Field>
      <Field label="Scheduled activation">
        <input
          type="datetime-local"
          className={inputClass}
          value={form.scheduledStartAt}
          onChange={(e) => setForm((f) => ({ ...f, scheduledStartAt: e.target.value }))}
        />
      </Field>
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={saving}
          onClick={() =>
            onSave({
              title: form.title,
              description: form.description || null,
              expectedEndAt: fromLocalInput(form.expectedEndAt),
              contactInfo: form.contactInfo || null,
              scheduledStartAt: fromLocalInput(form.scheduledStartAt)
            })
          }
        >
          Save settings
        </button>
        <button
          type="button"
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          disabled={saving || initial.enabled}
          onClick={() => onSave({ enabled: true, title: form.title })}
        >
          Enable now
        </button>
        <button
          type="button"
          className={btnGhost}
          disabled={saving || !initial.enabled}
          onClick={() => onSave({ enabled: false })}
        >
          Disable
        </button>
      </div>
    </div>
  );
}
