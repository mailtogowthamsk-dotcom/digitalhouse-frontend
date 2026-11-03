import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approveUser, rejectUser } from "../api/admin";
import {
  addRegistrationNote,
  claimRegistrationRequest,
  getRegistrationRequest,
  listSupportMembers,
  reassignRegistrationRequest,
  startRegistrationReview
} from "../api/registrationDesk";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export function RegistrationRequestDetailPage() {
  const { userId } = useParams();
  const id = Number(userId);
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { hasModule } = useAuth();
  const [note, setNote] = useState("");
  const [memberId, setMemberId] = useState("");

  const detail = useQuery({
    queryKey: ["registration-request", id],
    queryFn: () => getRegistrationRequest(id),
    enabled: Number.isFinite(id) && id > 0
  });
  const members = useQuery({
    queryKey: ["support-team"],
    queryFn: listSupportMembers,
    enabled: Boolean(detail.data?.permissions.canReassign)
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["registration-request", id] });
    await queryClient.invalidateQueries({ queryKey: ["registration-requests"] });
    await queryClient.invalidateQueries({ queryKey: ["registration-summary"] });
  };

  const run = useMutation({
    mutationFn: async (action: "claim" | "start" | "note" | "reassign" | "approve" | "reject") => {
      if (action === "claim") return claimRegistrationRequest(id);
      if (action === "start") return startRegistrationReview(id);
      if (action === "note") return addRegistrationNote(id, note);
      if (action === "reassign") return reassignRegistrationRequest(id, Number(memberId));
      if (action === "approve") return approveUser(id);
      const reason = window.prompt("Rejection reason")?.trim();
      if (!reason) throw new Error("Rejection reason is required.");
      return rejectUser(id, reason);
    },
    onSuccess: async (_data, action) => {
      if (action === "note") setNote("");
      addToast("Saved.", "success");
      await refresh();
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Could not update", "error")
  });

  if (!Number.isFinite(id) || id <= 0) return <p className="text-sm text-red-600">Invalid request.</p>;
  if (detail.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (detail.isError || !detail.data) {
    return (
      <p className="text-sm text-red-600">
        {detail.error instanceof Error ? detail.error.message : "Could not load this request."}
      </p>
    );
  }

  const { request, events, notes, approvals, permissions } = detail.data;
  const activeMembers = (members.data ?? []).filter((m) => m.isActive);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/registration-requests" className="text-sm text-primary hover:underline">
            Back to requests
          </Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900">
            {request.applicantName} <span className="text-slate-400">#{request.requestId}</span>
          </h1>
        </div>
        <StatusBadge status={request.status.replace(/_/g, " ")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Applicant</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {[
              ["Email", request.email],
              ["Mobile", request.mobile || "—"],
              ["Username", request.username || "—"],
              ["Gender", request.gender || "—"],
              ["Date of birth", request.dob || "—"],
              ["Kulam", request.kulam || "—"],
              ["District", request.district || "—"],
              ["Location", request.location || "—"],
              ["Occupation", request.occupation || "—"],
              ["Submitted", new Date(request.submittedAt).toLocaleString()],
              ["Assigned to", request.assignedTo || "Unassigned"],
              ["Assigned by", request.assignedBy || "—"]
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          {(detail.data && (permissions.canOpenProfile ?? hasModule("users"))) ? (
            <Link className="mt-4 inline-block text-sm font-semibold text-primary hover:underline" to={`/users/${request.requestId}`}>
              Open full profile
            </Link>
          ) : null}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Actions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {permissions.canClaim ? (
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={run.isPending}
                onClick={() => run.mutate("claim")}
              >
                Claim
              </button>
            ) : null}
            {permissions.canStart ? (
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={run.isPending}
                onClick={() => run.mutate("start")}
              >
                Start review
              </button>
            ) : null}
            {permissions.canApprove ? (
              <>
                <button
                  type="button"
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={run.isPending}
                  onClick={() => {
                    if (window.confirm("Approve this member into the community?")) run.mutate("approve");
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={run.isPending}
                  onClick={() => run.mutate("reject")}
                >
                  Reject
                </button>
              </>
            ) : null}
          </div>
          {permissions.canReassign ? (
            <div className="mt-4 flex gap-2">
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              >
                <option value="">Reassign to…</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.email}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-60"
                disabled={!memberId || run.isPending}
                onClick={() => {
                  if (window.confirm("Reassign this request?")) run.mutate("reassign");
                }}
              >
                Reassign
              </button>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-slate-500">
            Approve and reject use the existing registration review. A support member without that permission cannot approve.
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Internal notes</h2>
        <p className="mt-1 text-xs text-slate-500">Visible only inside the admin desk. The applicant cannot see these.</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run.mutate("note");
          }}
        >
          <textarea
            className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={note}
            maxLength={2000}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for the support team"
          />
          <button type="submit" className="h-10 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white" disabled={run.isPending}>
            Add
          </button>
        </form>
        <ul className="mt-4 space-y-3">
          {notes.length === 0 ? <li className="text-sm text-slate-500">No notes yet.</li> : null}
          {notes.map((item) => (
            <li key={item.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div className="text-xs text-slate-500">
                {item.authorEmail} · {new Date(item.createdAt).toLocaleString()}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-slate-800">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Assignment history</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {events.length === 0 ? <li className="text-slate-500">No assignment yet.</li> : null}
            {events.map((event) => (
              <li key={event.id}>
                <span className="font-semibold">{event.action}</span>
                {event.toMemberEmail ? ` → ${event.toMemberEmail}` : ""}
                <div className="text-xs text-slate-500">
                  {event.actorEmail} · {new Date(event.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Approval history</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {approvals.length === 0 ? <li className="text-slate-500">No review decision yet.</li> : null}
            {approvals.map((item) => (
              <li key={item.id}>
                <div className="font-medium">{item.verifiedBy}</div>
                <div className="text-xs text-slate-500">{new Date(item.verifiedAt).toLocaleString()}</div>
                {item.remarks ? <p className="mt-1 text-slate-700">{item.remarks}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
