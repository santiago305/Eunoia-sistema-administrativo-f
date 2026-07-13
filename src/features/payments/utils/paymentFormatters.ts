import type { PaymentRecord, PaymentStatus } from "../types/payment.types";
import { getPaymentStatusView } from "../paymentView";

export function formatPaymentAmount(amount?: number | string | null, currency?: string | null) {
  if (amount === null || amount === undefined || amount === "") return "-";
  const numericAmount = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(numericAmount)) return String(amount);

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: currency || "PEN",
    minimumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatPaymentDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatPaymentStatusLabel(status?: PaymentStatus | null) {
  return getPaymentStatusView(status ?? undefined).label;
}

export function getPaymentAccountLabel(payment: Pick<PaymentRecord, "companyPaymentAccountMaskedLabel" | "companyPaymentAccountId">) {
  return payment.companyPaymentAccountMaskedLabel ?? payment.companyPaymentAccountId ?? "-";
}
