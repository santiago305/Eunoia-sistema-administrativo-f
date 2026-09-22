import type { PaymentMethod } from "@/features/payment-methods/types/paymentMethod";
import { PaymentTypes } from "@/features/purchases/types/purchaseEnums";
import type { Payment } from "@/features/purchases/types/purchase";

export type PaymentStatus = NonNullable<Payment["status"]>;

export const getPaymentStatusView = (status: Payment["status"]) => {
  if (status === "VOIDED") return { label: "Anulado", className: "bg-slate-100 text-slate-700 border-slate-300" };
  if (status === "DRAFT") return { label: "Borrador", className: "bg-zinc-100 text-zinc-700 border-zinc-300" };
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
    label: status === "POSTED" ? "Contabilizado" : status === "APPROVED" ? "Aprobado" : "Pendiente",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
};

export const canShowPaymentApprovalActions = (
  status: Payment["status"],
  canApprovePayment: boolean,
) => canApprovePayment && (status === "PENDING_APPROVAL" || status === "SCHEDULED");

export const canShowPaymentDeleteAction = (canManagePayments: boolean, status?: Payment["status"]) =>
  canManagePayments && (status === "DRAFT" || status === "REJECTED" || status === "PENDING_APPROVAL" || status === "SCHEDULED");

export const hasPaymentEvidence = (payment: Pick<Payment, "paymentEvidenceFileId" | "paymentEvidenceCount" | "hasEvidence">) =>
  Boolean(payment.hasEvidence || payment.paymentEvidenceFileId || Number(payment.paymentEvidenceCount ?? 0) > 0);

export const getPaymentMethodOptions = (
  records?: PaymentMethod[] | null,
  options?: { fallbackToDefaults?: boolean },
) => {
  const activeRecords = (records ?? []).filter((method) => method.isActive);

  if (activeRecords.length > 0) {
    return activeRecords.map((method) => ({
      value: method.name,
      label: method.name,
      requiresVoucher: method.requiresVoucher,
    }));
  }

  if (options?.fallbackToDefaults === false) return [];

  return Object.values(PaymentTypes).map((method) => ({
    value: method,
    label: method,
  }));
};
