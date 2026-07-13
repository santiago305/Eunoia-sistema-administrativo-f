import type { PaymentMethod } from "@/features/payment-methods/types/paymentMethod";
import { PaymentTypes } from "@/features/purchases/types/purchaseEnums";
import type { Payment } from "@/features/purchases/types/purchase";

export type PaymentStatus = NonNullable<Payment["status"]>;

export const getPaymentStatusView = (status: Payment["status"]) => {
  if (status === "PENDING_APPROVAL") {
    return {
      label: "Pendiente",
      className: "bg-amber-100 text-amber-700 border-amber-200",
    };
  }

  if (status === "SCHEDULED") {
    return {
      label: "Programado",
      className: "bg-sky-100 text-sky-700 border-sky-200",
    };
  }

  if (status === "REJECTED") {
    return {
      label: "Rechazado",
      className: "bg-rose-100 text-rose-700 border-rose-200",
    };
  }

  return {
    label: "Aprobado",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
};

export const canShowPaymentApprovalActions = (
  status: Payment["status"],
  canApprovePayment: boolean,
) => canApprovePayment && (status === "PENDING_APPROVAL" || status === "SCHEDULED");

export const canShowPaymentDeleteAction = (canManagePayments: boolean) => canManagePayments;

export const hasPaymentEvidence = (payment: Pick<Payment, "paymentEvidenceFileId" | "paymentEvidenceCount" | "hasEvidence">) =>
  Boolean(payment.hasEvidence || payment.paymentEvidenceFileId || Number(payment.paymentEvidenceCount ?? 0) > 0);

export const getPaymentMethodOptions = (records?: PaymentMethod[] | null) => {
  const activeRecords = (records ?? []).filter((method) => method.isActive);

  if (activeRecords.length > 0) {
    return activeRecords.map((method) => ({
      value: method.name,
      label: method.name,
      requiresVoucher: method.requiresVoucher,
    }));
  }

  return Object.values(PaymentTypes).map((method) => ({
    value: method,
    label: method,
  }));
};
