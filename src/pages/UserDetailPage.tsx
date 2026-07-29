import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUserById,
  updateAdminUser,
  softDeleteUser,
  restoreUser,
  hardDeleteUser,
  approveUser,
  rejectUser,
  requestRegistrationChanges,
  type UpdateAdminUserPayload
} from "../api/admin";
import { reactivateAdminUser, suspendAdminUser } from "../api/reportsAdmin";
import { StatusBadge } from "../components/StatusBadge";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  DetailCard,
  FieldGrid,
  formatBytes,
  formatDate,
  yesNo
} from "../components/admin/UserDetailCards";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { PermissionGate } from "../components/PermissionGate";

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-24 rounded-xl bg-slate-200" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 rounded-xl bg-slate-200" />
        <div className="h-48 rounded-xl bg-slate-200" />
      </div>
      <div className="h-64 rounded-xl bg-slate-200" />
    </div>
  );
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateAdminUserPayload>({});
  const [confirm, setConfirm] = useState<
    | null
    | {
        type:
          | "approve"
          | "reject"
          | "suspend"
          | "reactivate"
          | "softDelete"
          | "hardDelete"
          | "restore"
          | "requestChanges";
      }
  >(null);
  const [hardConfirmText, setHardConfirmText] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: () => getUserById(userId),
    enabled: Number.isFinite(userId) && userId > 0
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const user = data?.user;
  const isReviewable =
    user?.status === "PENDING" ||
    user?.status === "PENDING_REVIEW" ||
    user?.status === "CHANGES_REQUESTED";

  const startEdit = () => {
    if (!user) return;
    setEditForm({
      fullName: user.fullName ?? "",
      username: user.username ?? "",
      gender: user.gender ?? "",
      dob: user.dob ? String(user.dob).slice(0, 10) : "",
      email: user.email ?? "",
      mobile: user.mobile ?? "",
      occupation: user.occupation ?? "",
      location: user.location ?? "",
      community: user.community ?? "",
      kulam: user.kulam ?? "",
      bloodGroup: user.bloodGroup ?? "",
      education: user.education ?? "",
      jobTitle: user.jobTitle ?? "",
      company: user.company ?? "",
      workLocation: user.workLocation ?? "",
      skills: user.skills ?? "",
      city: user.city ?? "",
      district: user.district ?? "",
      communityRole: user.communityRole ?? "",
      profileVisibility: user.profileVisibility ?? "PUBLIC",
      allowConnectionRequests: user.allowConnectionRequests !== false
    });
    setEditing(true);
  };

  const saveMut = useMutation({
    mutationFn: () => updateAdminUser(userId, editForm),
    onSuccess: () => {
      addToast("User updated.", "success");
      setEditing(false);
      invalidate();
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Update failed", "error")
  });

  const runAction = async () => {
    if (!confirm || !user) return;
    try {
      if (confirm.type === "approve") await approveUser(userId);
      if (confirm.type === "reject") {
        const remarks = window.prompt("Rejection reason:")?.trim();
        if (!remarks) return;
        await rejectUser(userId, remarks);
      }
      if (confirm.type === "requestChanges") {
        const remarks = window.prompt("What should the user correct?")?.trim();
        if (!remarks) return;
        const fields: Array<"mobile" | "profilePhoto"> = [];
        if (window.confirm("Request mobile correction?")) fields.push("mobile");
        if (window.confirm("Request profile photo correction?")) fields.push("profilePhoto");
        if (!fields.length) {
          addToast("Select at least one field.", "error");
          return;
        }
        await requestRegistrationChanges(userId, remarks, fields);
      }
      if (confirm.type === "suspend") await suspendAdminUser(userId);
      if (confirm.type === "reactivate") await reactivateAdminUser(userId);
      if (confirm.type === "softDelete") {
        const reason = window.prompt("Soft-delete reason (optional):")?.trim();
        await softDeleteUser(userId, reason || undefined);
      }
      if (confirm.type === "restore") await restoreUser(userId);
      if (confirm.type === "hardDelete") {
        if (hardConfirmText !== "DELETE") {
          addToast('Type DELETE to confirm hard delete.', "error");
          return;
        }
        const reason = window.prompt("Hard-delete reason (optional):")?.trim();
        await hardDeleteUser(userId, reason || undefined);
        addToast("User permanently deleted.", "success");
        setConfirm(null);
        navigate("/users");
        invalidate();
        return;
      }
      addToast("Action completed.", "success");
      setConfirm(null);
      setHardConfirmText("");
      invalidate();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Action failed", "error");
    }
  };

  const personal = data?.profile?.personal as Record<string, unknown> | null | undefined;
  const community = data?.profile?.community as Record<string, unknown> | null | undefined;

  const storageProfile = useMemo(() => {
    const rows = data?.storage?.byModule ?? [];
    const sum = (mod: string) =>
      rows.filter((r) => r.module === mod).reduce((s, r) => s + r.bytes, 0);
    return {
      profile: sum("profile"),
      posts: sum("posts"),
      videos: rows
        .filter((r) => r.fileType === "video")
        .reduce((s, r) => s + r.bytes, 0),
      documents: sum("matrimony") + sum("prominent"),
      total: data?.storage?.totalBytes ?? 0
    };
  }, [data?.storage]);

  if (!Number.isFinite(userId) || userId <= 0) {
    return <p className="text-sm text-red-600">Invalid user id</p>;
  }

  if (isLoading) return <Skeleton />;
  if (isError || !data || !user) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error instanceof Error ? error.message : "Failed to load user"}
        <button type="button" className="ml-3 underline" onClick={() => void refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mx-1 border-b border-slate-200 bg-slate-50/95 px-1 py-3 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {user.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt=""
                className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-600">
                {(user.fullName || "?").charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold text-slate-900">{user.fullName}</h1>
                <StatusBadge status={user.status} />
                {data.subscription?.currentPlan ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    {data.subscription.currentPlan}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                @{user.username || "—"} · ID {user.id}
                <button
                  type="button"
                  className="ml-2 text-xs text-primary hover:underline"
                  onClick={() => void navigator.clipboard.writeText(String(user.id))}
                >
                  Copy ID
                </button>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/users"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </Link>
            <PermissionGate action="users.edit">
              {user.status !== "DELETED" && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Edit
                </button>
              )}
            </PermissionGate>
            <PermissionGate action="users.approve">
              {isReviewable && (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirm({ type: "approve" })}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm({ type: "requestChanges" })}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Request changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm({ type: "reject" })}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Reject
                  </button>
                </>
              )}
            </PermissionGate>
            <PermissionGate action="users.suspend">
              {(user.status === "APPROVED" || user.status === "Active") && (
                <button
                  type="button"
                  onClick={() => setConfirm({ type: "suspend" })}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800"
                >
                  Suspend
                </button>
              )}
              {user.status === "SUSPENDED" && (
                <button
                  type="button"
                  onClick={() => setConfirm({ type: "reactivate" })}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800"
                >
                  Activate
                </button>
              )}
            </PermissionGate>
            <PermissionGate action="users.delete">
              {user.status === "DELETED" ? (
                <button
                  type="button"
                  onClick={() => setConfirm({ type: "restore" })}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800"
                >
                  Restore
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirm({ type: "softDelete" })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
                >
                  Soft delete
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setHardConfirmText("");
                  setConfirm({ type: "hardDelete" });
                }}
                className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white"
              >
                Hard delete
              </button>
            </PermissionGate>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link className="rounded-md bg-white px-2 py-1 text-primary ring-1 ring-slate-200 hover:bg-slate-50" to={`/posts?userId=${userId}`}>
            View Posts
          </Link>
          <Link className="rounded-md bg-white px-2 py-1 text-primary ring-1 ring-slate-200 hover:bg-slate-50" to={`/marketplace?q=${encodeURIComponent(user.email || "")}`}>
            View Marketplace
          </Link>
          <Link className="rounded-md bg-white px-2 py-1 text-primary ring-1 ring-slate-200 hover:bg-slate-50" to="/matrimony">
            View Matrimony
          </Link>
          <Link className="rounded-md bg-white px-2 py-1 text-primary ring-1 ring-slate-200 hover:bg-slate-50" to="/reports">
            View Reports
          </Link>
          <Link className="rounded-md bg-white px-2 py-1 text-primary ring-1 ring-slate-200 hover:bg-slate-50" to="/matrimony-subscriptions">
            Change Subscription
          </Link>
        </div>
      </div>

      {editing && (
        <DetailCard
          title="Edit User"
          actions={
            <div className="flex gap-2">
              <button
                type="button"
                className="text-sm text-slate-600 hover:underline"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveMut.isPending}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                onClick={() => saveMut.mutate()}
              >
                Save
              </button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["fullName", "Full name"],
                ["username", "Username"],
                ["email", "Email"],
                ["mobile", "Mobile"],
                ["gender", "Gender"],
                ["dob", "Date of birth"],
                ["occupation", "Occupation"],
                ["jobTitle", "Designation"],
                ["company", "Company"],
                ["education", "Education"],
                ["bloodGroup", "Blood group"],
                ["community", "Community"],
                ["kulam", "Kulam"],
                ["city", "City"],
                ["district", "District"],
                ["location", "Location"],
                ["communityRole", "Community role"],
                ["skills", "Skills"]
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="text-xs font-medium text-slate-500">{label}</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={(editForm[key] as string) ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        </DetailCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard title="Basic Information">
          <div className="mb-4 flex gap-4">
            {user.profilePhoto ? (
              <img src={user.profilePhoto} alt="Profile" className="h-24 w-24 rounded-lg object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                No photo
              </div>
            )}
            <div className="flex h-24 flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
              Cover photo not stored
            </div>
          </div>
          <FieldGrid
            fields={[
              { label: "User ID", value: user.id, copy: String(user.id) },
              { label: "Name", value: user.fullName },
              { label: "Username", value: user.username || "—" },
              { label: "Bio", value: "—" },
              { label: "Date of Birth", value: user.dob || "—" },
              { label: "Age", value: user.age ?? "—" },
              { label: "Gender", value: user.gender || "—" },
              { label: "Marital Status", value: (personal?.maritalStatus as string) || "—" },
              { label: "Occupation", value: user.occupation || (personal?.occupation as string) || "—" },
              { label: "Company", value: user.company || "—" },
              { label: "Designation", value: user.jobTitle || "—" },
              { label: "Education", value: user.education || "—" },
              { label: "Blood Group", value: user.bloodGroup || "—" }
            ]}
          />
        </DetailCard>

        <DetailCard title="Contact">
          <FieldGrid
            fields={[
              { label: "Mobile", value: user.mobile || "—", copy: user.mobile || undefined },
              { label: "Email", value: user.email, copy: user.email },
              { label: "Pending Mobile", value: user.pendingMobile || null }
            ]}
          />
        </DetailCard>

        <DetailCard title="Location">
          <FieldGrid
            fields={[
              { label: "Address / Location", value: user.location || "—" },
              { label: "Village", value: (community?.nativeVillage as string) || "—" },
              { label: "City", value: user.city || "—" },
              { label: "District", value: user.district || "—" },
              { label: "State", value: "—" },
              { label: "Country", value: "—" },
              { label: "Pincode", value: "—" },
              { label: "Current Location", value: (personal?.currentLocation as string) || "—" },
              { label: "Latitude", value: "—" },
              { label: "Longitude", value: "—" }
            ]}
          />
        </DetailCard>

        <DetailCard title="Registration">
          <FieldGrid
            fields={[
              { label: "Registration Date", value: formatDate(user.createdAt) },
              {
                label: "Approval / Review Date",
                value: formatDate(
                  data.registrationReview?.registrationReviewedAt || user.registrationReviewedAt
                )
              },
              {
                label: "Approved By",
                value: data.verificationHistory?.[0]?.verifiedBy || "—"
              },
              { label: "Current Status", value: <StatusBadge status={user.status} /> },
              {
                label: "Reason / Remarks",
                value:
                  data.registrationReview?.registrationAdminRemarks ||
                  user.registrationAdminRemarks ||
                  "—"
              },
              {
                label: "Requested Fields",
                value: (data.registrationReview?.registrationRequestedFields || []).join(", ") || "—"
              }
            ]}
          />
        </DetailCard>

        <DetailCard title="Verification">
          <FieldGrid
            fields={[
              { label: "Email Verified", value: yesNo(user.emailVerified) },
              { label: "Mobile Verified", value: "—" },
              {
                label: "Profile Verified",
                value: user.status === "APPROVED" ? "Yes" : "No"
              },
              { label: "Identity (Govt ID)", value: user.govtIdType || "—" },
              {
                label: "Verification Date",
                value: formatDate(data.verificationHistory?.[0]?.verifiedAt)
              }
            ]}
          />
          {user.govtIdFile ? (
            <a
              href={user.govtIdFile}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-primary hover:underline"
            >
              Open govt ID file
            </a>
          ) : null}
        </DetailCard>

        <DetailCard title="Activity">
          <FieldGrid
            fields={[
              {
                label: "Last Login Provider",
                value: data.activity.lastLoginProvider || "—"
              },
              { label: "Account Created", value: formatDate(data.activity.accountCreated) },
              { label: "Last Active", value: formatDate(data.activity.lastActive) },
              { label: "Number of Logins", value: data.activity.numberOfLogins },
              { label: "Device Count", value: data.activity.deviceCount },
              { label: "Online Status", value: data.activity.onlineStatus }
            ]}
          />
        </DetailCard>
      </div>

      <DetailCard title="Statistics">
        <FieldGrid
          fields={Object.entries(data.statistics || {}).map(([k, v]) => ({
            label: k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
            value: typeof v === "boolean" ? yesNo(v) : v
          }))}
        />
      </DetailCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard title="Subscription" empty={!data.subscription}>
          {data.subscription ? (
            <FieldGrid
              fields={[
                { label: "Current Plan", value: data.subscription.currentPlan },
                { label: "Status", value: data.subscription.status },
                { label: "Start Date", value: formatDate(data.subscription.startDate) },
                { label: "End Date", value: formatDate(data.subscription.endDate) },
                { label: "Remaining Days", value: data.subscription.remainingDays ?? "—" },
                { label: "Payment Method", value: data.subscription.paymentMethod },
                { label: "Transaction ID", value: data.subscription.transactionId || "—" },
                {
                  label: "Total Amount Paid",
                  value: `₹${((data.subscription.totalAmountPaidPaise || 0) / 100).toFixed(2)}`
                }
              ]}
            />
          ) : null}
        </DetailCard>

        <DetailCard title="Storage Usage">
          <FieldGrid
            fields={[
              { label: "Profile Images", value: formatBytes(storageProfile.profile) },
              { label: "Post Images", value: formatBytes(storageProfile.posts) },
              { label: "Videos", value: formatBytes(storageProfile.videos) },
              { label: "Documents", value: formatBytes(storageProfile.documents) },
              { label: "Total Storage Used", value: formatBytes(storageProfile.total) }
            ]}
          />
        </DetailCard>

        <DetailCard title="Community Information">
          <FieldGrid
            fields={[
              { label: "Community", value: user.community || "—" },
              { label: "Kulam", value: user.kulam || (community?.kulam as string) || "—" },
              { label: "Native Place", value: (community?.nativeVillage as string) || "—" },
              { label: "Native Taluk", value: (community?.nativeTaluk as string) || "—" },
              { label: "Kula Deivam", value: (community?.kulaDeivam as string) || "—" },
              { label: "Current City", value: user.city || (personal?.currentLocation as string) || "—" },
              { label: "Current Country", value: "—" }
            ]}
          />
        </DetailCard>

        <DetailCard title="Roles & Permissions">
          <FieldGrid
            fields={[
              { label: "User Role", value: String(data.roles.userRole || "USER") },
              { label: "Community Role", value: String(data.roles.communityRole || "—") },
              { label: "Admin Access", value: yesNo(data.roles.adminAccess) },
              { label: "Moderator Access", value: yesNo(data.roles.moderatorAccess) },
              { label: "Profile Visibility", value: String(data.roles.profileVisibility || "—") },
              {
                label: "Allow Connection Requests",
                value: yesNo(data.roles.allowConnectionRequests)
              }
            ]}
          />
        </DetailCard>

        <DetailCard title="Security">
          <FieldGrid
            fields={[
              { label: "Failed Login Attempts", value: "—" },
              { label: "Last Password Change", value: "—" },
              { label: "Password Reset Date", value: "—" },
              { label: "Devices", value: data.activity.deviceCount },
              { label: "Sessions", value: "—" },
              { label: "Note", value: String(data.security.note || "") }
            ]}
          />
          {(data.devices?.length ?? 0) > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {data.devices.map((d) => (
                <li key={d.id} className="rounded-lg bg-slate-50 px-3 py-2">
                  {d.platform} · {d.appVersion || "n/a"} · last used {formatDate(d.lastUsedAt)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No devices registered</p>
          )}
        </DetailCard>

        <DetailCard title="App Settings" empty={!data.notificationPreferences}>
          {data.notificationPreferences ? (
            <FieldGrid
              fields={[
                { label: "Language", value: "—" },
                { label: "Theme", value: "—" },
                { label: "Push Notification", value: yesNo(data.notificationPreferences.pushEnabled) },
                { label: "Social", value: yesNo(data.notificationPreferences.socialEnabled) },
                { label: "Matrimony", value: yesNo(data.notificationPreferences.matrimonyEnabled) },
                { label: "Messages", value: yesNo(data.notificationPreferences.messagesEnabled) },
                { label: "Community", value: yesNo(data.notificationPreferences.communityEnabled) },
                { label: "System", value: yesNo(data.notificationPreferences.systemEnabled) },
                {
                  label: "Privacy (visibility)",
                  value: user.profileVisibility || "—"
                }
              ]}
            />
          ) : null}
        </DetailCard>

        <DetailCard title="Matrimony">
          <FieldGrid
            fields={[
              { label: "Profile Status", value: String(data.matrimonyStats.profileStatus || "—") },
              { label: "Interest Sent", value: String(data.matrimonyStats.interestSent ?? "—") },
              {
                label: "Interest Received",
                value: String(data.matrimonyStats.interestReceived ?? "—")
              },
              { label: "Matches", value: String(data.matrimonyStats.matches ?? "—") },
              {
                label: "Blocked Profiles",
                value: String(data.matrimonyStats.blockedProfiles ?? "—")
              },
              { label: "Saved Profiles", value: String(data.matrimonyStats.savedProfiles ?? "—") },
              {
                label: "Subscription",
                value: data.subscription?.currentPlan || "—"
              }
            ]}
          />
        </DetailCard>

        <DetailCard title="Marketplace">
          <FieldGrid
            fields={[
              { label: "Seller Status", value: String(data.marketplaceStats.sellerStatus || "—") },
              { label: "Listings", value: String(data.marketplaceStats.listings ?? "—") },
              { label: "Sold Items", value: String(data.marketplaceStats.soldItems ?? "—") },
              {
                label: "Pending Listings",
                value: String(data.marketplaceStats.pendingListings ?? "—")
              },
              {
                label: "Rejected Listings",
                value: String(data.marketplaceStats.rejectedListings ?? "—")
              }
            ]}
          />
        </DetailCard>

        <DetailCard title="Reports">
          <FieldGrid
            fields={[
              { label: "Reports Against User", value: data.reports.reportsAgainstUser },
              { label: "Reports Submitted", value: data.reports.reportsSubmitted },
              {
                label: "Warnings / Suspensions",
                value: data.reports.moderationActions.length
              }
            ]}
          />
          {data.reports.moderationActions.length ? (
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
              {data.reports.moderationActions.map((a) => (
                <li key={a.id} className="rounded-lg bg-slate-50 px-3 py-2">
                  <span className="font-medium">{a.action}</span> by {a.adminEmail} ·{" "}
                  {formatDate(a.createdAt)}
                  {a.note ? <div className="text-slate-500">{a.note}</div> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No moderation actions</p>
          )}
        </DetailCard>
      </div>

      <DetailCard title="Timeline" empty={!data.timeline?.length}>
        <ol className="relative space-y-4 border-l border-slate-200 pl-6">
          {data.timeline.map((item, idx) => (
            <li key={`${item.at}-${idx}`} className="relative">
              <span className="absolute -left-[1.625rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-white" />
              <div className="text-sm font-medium text-slate-900">{item.label}</div>
              <div className="text-xs text-slate-500">{formatDate(item.at)}</div>
              {item.meta ? <div className="mt-0.5 text-xs text-slate-600">{item.meta}</div> : null}
            </li>
          ))}
        </ol>
      </DetailCard>

      {confirm && (
        <ConfirmModal
          open
          title={
            confirm.type === "hardDelete"
              ? "Hard delete user?"
              : confirm.type === "softDelete"
                ? "Soft delete user?"
                : confirm.type === "restore"
                  ? "Restore user?"
                  : "Confirm action"
          }
          message={
            confirm.type === "hardDelete"
              ? "This permanently deletes the user, all related records, and R2 media. This cannot be undone."
              : confirm.type === "softDelete"
                ? "The account will be marked deleted and blocked from login. Data is retained."
                : `Confirm ${confirm.type} for ${user.fullName}?`
          }
          confirmLabel={confirm.type === "hardDelete" ? "Permanently delete" : "Confirm"}
          variant={
            confirm.type === "hardDelete" || confirm.type === "softDelete" || confirm.type === "reject"
              ? "danger"
              : "default"
          }
          confirmDisabled={confirm.type === "hardDelete" && hardConfirmText !== "DELETE"}
          onCancel={() => {
            setConfirm(null);
            setHardConfirmText("");
          }}
          onConfirm={() => void runAction()}
        >
          {confirm.type === "hardDelete" ? (
            <label className="mt-3 block text-sm">
              <span className="text-slate-600">Type DELETE to confirm</span>
              <input
                className="mt-1 w-full rounded-lg border border-red-300 px-3 py-2"
                value={hardConfirmText}
                onChange={(e) => setHardConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </label>
          ) : null}
        </ConfirmModal>
      )}
    </div>
  );
}
