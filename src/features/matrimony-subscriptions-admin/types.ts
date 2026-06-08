export type SubscriptionOverview = {
  totalSubscribers: number;
  activeSubscribers: number;
  expiredSubscribers: number;
  todayRevenueInr: number;
  monthRevenueInr: number;
  totalRevenueInr: number;
  paymentFailureRate: number;
  renewalRate: number;
  subscriptionGrowth30d: number;
};

export type SubscriptionListFilters = {
  page?: number;
  limit?: number;
  q?: string;
  subscriptionStatus?: "any" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  paymentStatus?: "any" | "CREATED" | "PAID" | "FAILED";
  plan?: "any" | "GOLD" | "PLATINUM";
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  sortDir?: "asc" | "desc";
};

export type SubscriptionListItem = {
  subscriptionId: number;
  userId: number;
  userName: string;
  mobile: string | null;
  matrimonyProfileName: string;
  plan: string;
  planLabel: string;
  amountPaise: number | null;
  amountInr: number | null;
  paymentStatus: string;
  subscriptionStatus: string;
  startsAt: string;
  endsAt: string;
  paymentDate: string | null;
  paymentId: string | null;
  razorpayOrderId: string | null;
  paymentOrderId: number | null;
};

export type PaymentListItem = {
  orderId: number;
  userId: number;
  userName: string;
  matrimonyProfileName: string;
  mobile: string | null;
  type: string;
  planLabel: string;
  amountPaise: number;
  amountInr: number;
  gstInr: number | null;
  paymentGateway: string;
  transactionId: string | null;
  razorpayPaymentId: string | null;
  razorpayOrderId: string;
  paymentDate: string;
  status: string;
  refundedAt: string | null;
  refundNote: string | null;
};

export type RevenueReports = {
  byMonth: { month: string; revenueInr: number; orderCount: number }[];
  byPlan: { plan: string; label: string; revenueInr: number; count: number }[];
  activeSubscribers: number;
  paymentFailureRate: number;
};

export type SubscriptionDetail = {
  subscription: {
    id: number;
    userId: number;
    plan: string;
    planLabel: string;
    subscriptionStatus: string;
    startsAt: string;
    endsAt: string;
    amountPaise: number | null;
    amountInr: number | null;
    paymentId: string | null;
    razorpayOrderId: string | null;
    paymentOrderId: number | null;
    durationMonths: number;
  };
  user: {
    id: number;
    fullName: string;
    email: string;
    mobile: string | null;
    district: string | null;
    status: string;
  } | null;
  matrimonyProfileName: string | null;
  primaryPayment: {
    orderId: number;
    status: string;
    amountInr: number;
    razorpayOrderId: string;
    razorpayPaymentId: string | null;
    createdAt: string;
    paidAt: string | null;
    meta: unknown;
  } | null;
  paymentTimeline: {
    orderId: number;
    purpose: string;
    status: string;
    amountInr: number;
    razorpayOrderId: string;
    razorpayPaymentId: string | null;
    createdAt: string;
    paidAt: string | null;
    refundedAt: string | null;
    refundNote: string | null;
  }[];
  renewalHistory: {
    subscriptionId: number;
    plan: string;
    planLabel: string;
    status: string;
    startsAt: string;
    endsAt: string;
    amountInr: number | null;
    paymentId: string | null;
  }[];
  paymentAttempts: unknown[];
  refundHistory: unknown[];
};
