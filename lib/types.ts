import type { ProviderCategoryId } from "@/lib/config";

export type Role = "CUSTOMER" | "PROVIDER" | "ADMIN";

export type VerificationStatus = "UNSUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isOnline?: boolean;
  avgRating?: number | null;
  verificationStatus?: VerificationStatus;
  rejectionReason?: string | null;
  providerCategory?: ProviderCategoryId | null;
};

export type BookingStatus =
  | "PENDING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_PROVIDERS_AVAILABLE";

export type PaymentStatus = "UNPAID" | "PENDING" | "PAID" | "FAILED";
export type PayoutStatus = "NOT_STARTED" | "PENDING" | "PAID" | "FAILED";

export type Booking = {
  id: string;
  customerId: string;
  providerId: string | null;
  status: BookingStatus;
  category: ProviderCategoryId;
  serviceType: string;
  address: string;
  customerLat: number;
  customerLng: number;
  propertyType: string | null;
  hours: number | null;
  quantity: number | null;
  estimatedHours: number;
  price: number;
  notes: string | null;
  paymentStatus: PaymentStatus;
  paymongoCheckoutUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  customer?: { id: string; name: string };
  provider?: {
    id: string;
    name: string;
    lastLat?: number | null;
    lastLng?: number | null;
    lastLocationAt?: string | null;
  } | null;
  transaction?: Transaction | null;
  rating?: Rating | null;
};

export type Transaction = {
  id: string;
  bookingId: string;
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  providerPayout: number;
  payoutStatus: PayoutStatus;
  payoutError: string | null;
  payoutAt: string | null;
  createdAt: string;
};

export type Rating = {
  id: string;
  bookingId: string;
  stars: number;
  comment: string | null;
};
