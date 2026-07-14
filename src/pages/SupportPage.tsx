import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminSupportContact,
  getAdminSupportTicket,
  listAdminSupportTickets,
  updateAdminSupportContact,
  updateAdminSupportTicket,
  type AdminSupportTicket,
  type SupportContactConfig,
  type SupportTicketStatus
} from "../api/supportAdmin";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import {
  AdminListError,
  AdminPagination,
  AdminTableSkeleton
} from "../components/admin/AdminListControls";
import { useToast } from "../context/ToastContext";

const STATUSES: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "PLANNED", label: "Planned" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "RELEASED", label: "Released" },
  { value: "CLOSED", label: "Closed" }
];

const TYPES = [
  { value: "", label: "All types" },
  { value: "BUG", label: "Bug" },
  { value: "FEATURE", label: "Feature" },
  { value: "QUESTION", label: "Question" },
  { value: "CONTACT", label: "Contact" },
  { value: "GENERAL", label: "General" }
];

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "LOGIN", label: "Login" },
  { value: "FEED", label: "Feed" },
  { value: "CHAT", label: "Chat" },
  { value: "MATRIMONY", label: "Matrimony" },
  { value: "MARKETPLACE", label: "Marketplace" },
  { value: "JOBS", label: "Jobs" },
  { value: "PAYMENTS", label: "Payments" },
  { value: "NOTIFICATIONS", label: "Notifications" },
  { value: "OTHER", label: "Other" }
];

const PRIORITIES = [
  { value: "", label: "All priorities" },
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" }
];

type Tab = "tickets" | "contact";

export function SupportPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>("tickets");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [status, setStatus] = useState("OPEN");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [reply, setReply] = useState("");
  const [editStatus, setEditStatus] = useState<SupportTicketStatus | "">("");
  const [editPriority, setEditPriority] = useState("");

  useEffect(() => {
    setPage(1);
  }, [limit]);

  const listQuery = useQuery({
    queryKey: ["admin-support-tickets", page, limit, status, type, category, priority, searchQ],
    queryFn: () =>
      listAdminSupportTickets({
        page,
        limit,
        status: status || undefined,
        type: type || undefined,
        category: category || undefined,
        priority: priority || undefined,
        q: searchQ || undefined
      }),
    enabled: tab === "tickets"
  });

  const detailQuery = useQuery({
    queryKey: ["admin-support-ticket", viewingId],
    queryFn: () => getAdminSupportTicket(viewingId!),
    enabled: viewingId != null
  });

  const contactQuery = useQuery({
    queryKey: ["admin-support-contact"],
    queryFn: getAdminSupportContact,
    enabled: tab === "contact"
  });

  const [contactForm, setContactForm] = useState<SupportContactConfig | null>(null);
  const contact = contactForm ?? contactQuery.data?.contact ?? null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    queryClient.invalidateQueries({ queryKey: ["admin-support-ticket"] });
  };

  const updateMutation = useMutation({
    mutationFn: () => {
      if (viewingId == null) throw new Error("No ticket");
      return updateAdminSupportTicket(viewingId, {
        status: editStatus || undefined,
        priority: editPriority || undefined,
        reply: reply.trim() || undefined,
        assignedAdminId: undefined
      });
    },
    onSuccess: () => {
      invalidate();
      setReply("");
      addToast("Ticket updated. User notified.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Update failed", "error")
  });

  const contactMutation = useMutation({
    mutationFn: () => {
      if (!contact) throw new Error("No contact config");
      return updateAdminSupportContact(contact);
    },
    onSuccess: (data) => {
      setContactForm(data.contact);
      queryClient.invalidateQueries({ queryKey: ["admin-support-contact"] });
      addToast("Contact settings saved.", "success");
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Save failed", "error")
  });

  const ticket = detailQuery.data?.ticket;

  const openTicket = (item: AdminSupportTicket) => {
    setViewingId(item.id);
    setEditStatus(item.status);
    setEditPriority(item.priority);
    setReply("");
  };

  const columns = useMemo(
    () => [
      {
        key: "ref",
        label: "Ticket",
        render: (r: AdminSupportTicket) => (
          <div>
            <div className="font-semibold text-slate-900">{r.ref}</div>
            <div className="text-xs text-slate-500">{r.type}</div>
          </div>
        )
      },
      {
        key: "title",
        label: "Subject",
        render: (r: AdminSupportTicket) => (
          <div>
            <div className="font-medium text-slate-900">{r.title}</div>
            {r.category ? <div className="text-xs text-slate-500">{r.category}</div> : null}
          </div>
        )
      },
      {
        key: "user",
        label: "User",
        render: (r: AdminSupportTicket) => (
          <div>
            <div className="font-medium">{r.user?.fullName ?? "—"}</div>
            <div className="text-xs text-slate-500">
              {r.user?.community ?? "—"} · {r.metadata?.appVersion ? `v${String(r.metadata.appVersion)}` : "—"}
            </div>
          </div>
        )
      },
      {
        key: "status",
        label: "Status",
        render: (r: AdminSupportTicket) => <StatusBadge status={r.status.replace(/_/g, " ")} />
      },
      {
        key: "priority",
        label: "Priority",
        render: (r: AdminSupportTicket) => (
          <span className="text-sm font-medium text-slate-700">{r.priority}</span>
        )
      },
      {
        key: "updated",
        label: "Updated",
        render: (r: AdminSupportTicket) => (
          <span className="text-xs text-slate-500">{new Date(r.updatedAt).toLocaleString()}</span>
        )
      },
      {
        key: "actions",
        label: "",
        render: (r: AdminSupportTicket) => (
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            onClick={() => openTicket(r)}
          >
            Open
          </button>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Tickets, contact channels, and user requests.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("tickets")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === "tickets" ? "bg-primary text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
            }`}
          >
            Tickets
          </button>
          <button
            type="button"
            onClick={() => setTab("contact")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === "contact" ? "bg-primary text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
            }`}
          >
            Contact config
          </button>
        </div>
      </div>

      {tab === "tickets" ? (
        <>
          <div className="flex flex-wrap gap-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s.value || "all"} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {TYPES.map((s) => (
                <option key={s.value || "all"} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {CATEGORIES.map((s) => (
                <option key={s.value || "all"} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {PRIORITIES.map((s) => (
                <option key={s.value || "all"} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearchQ(searchDraft);
                  setPage(1);
                }
              }}
              placeholder="Search title…"
              className="min-w-[180px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                setSearchQ(searchDraft);
                setPage(1);
              }}
            >
              Search
            </button>
          </div>

          {listQuery.isLoading && !listQuery.data ? (
            <AdminTableSkeleton rows={8} cols={6} />
          ) : listQuery.isError ? (
            <AdminListError
              message={(listQuery.error as Error)?.message || "Failed to load tickets."}
              onRetry={() => void listQuery.refetch()}
            />
          ) : (
            <>
              <DataTable
                columns={columns as any}
                data={(listQuery.data?.items ?? []) as any}
                keyExtractor={(r) => (r as AdminSupportTicket).id}
                emptyMessage="No support tickets found."
              />
              <AdminPagination
                page={page}
                limit={limit}
                total={listQuery.data?.total ?? 0}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </>
          )}
        </>
      ) : (
        <div className="max-w-xl space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {contactQuery.isLoading && !contact ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : contact ? (
            <>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Support note</span>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={2}
                  value={contact.supportNote ?? ""}
                  onChange={(e) =>
                    setContactForm({ ...contact, supportNote: e.target.value || null })
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={contact.emailEnabled}
                  onChange={(e) => setContactForm({ ...contact, emailEnabled: e.target.checked })}
                />
                Email enabled
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="support@example.com"
                value={contact.email ?? ""}
                onChange={(e) => setContactForm({ ...contact, email: e.target.value || null })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={contact.chatEnabled}
                  onChange={(e) => setContactForm({ ...contact, chatEnabled: e.target.checked })}
                />
                In-app chat (tickets) enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={contact.whatsappEnabled}
                  onChange={(e) =>
                    setContactForm({ ...contact, whatsappEnabled: e.target.checked })
                  }
                />
                WhatsApp enabled
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="+91…"
                value={contact.whatsappNumber ?? ""}
                onChange={(e) =>
                  setContactForm({ ...contact, whatsappNumber: e.target.value || null })
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={contact.callEnabled}
                  onChange={(e) => setContactForm({ ...contact, callEnabled: e.target.checked })}
                />
                Call enabled
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="+91…"
                value={contact.phoneNumber ?? ""}
                onChange={(e) =>
                  setContactForm({ ...contact, phoneNumber: e.target.value || null })
                }
              />
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                disabled={contactMutation.isPending}
                onClick={() => contactMutation.mutate()}
              >
                {contactMutation.isPending ? "Saving…" : "Save contact settings"}
              </button>
            </>
          ) : (
            <p className="text-sm text-red-600">Could not load contact config.</p>
          )}
        </div>
      )}

      {viewingId != null && ticket ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-primary">{ticket.ref}</div>
                <h2 className="text-xl font-bold text-slate-900">{ticket.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {ticket.user?.fullName} · {ticket.type}
                  {ticket.category ? ` · ${ticket.category}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-3 py-1 text-sm text-slate-500 hover:bg-slate-100"
                onClick={() => setViewingId(null)}
              >
                Close
              </button>
            </div>

            <p className="whitespace-pre-wrap text-sm text-slate-700">{ticket.description}</p>

            {ticket.screenshotUrl ? (
              <a
                href={ticket.screenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm font-semibold text-primary"
              >
                View screenshot
              </a>
            ) : null}

            {ticket.metadata ? (
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <div>App: {String(ticket.metadata.appVersion ?? "—")}</div>
                <div>Device: {String(ticket.metadata.deviceModel ?? "—")}</div>
                <div>OS: {String(ticket.metadata.osVersion ?? "—")}</div>
                <div>Platform: {String(ticket.metadata.platform ?? "—")}</div>
                <div>Screen: {String(ticket.metadata.screen ?? "—")}</div>
                <div>Community: {String(ticket.metadata.community ?? ticket.user?.community ?? "—")}</div>
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              <div className="text-sm font-bold text-slate-900">Conversation</div>
              {(ticket.messages ?? []).map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    m.authorType === "ADMIN" ? "border-emerald-200 bg-emerald-50" : "border-slate-200"
                  }`}
                >
                  <div className="mb-1 text-xs text-slate-500">
                    {m.authorType === "ADMIN" ? "Admin" : "User"} ·{" "}
                    {new Date(m.createdAt).toLocaleString()}
                  </div>
                  {m.body}
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Status</span>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as SupportTicketStatus)}
                >
                  {STATUSES.filter((s) => s.value).map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Priority</span>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                >
                  {PRIORITIES.filter((s) => s.value).map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-3 block text-sm">
              <span className="mb-1 block font-medium">Reply to user</span>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Optional — user gets an in-app notification"
              />
            </label>

            <button
              type="button"
              className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? "Saving…" : "Update ticket"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
