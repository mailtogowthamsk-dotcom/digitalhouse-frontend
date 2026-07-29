import { Link } from "react-router-dom";
import type { PlatformDashboard } from "../../api/platformAdmin";

const btnGhost =
  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

export function StoragePanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">Storage</h3>
        <p className="mt-2 text-sm text-slate-600">
          Media is stored on Cloudflare R2. Full usage / cleanup metrics will expand here. Orphan
          media cleanup already runs as a background job on the API.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Profile photos, post media, marketplace galleries</li>
          <li>Signed URL delivery for private objects</li>
          <li>Background orphan cleanup (server-side)</li>
        </ul>
      </div>
    </div>
  );
}

export function PlatformHealthPanel({
  dashboard
}: {
  dashboard?: PlatformDashboard | null;
}) {
  const maintenanceOn = Boolean(dashboard?.maintenance?.enabled);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">Platform health</h3>
        <p className="mt-2 text-sm text-slate-600">
          Operational snapshot from the Platform dashboard. Deeper cron / queue / socket metrics can
          be added without changing existing services.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            label: "Maintenance mode",
            value: maintenanceOn ? "ON" : "OFF",
            warn: maintenanceOn
          },
          { label: "Active users", value: String(dashboard?.activeUsers ?? "—") },
          {
            label: "Active subscriptions",
            value: String(dashboard?.activeSubscriptions ?? "—")
          },
          {
            label: "Features enabled",
            value: `${dashboard?.featuresEnabled ?? 0}/${dashboard?.featuresTotal ?? 0}`
          },
          {
            label: "Pending notifications",
            value: String(dashboard?.pendingNotifications ?? "—")
          },
          { label: "Active ads", value: String(dashboard?.activeAds ?? "—") }
        ].map((c) => (
          <div
            key={c.label}
            className={`rounded-xl border p-4 ${
              c.warn ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/matrimony-subscriptions" className={btnGhost}>
          Subscriptions ops
        </Link>
        <Link to="/marketplace" className={btnGhost}>
          Marketplace ops
        </Link>
        <Link to="/job-portal" className={btnGhost}>
          Jobs ops
        </Link>
      </div>
    </div>
  );
}

export function MatrimonyConfigPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">Matrimony</h3>
        <p className="mt-2 text-sm text-slate-600">
          Plan pricing lives under Subscription Pricing. Profile review, safety reports, and
          matrimony config remain in the Matrimony admin module.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/matrimony" className={btnGhost}>
            Open Matrimony admin
          </Link>
          <Link to="/matrimony-subscriptions" className={btnGhost}>
            Subscriptions & Revenue
          </Link>
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        Tip: edit Gold / Platinum price, duration, benefits, GST, and popular badge in the{" "}
        <strong>Subscription Pricing</strong> tab. Contact reveal and open quota are there too.
      </div>
    </div>
  );
}
