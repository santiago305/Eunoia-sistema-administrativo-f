import {
  purchaseItemTypeLabels,
  purchaseTypeLabels,
  PurchasePaymentStatuses,
  PurchaseTypes,
  type PurchaseItemType,
  type PurchasePaymentStatus,
  type PurchaseType,
} from "@/features/purchases/types/purchase-classification.types";

const paymentStatusLabels: Record<PurchasePaymentStatus, string> = {
  [PurchasePaymentStatuses.PENDING]: "Pendiente",
  [PurchasePaymentStatuses.PARTIAL]: "Parcial",
  [PurchasePaymentStatuses.PAID]: "Pagado",
  [PurchasePaymentStatuses.OVERDUE]: "Vencido",
  [PurchasePaymentStatuses.CANCELLED]: "Cancelado",
};

const knownLabelCorrections: Record<string, string> = {
  "Sin metodo": "Sin método",
};

export function formatPurchaseDashboardSeriesLabel(label: string | null | undefined) {
  const value = label ?? "";
  if (isPurchaseType(value)) return purchaseTypeLabels[value];
  if (isPaymentStatus(value)) return paymentStatusLabels[value];
  return knownLabelCorrections[value] ?? humanizeCode(value);
}

export function formatPurchaseDashboardPaymentStatus(status: string | null | undefined) {
  const value = status ?? "";
  if (isPaymentStatus(value)) return paymentStatusLabels[value];
  return knownLabelCorrections[value] ?? humanizeCode(value);
}

export function formatPurchaseDashboardItemType(itemType: string | null | undefined) {
  const value = itemType ?? "";
  if (isPurchaseItemType(value)) return purchaseItemTypeLabels[value];
  return knownLabelCorrections[value] ?? humanizeCode(value);
}

function isPurchaseType(value: string): value is PurchaseType {
  return Object.values(PurchaseTypes).includes(value as PurchaseType);
}

function isPurchaseItemType(value: string): value is PurchaseItemType {
  return Object.prototype.hasOwnProperty.call(purchaseItemTypeLabels, value);
}

function isPaymentStatus(value: string): value is PurchasePaymentStatus {
  return Object.values(PurchasePaymentStatuses).includes(value as PurchasePaymentStatus);
}

function humanizeCode(value: string) {
  const normalized = value.trim().replace(/_/g, " ").toLowerCase();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Sin clasificar";
}
