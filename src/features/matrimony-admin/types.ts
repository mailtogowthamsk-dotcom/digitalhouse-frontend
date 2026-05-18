export type MatrimonyWorkflowStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "CHANGES_REQUESTED"
  | "RESUBMITTED";

export type MatrimonyStats = {
  pendingRequests: number;
  approvedProfiles: number;
  rejectedProfiles: number;
  underReview: number;
  newToday: number;
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
  kulam: string;
  submittedAt: string;
  updatedAt: string;
  profileCompletion: number;
  workflowStatus: MatrimonyWorkflowStatus;
  rowStatus: string;
  assignedReviewer: string | null;
  verificationComplete: boolean;
  profilePhotoUrl: string | null;
  submittedForReview: boolean;
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
  gender?: string;
  district?: string;
  kulam?: string;
  ageMin?: number;
  ageMax?: number;
  submittedFrom?: string;
  submittedTo?: string;
  completionMin?: number;
  verificationStatus?: "complete" | "incomplete" | "any";
  search?: string;
  includeDrafts?: boolean;
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

export type MatrimonyRequestDetail = {
  id: number;
  userId: number;
  workflowStatus: MatrimonyWorkflowStatus;
  rowStatus: string;
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
  resubmissionCount?: number;
  photoVerification?: {
    profileFor: string;
    profileForSelf: boolean;
    useAccountProfilePhoto: boolean;
    candidatePhotoStatus: string | null;
    accountOwnerPhoto: string | null;
    matrimonyCandidatePhoto: string | null;
  };
};
