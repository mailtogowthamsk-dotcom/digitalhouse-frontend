import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMatrimonyRequestDetail,
  approveMatrimonyRequest,
  rejectMatrimonyRequest,
  requestMatrimonyChanges,
  suspendMatrimonyProfile,
  updateMatrimonyVerification,
  addMatrimonyNote,
  assignMatrimonyReviewer,
  getMatrimonyConfig
} from "../api";
import { WorkflowBadge } from "../components/WorkflowBadge";
import { MediaGallery } from "../components/MediaGallery";
import { OwnerCandidateMediaCompare } from "../components/OwnerCandidateMediaCompare";
import { DetailSection, fieldsFromRecord } from "../components/DetailSection";
import { VerificationPanel } from "../components/VerificationPanel";
import { NotesPanel } from "../components/NotesPanel";
import { AuditTimeline } from "../components/AuditTimeline";
import { SubmissionCompare } from "../components/SubmissionCompare";
import { MATRIMONY_FIELD_LABELS } from "../constants";
import { useToast } from "../../../context/ToastContext";
import { useAuth } from "../../../context/AuthContext";

export function MatrimonyRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const requestId = Number(id);
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { adminEmail } = useAuth();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("INCOMPLETE_PROFILE");
  const [rejectComment, setRejectComment] = useState("");
  const [changesComment, setChangesComment] = useState("");
  const [changeSections, setChangeSections] = useState<string[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["matrimony-admin-detail", requestId],
    queryFn: () => getMatrimonyRequestDetail(requestId),
    enabled: Number.isFinite(requestId)
  });

  const { data: config } = useQuery({
    queryKey: ["matrimony-admin-config"],
    queryFn: getMatrimonyConfig
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["matrimony-admin-detail", requestId] });
    queryClient.invalidateQueries({ queryKey: ["matrimony-admin-requests"] });
    queryClient.invalidateQueries({ queryKey: ["matrimony-admin-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const approveMut = useMutation({
    mutationFn: () => approveMatrimonyRequest(requestId),
    onSuccess: () => {
      addToast("Profile approved.", "success");
      invalidate();
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectMatrimonyRequest(requestId, rejectReason, rejectComment),
    onSuccess: () => {
      addToast("Profile rejected.", "success");
      setRejectOpen(false);
      invalidate();
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  const changesMut = useMutation({
    mutationFn: () => requestMatrimonyChanges(requestId, changesComment, changeSections),
    onSuccess: () => {
      addToast("Changes requested from user.", "success");
      setChangesOpen(false);
      invalidate();
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  const suspendMut = useMutation({
    mutationFn: (reason: string) => suspendMatrimonyProfile(requestId, reason),
    onSuccess: () => {
      addToast("Profile suspended.", "success");
      invalidate();
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  const verifyMut = useMutation({
    mutationFn: ({ key, checked }: { key: string; checked: boolean }) =>
      updateMatrimonyVerification(requestId, key, checked),
    onSuccess: () => invalidate(),
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  const noteMut = useMutation({
    mutationFn: ({
      content,
      noteType
    }: {
      content: string;
      noteType: "REVIEW" | "WARNING" | "MODERATION" | "INTERNAL";
    }) => addMatrimonyNote(requestId, content, noteType),
    onSuccess: () => {
      addToast("Note added.", "success");
      invalidate();
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Failed", "error")
  });

  const assignMut = useMutation({
    mutationFn: () => assignMatrimonyReviewer(requestId, adminEmail ?? "admin"),
    onSuccess: () => {
      addToast("Assigned to you for review.", "success");
      invalidate();
    }
  });

  if (!Number.isFinite(requestId)) {
    return <p className="text-red-600">Invalid request ID.</p>;
  }

  if (isLoading) {
    return <p className="text-slate-600">Loading request…</p>;
  }

  if (error || !data) {
    return (
      <div>
        <p className="text-red-600">Could not load request.</p>
        <Link to="/matrimony" className="mt-2 inline-block text-primary hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  const m = data.matrimonyPending ?? {};
  const u = data.user;
  const canModerate = data.rowStatus === "PENDING";

  return (
    <div className="pb-24">
      <Link to="/matrimony" className="text-sm font-medium text-primary hover:underline">
        ← Back to requests
      </Link>

      <header className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:flex lg:gap-6">
        {(() => {
          const pv = (data as { photoVerification?: { matrimonyCandidatePhoto?: string; accountOwnerPhoto?: string } })
            .photoVerification;
          const thumb = pv?.matrimonyCandidatePhoto ?? pv?.accountOwnerPhoto ?? (u.profilePhoto as string);
          return typeof thumb === "string" && thumb ? (
          <img
            src={thumb}
            alt="Matrimony candidate"
            className="h-28 w-28 shrink-0 rounded-xl object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
            No photo
          </div>
        );
        })()}
        <div className="mt-4 min-w-0 flex-1 lg:mt-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{String(u.fullName)}</h2>
            <WorkflowBadge status={data.workflowStatus} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Profile ID #{data.userId} · Request #{data.id}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Submitted {new Date(data.submittedAt).toLocaleString()} · Updated{" "}
            {new Date(data.updatedAt).toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Completion {data.profileCompletion}%
            {data.assignedReviewer && ` · Reviewer: ${data.assignedReviewer}`}
          </p>
          {!data.submittedForReview && data.workflowStatus !== "CHANGES_REQUESTED" && (
            <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
              Draft only — user has not submitted for approval yet.
            </p>
          )}
          {data.changeRequest && (
            <p className="mt-2 rounded-md bg-orange-50 px-2 py-1 text-xs text-orange-900">
              Changes requested: {data.changeRequest.comment}
            </p>
          )}
        </div>
      </header>

      {(data.submissionSnapshot || (data.fieldChanges as unknown[])?.length > 0) && (
        <div className="mt-6">
          <SubmissionCompare
            previous={data.submissionSnapshot as Record<string, unknown> | null}
            current={(data.matrimonyPending as Record<string, unknown>) ?? null}
            fieldChanges={(data.fieldChanges as { field: string; oldValue: unknown; newValue: unknown }[]) ?? []}
            labels={MATRIMONY_FIELD_LABELS}
          />
        </div>
      )}

      <div className="sticky bottom-0 z-40 mt-6 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        {canModerate && (
          <>
            <button
              type="button"
              onClick={() => approveMut.mutate()}
              disabled={approveMut.isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Approve profile
            </button>
            <button
              type="button"
              onClick={() => setRejectOpen(true)}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Reject profile
            </button>
            <button
              type="button"
              onClick={() => setChangesOpen(true)}
              className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
            >
              Request changes
            </button>
            <button
              type="button"
              onClick={() => assignMut.mutate()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Assign to me
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            const reason = window.prompt("Reason for suspension:");
            if (reason?.trim()) suspendMut.mutate(reason.trim());
          }}
          className="rounded-lg border border-purple-300 px-4 py-2 text-sm font-medium text-purple-800"
        >
          Suspend profile
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DetailSection
            title="Basic user details"
            fields={[
              { label: "Full name", value: u.fullName },
              { label: "Gender", value: u.gender },
              { label: "Date of birth", value: u.dob },
              { label: "Age", value: u.age },
              { label: "Mobile", value: u.mobile },
              { label: "Email", value: u.email },
              { label: "District", value: u.district },
              { label: "City", value: u.city },
              { label: "Native place", value: u.nativePlace }
            ]}
          />

          <DetailSection
            title="Matrimony details"
            fields={fieldsFromRecord(m as Record<string, unknown>, [
              "lookingFor",
              "partnerGenderPreference",
              "kulamSnapshot",
              "rashi",
              "nakshatram",
              "dosham",
              "maritalStatus",
              "height",
              "complexion",
              "motherTongue",
              "aboutMe",
              "gotra"
            ])}
          />

          <DetailSection
            title="Education & career"
            fields={fieldsFromRecord(m as Record<string, unknown>, [
              "education",
              "occupation",
              "employer",
              "annualIncome"
            ]).concat([
              { label: "Work location", value: u.workLocation },
              { label: "User education (profile)", value: u.education }
            ])}
          />

          <DetailSection
            title="Family details"
            fields={fieldsFromRecord(m as Record<string, unknown>, [
              "familyType",
              "familyStatus",
              "motherName",
              "fatherOccupation",
              "numberOfSiblings",
              "brothersCount",
              "sistersCount"
            ])}
          />

          <DetailSection
            title="Partner preferences"
            fields={[
              {
                label: "Age range",
                value:
                  m.partnerAgeMin != null || m.partnerAgeMax != null
                    ? `${m.partnerAgeMin ?? "?"} – ${m.partnerAgeMax ?? "?"}`
                    : null
              },
              {
                label: "Preferred districts",
                value: (data.partnerPreferencesDisplay.preferredDistricts as string[])?.join(
                  ", "
                )
              },
              {
                label: "Preferred kulams",
                value: (data.partnerPreferencesDisplay.preferredKulams as string[])?.join(", ")
              },
              { label: "Preferences", value: m.partnerPreferences }
            ]}
          />

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Media & documents (current submission)
            </h3>
            <OwnerCandidateMediaCompare
              photoVerification={data.photoVerification}
              horoscopeUrl={m.horoscopeDocumentUrl as string}
            />
            {data.submissionSnapshot &&
              (data.workflowStatus === "RESUBMITTED" || data.workflowStatus === "CHANGES_REQUESTED") && (
              <div className="mt-6 border-t border-slate-200 pt-6">
                <h4 className="mb-3 text-xs font-bold uppercase text-slate-500">
                  Previous submission (before resubmit)
                </h4>
                <MediaGallery
                  profilePhoto={
                    ((data.submissionSnapshot as Record<string, unknown>).candidatePhotoUrl as string) ??
                    ((data.submissionSnapshot as Record<string, unknown>).profilePhotoUrl as string)
                  }
                  horoscopeUrl={(data.submissionSnapshot as Record<string, unknown>).horoscopeDocumentUrl as string}
                />
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <VerificationPanel
            verification={data.verification}
            disabled={!canModerate}
            onToggle={(key, checked) => verifyMut.mutate({ key, checked })}
          />
          <NotesPanel
            notes={data.notes}
            loading={noteMut.isPending}
            onAdd={(content, noteType) => noteMut.mutate({ content, noteType })}
          />
          <AuditTimeline entries={data.auditLog} />
        </div>
      </div>

      {rejectOpen && (
        <Modal title="Reject profile" onClose={() => setRejectOpen(false)}>
          <label className="block text-sm font-medium text-slate-700">Reason</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          >
            {data.rejectionReasons.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
          <label className="mt-3 block text-sm font-medium text-slate-700">Comments</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setRejectOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
              onClick={() => rejectMut.mutate()}
              disabled={rejectMut.isPending}
            >
              Confirm reject
            </button>
          </div>
        </Modal>
      )}

      {changesOpen && (
        <Modal title="Request changes" onClose={() => setChangesOpen(false)}>
          <p className="text-sm text-slate-600">User can edit and resubmit without a full rejection.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(config?.changeRequestTemplates ?? []).map((t) => (
              <button
                key={t}
                type="button"
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs"
                onClick={() => setChangesComment((c) => (c ? `${c}\n${t}` : t))}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold uppercase text-slate-500">Sections to correct</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(config?.changeSections ?? []).map((sec: { key: string; label: string }) => {
              const on = changeSections.includes(sec.key);
              return (
                <button
                  key={sec.key}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    on ? "border-primary bg-blue-50 text-primary" : "border-slate-200 bg-white text-slate-700"
                  }`}
                  onClick={() =>
                    setChangeSections((prev) =>
                      prev.includes(sec.key) ? prev.filter((k) => k !== sec.key) : [...prev, sec.key]
                    )
                  }
                >
                  {sec.label}
                </button>
              );
            })}
          </div>
          <textarea
            rows={4}
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={changesComment}
            onChange={(e) => setChangesComment(e.target.value)}
            placeholder="What should the user fix?"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setChangesOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white"
              onClick={() => changesMut.mutate()}
              disabled={changesComment.trim().length < 3 || changesMut.isPending}
            >
              Send request
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <div className="mt-3">{children}</div>
        <button
          type="button"
          className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
