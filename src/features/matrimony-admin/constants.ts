import type { MatrimonyWorkflowStatus } from "./types";

export type MatrimonyAdminRequestType =
  | "NEW_APPLICATION"
  | "PROFILE_UPDATE"
  | "RESUBMISSION"
  | "CHANGE_REQUEST_RESPONSE";

export const WORKFLOW_LABELS: Record<MatrimonyWorkflowStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Pending",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  CHANGES_REQUESTED: "Changes Requested",
  RESUBMITTED: "Resubmitted"
};

export const WORKFLOW_COLORS: Record<MatrimonyWorkflowStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-amber-100 text-amber-900",
  UNDER_REVIEW: "bg-sky-100 text-sky-900",
  APPROVED: "bg-emerald-100 text-emerald-900",
  REJECTED: "bg-red-100 text-red-900",
  SUSPENDED: "bg-violet-100 text-violet-900",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-900",
  RESUBMITTED: "bg-purple-100 text-purple-900"
};

export const REQUEST_TYPE_LABELS: Record<MatrimonyAdminRequestType, string> = {
  NEW_APPLICATION: "New Application",
  PROFILE_UPDATE: "Profile Update",
  RESUBMISSION: "Resubmission",
  CHANGE_REQUEST_RESPONSE: "Change Request Response"
};

export const REQUEST_TYPE_COLORS: Record<MatrimonyAdminRequestType, string> = {
  NEW_APPLICATION: "bg-blue-100 text-blue-900 ring-1 ring-blue-200",
  PROFILE_UPDATE: "bg-orange-100 text-orange-900 ring-1 ring-orange-200",
  RESUBMISSION: "bg-purple-100 text-purple-900 ring-1 ring-purple-200",
  CHANGE_REQUEST_RESPONSE: "bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200"
};

export const MATRIMONY_FIELD_LABELS: Record<string, string> = {
  lookingFor: "Looking for",
  candidateName: "Candidate name",
  partnerGenderPreference: "Partner gender",
  candidatePhotoUrl: "Bride/groom photo",
  profilePhotoUrl: "Bride/groom photo (legacy)",
  height: "Height",
  complexion: "Complexion",
  motherTongue: "Mother tongue",
  aboutMe: "About me",
  gotra: "Gotra",
  kulamSnapshot: "Kulam",
  education: "Education",
  occupation: "Occupation",
  employer: "Employer",
  annualIncome: "Income range",
  maritalStatus: "Marital status",
  rashi: "Rashi",
  nakshatram: "Nakshatram",
  dosham: "Dosham",
  familyType: "Family type",
  familyStatus: "Family status",
  motherName: "Mother name",
  fatherName: "Father name",
  fatherOccupation: "Father occupation",
  numberOfSiblings: "Siblings",
  brothersCount: "Brothers",
  sistersCount: "Sisters",
  partnerAgeMin: "Partner age min",
  partnerAgeMax: "Partner age max",
  preferredDistrictIds: "Preferred districts",
  preferredKulamIds: "Preferred kulams",
  partnerPreferences: "Partner preferences",
  horoscopeDocumentUrl: "Horoscope",
  useAccountProfilePhoto: "Use account photo",
  candidatePhotoStatus: "Photo status"
};

export const VERIFICATION_LABELS: Record<string, string> = {
  genuineCommunityMember: "Genuine community member",
  kulamVerified: "Kulam verified",
  horoscopeVerified: "Horoscope verified",
  familyVerified: "Family verified",
  profileQualityApproved: "Profile quality approved"
};

export function formatTimeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 60) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
