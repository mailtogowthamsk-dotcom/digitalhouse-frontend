import type { MatrimonyWorkflowStatus } from "./types";

export const WORKFLOW_LABELS: Record<MatrimonyWorkflowStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
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
  UNDER_REVIEW: "bg-blue-100 text-blue-900",
  APPROVED: "bg-emerald-100 text-emerald-900",
  REJECTED: "bg-red-100 text-red-900",
  SUSPENDED: "bg-purple-100 text-purple-900",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-900",
  RESUBMITTED: "bg-indigo-100 text-indigo-900"
};

export const MATRIMONY_FIELD_LABELS: Record<string, string> = {
  lookingFor: "Looking for",
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
  fatherOccupation: "Father occupation",
  numberOfSiblings: "Siblings",
  brothersCount: "Brothers",
  sistersCount: "Sisters",
  partnerAgeMin: "Partner age min",
  partnerAgeMax: "Partner age max",
  preferredDistrictIds: "Preferred districts",
  preferredKulamIds: "Preferred kulams",
  partnerPreferences: "Partner preferences",
  horoscopeDocumentUrl: "Horoscope"
};

export const VERIFICATION_LABELS: Record<string, string> = {
  genuineCommunityMember: "Genuine community member",
  kulamVerified: "Kulam verified",
  horoscopeVerified: "Horoscope verified",
  familyVerified: "Family verified",
  profileQualityApproved: "Profile quality approved"
};
