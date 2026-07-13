import type { Payment } from "@/features/purchases/types/purchase";
import type { ListPaymentsResponse } from "@/shared/services/paymentService";

export type PaymentRecord = Payment;

export type PaymentStatus = NonNullable<Payment["status"]>;

export type PaymentListResponse = ListPaymentsResponse;
