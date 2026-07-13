import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";
import {
  adminBroadcastNotification,
  getNotificationAudienceStats,
  searchApprovedUsers,
  type AdminBroadcastPayload,
  type UserListItem
} from "../features/notifications-admin/api";

const CATEGORIES = [
  { value: "COMMUNITY", label: "Community", hint: "Announcements & events" },
  { value: "MATRIMONY", label: "Matrimony", hint: "High-priority push channel" },
  { value: "SYSTEM", label: "System", hint: "Account & platform notices" },
  { value: "SOCIAL", label: "Social", hint: "Feed-related (rare for broadcast)" },
  { value: "MESSAGES", label: "Messages", hint: "Messaging alerts" }
] as const;

const TEMPLATES = [
  {
    id: "community",
    title: "Community update",
    body: "We have an important community announcement. Open the app to read more.",
    category: "COMMUNITY" as const
  },
  {
    id: "matrimony",
    title: "Matrimony notice",
    body: "There is an update regarding your matrimony profile. Please review in the app.",
    category: "MATRIMONY" as const
  },
  {
    id: "event",
    title: "Upcoming event",
    body: "Join us for our next community event. Tap for details.",
    category: "COMMUNITY" as const
  }
];

type AudienceMode = "all" | "selected";

export function NotificationsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<AdminBroadcastPayload["category"]>("COMMUNITY");
  const [audience, setAudience] = useState<AudienceMode>("all");
  const [persistInApp, setPersistInApp] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<UserListItem[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<UserListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-notification-stats"],
    queryFn: getNotificationAudienceStats
  });

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      searchApprovedUsers(q)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQ]);

  const audienceLabel = useMemo(() => {
    if (audience === "all") {
      return `All approved users (${stats?.approvedUsers ?? "…"})`;
    }
    return `${selectedUsers.length} selected user(s)`;
  }, [audience, selectedUsers.length, stats?.approvedUsers]);

  const addUser = useCallback((user: UserListItem) => {
    setSelectedUsers((prev) => (prev.some((u) => u.id === user.id) ? prev : [...prev, user]));
    setSearchQ("");
    setSearchResults([]);
  }, []);

  const removeUser = (id: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    setTitle(t.title);
    setBody(t.body);
    setCategory(t.category);
  };

  const broadcastMutation = useMutation({
    mutationFn: adminBroadcastNotification,
    onSuccess: (result) => {
      const msg = result.persistInApp
        ? `Sent to ${result.inAppSent} of ${result.total} users (in-app + push where enabled).`
        : `Push sent to ${result.pushTargets} device(s) (${result.total} users targeted).`;
      setLastResult(msg);
      addToast(msg, "success");
      setConfirmOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-notification-stats"] });
    },
    onError: (err) => {
      let msg = "Broadcast failed";
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message) as { message?: string };
          msg = parsed.message ?? err.message;
        } catch {
          msg = err.message;
        }
      }
      addToast(msg, "error");
      setConfirmOpen(false);
    }
  });

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      addToast("Title and message are required.", "error");
      return;
    }
    if (audience === "selected" && !selectedUsers.length) {
      addToast("Select at least one user or choose All users.", "error");
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSend = () => {
    const payload: AdminBroadcastPayload = {
      title: title.trim(),
      body: body.trim(),
      category,
      persistInApp,
      userIds: audience === "selected" ? selectedUsers.map((u) => u.id) : undefined
    };
    broadcastMutation.mutate(payload);
  };

  return (
    <div className="max-w-4xl">
      <h2 className="mb-2 text-xl font-semibold text-slate-900">Send notification</h2>
      <p className="mb-6 text-sm text-slate-600">
        Broadcast in-app notifications and device push (Expo / FCM) to approved users. Users
        who disabled push or a category in app settings will not receive that channel.
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Approved users"
          value={statsLoading ? "…" : String(stats?.approvedUsers ?? 0)}
        />
        <StatCard
          label="Users with push token"
          value={statsLoading ? "…" : String(stats?.usersWithPushTokens ?? 0)}
        />
        <StatCard
          label="Registered devices"
          value={statsLoading ? "…" : String(stats?.totalPushTokens ?? 0)}
          sub={stats?.fcmConfigured ? "FCM direct enabled" : "Expo push (FCM via Expo)"}
        />
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Quick templates</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTemplate(t)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              {t.title}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
          <input
            type="text"
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Community meetup this Sunday"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Message</label>
          <textarea
            rows={4}
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Full message shown in notification center and push body…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-slate-500">{body.length}/2000</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as AdminBroadcastPayload["category"])}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label} — {c.hint}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Audience</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="audience"
                checked={audience === "all"}
                onChange={() => setAudience("all")}
              />
              All approved users
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="audience"
                checked={audience === "selected"}
                onChange={() => setAudience("selected")}
              />
              Selected users only
            </label>
          </div>
        </div>

        {audience === "selected" && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Search users (name, email, mobile)
            </label>
            <input
              type="search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Type at least 2 characters…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {searching && <p className="mt-2 text-xs text-slate-500">Searching…</p>}
            {searchResults.length > 0 && (
              <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                {searchResults.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => addUser(u)}
                      className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-900">{u.fullName}</span>
                      <span className="text-xs text-slate-500">
                        {u.email} · ID {u.id}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedUsers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {u.fullName}
                    <button
                      type="button"
                      onClick={() => removeUser(u.id)}
                      className="ml-1 text-primary hover:text-primary-700"
                      aria-label={`Remove ${u.fullName}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={persistInApp}
            onChange={(e) => setPersistInApp(e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium text-slate-800">
              Save to notification center
            </span>
            <span className="block text-xs text-slate-500">
              Uncheck for push-only blast (no in-app history). Still respects user push
              preferences.
            </span>
          </span>
        </label>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Push preview
          </p>
          <div className="max-w-sm rounded-xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="text-xs text-slate-500">Digital House</p>
            <p className="mt-1 font-semibold text-slate-900">{title || "Notification title"}</p>
            <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">
              {body || "Message body appears here…"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleSend}
            disabled={broadcastMutation.isPending}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {broadcastMutation.isPending ? "Sending…" : "Send now"}
          </button>
          <p className="text-sm text-slate-500">{audienceLabel}</p>
        </div>

        {lastResult && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{lastResult}</p>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Send notification?"
        message={`This will notify ${audienceLabel}. ${
          persistInApp
            ? "Users receive in-app + push (if enabled)."
            : "Push only — no notification center entry."
        }`}
        confirmLabel={broadcastMutation.isPending ? "Sending…" : "Send"}
        onConfirm={confirmSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}
