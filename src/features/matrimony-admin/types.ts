export type MatrimonyWorkflowStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "CHANGES_REQUESTED"
  | "RESUBMITTED";

export type MatrimonyAdminRequestType =
  | "NEW_APPLICATION"
  | "PROFILE_UPDATE"
  | "RESUBMISSION"
  | "CHANGE_REQUEST_RESPONSE";

export type MatrimonyStats = {
  pendingRequests: number;
  approvedProfiles: number;
  rejectedProfiles: number;
  underReview: number;
  newToday: number;
  totalInterests: number;
  mutualMatches: number;
  pendingReports: number;
};

export type MatrimonyRequestListItem = {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  mobile: string | null;
  gender: string | null;
  age: number | null;
  district: string;
  community?: string;
  kulam: string;
  submittedAt: string;
  updatedAt: string;
  profileCompletion: number;
  workflowStatus: MatrimonyWorkflowStatus;
  requestType?: MatrimonyAdminRequestType;
  rowStatus: string;
  assignedReviewer: string | null;
  reviewedBy?: string | null;
  verificationComplete: boolean;
  profilePhotoUrl: string | null;
  applicantPhotoUrl?: string | null;
  candidatePhotoUrl?: string | null;
  candidateName?: string;
  candidateGender?: string | null;
  candidateAge?: number | null;
  candidateDistrict?: string;
  candidateOccupation?: string | null;
  candidateMaritalStatus?: string | null;
  fieldChangeCount?: number;
  pendingSinceDays?: number;
  registeredAt?: string | null;
  submittedForReview: boolean;
  adminDecision?: string;
  applicationVersion?: number;
  applicationCount?: number;
  isCurrent?: boolean;
  subscriptionPlan?: string | null;
};

export type MatrimonyListResponse = {
  items: MatrimonyRequestListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type MatrimonyListFilters = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  workflowStatus?: string;
  requestType?: MatrimonyAdminRequestType | string;
  gender?: string;
  district?: string;
  kulam?: string;
  community?: string;
  ageMin?: number;
  ageMax?: number;
  submittedFrom?: string;
  submittedTo?: string;
  period?: "today" | "week" | "month";
  completionMin?: number;
  verificationStatus?: "complete" | "incomplete" | "any";
  search?: string;
  includeDrafts?: boolean;
  pendingReviewOnly?: boolean;
  waitingOverDays?: number;
  subscriptionPlan?: string;
  versionMin?: number;
};

export type VerificationState = Record<
  string,
  { checked: boolean; by?: string; at?: string } | undefined
>;

export type MatrimonyNote = {
  id: number;
  noteType: string;
  content: string;
  createdBy: string;
  createdAt: string;
};

export type MatrimonyAuditEntry = {
  id: number;
  action: string;
  payload: Record<string, unknown> | null;
  createdBy: string;
  createdAt: string;
};

export type MatrimonyLifecycleStatus = "ACTIVE" | "PAUSED" | "CLOSED" | null;

export type MatrimonyPresenceInfo = {
  online: boolean;
  lastSeenAt: string | null;
  label: string;
  lastSeenVisibility?: string;
};

export type MatrimonyRequestDetail = {
  id: number;
  userId: number;
  workflowStatus: MatrimonyWorkflowStatus;
  requestType?: MatrimonyAdminRequestType;
  rowStatus: string;
  /** Approved-profile lifecycle (ACTIVE / PAUSED / CLOSED); null if not approved yet. */
  lifecycleStatus?: MatrimonyLifecycleStatus;
  presence?: MatrimonyPresenceInfo;
  submittedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  adminRemarks: string | null;
  submittedForReview: boolean;
  profileCompletion: number;
  missingFields: string[];
  assignedReviewer: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  rejectionComment: string | null;
  verification: VerificationState;
  suspended: boolean;
  user: Record<string, unknown>;
  applicant?: {
    id: number;
    fullName: string | null;
    photoUrl: string | null;
    mobile: string | null;
    email: string | null;
    registeredAt: string | null;
    community: string | null;
    district: string | null;
  };
  candidate?: {
    name: string;
    photoUrl: string | null;
    age: number | null;
    gender: string | null;
    district: string | null;
    occupation: string | null;
    kulam: string | null;
    maritalStatus: string | null;
    lookingFor: string | null;
  };
  reviewActors?: {
    assignedReviewer: string | null;
    reviewedBy: string | null;
    changeRequestedBy: string | null;
    changeRequestedAt: string | null;
    reviewedAt: string | null;
  };
  personal: Record<string, unknown> | null;
  community: Record<string, unknown> | null;
  family: Record<string, unknown> | null;
  matrimonyPending: Record<string, unknown> | null;
  matrimonyApproved: Record<string, unknown> | null;
  partnerPreferencesDisplay: Record<string, unknown>;
  notes: MatrimonyNote[];
  auditLog: MatrimonyAuditEntry[];
  rejectionReasons: { code: string; label: string }[];
  changeRequest?: {
    comment: string;
    sections: string[];
    requestedAt: string;
    requestedBy: string;
  } | null;
  submissionSnapshot?: Record<string, unknown> | null;
  fieldChanges?: { field: string; oldValue: unknown; newValue: unknown }[];
  approvedFieldChanges?: { field: string; oldValue: unknown; newValue: unknown }[];
  fieldChangeCount?: number;
  resubmissionCount?: number;
  photoVerification?: {
    profileFor: string;
    profileForSelf: boolean;
    useAccountProfilePhoto: boolean;
    candidatePhotoStatus: string | null;
    accountOwnerPhoto: string | null;
    matrimonyCandidatePhoto: string | null;
  };
  applicationVersion?: number;
  applicationCount?: number;
  isCurrent?: boolean;
  pendingSinceDays?: number | null;
  applicationHistory?: MatrimonyApplicationVersion[];
  timeline?: MatrimonyTimelineEvent[];
};

export type MatrimonyApplicationVersion = {
  id: number;
  applicationVersion: number;
  isCurrent: boolean;
  workflowStatus: MatrimonyWorkflowStatus;
  rowStatus: string;
  submittedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  adminRemarks: string | null;
  assignedReviewer: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  rejectionComment: string | null;
  changeRequest?: {
    comment: string;
    sections: string[];
    requestedAt: string;
    requestedBy: string;
  } | null;
  resubmissionCount: number;
  submittedForReview: boolean;
  adminDecision: string;
  notes: MatrimonyNote[];
};

export type MatrimonyTimelineEvent = {
  at: string;
  type: string;
  label: string;
  actor: string | null;
  applicationVersion: number | null;
  meta?: string | null;
};
