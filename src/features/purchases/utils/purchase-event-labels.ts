export const purchaseEventLabels = {
  CREATED: "Compra creada",
  UPDATED: "Compra actualizada",
  PURCHASE_CREATED: "Compra creada",
  PURCHASE_CREATED_WITH_PAYMENT_PENDING_APPROVAL: "Compra creada con pago pendiente de aprobación",
  PURCHASE_CREATION_APPROVED: "Creación de compra aprobada",
  PURCHASE_CREATION_REJECTED: "Creación de compra rechazada",
  PROCESSING_REQUESTED: "Procesamiento solicitado",
  PROCESSING_APPROVED: "Procesamiento aprobado",
  PROCESSING_REJECTED: "Procesamiento rechazado",
  PAYMENT_REQUESTED: "Pago solicitado",
  PAYMENT_APPROVED: "Pago aprobado",
  PAYMENT_REJECTED: "Pago rechazado",
  PURCHASE_DRAFT_CREATED: "Borrador de compra creado",
  PURCHASE_UPDATED: "Compra actualizada",
  PURCHASE_SUBMITTED: "Compra enviada",
  PURCHASE_APPROVED: "Compra aprobada",
  PURCHASE_REJECTED: "Compra rechazada",
  PURCHASE_CANCELLED: "Compra cancelada",
  PURCHASE_ITEM_ADDED: "Item agregado",
  PURCHASE_ITEM_UPDATED: "Item actualizado",
  PURCHASE_ITEM_REMOVED: "Item eliminado",
  PURCHASE_DOCUMENT_ATTACHED: "Documento adjuntado",
  PURCHASE_DOCUMENT_DELETED: "Documento eliminado",
  PURCHASE_ATTACHMENT_UPLOADED: "Documento subido",
  PURCHASE_ATTACHMENT_DELETED: "Documento eliminado",
  PURCHASE_RECEPTION_CREATED: "Recepción creada",
  PURCHASE_PARTIALLY_RECEIVED: "Compra recibida parcialmente",
  PURCHASE_FULLY_RECEIVED: "Compra recibida completamente",
  PURCHASE_STOCK_ENTRY_CREATED: "Ingreso de stock creado",
  PURCHASE_SERVICE_CONFIRMED: "Servicio confirmado",
  PURCHASE_EXTRA_TIME_ADDED: "Tiempo extra agregado",
  PURCHASE_QUOTA_CREATED: "Cuota creada",
  PURCHASE_QUOTA_DELETED: "Cuota eliminada",
  PAYABLE_CREATED: "Cuenta por pagar creada",
  PAYABLE_UPDATED: "Cuenta por pagar actualizada",
  PAYABLE_OVERDUE: "Cuenta por pagar vencida",
  PAYMENT_SCHEDULED: "Pago programado",
  PAYMENT_REGISTERED: "Pago registrado",
  PAYMENT_EVIDENCE_ATTACHED: "Evidencia de pago adjuntada",
  PAYMENT_DELETED: "Pago eliminado",
} as const;

export type PurchaseEventType = keyof typeof purchaseEventLabels;

export type PurchaseEventDiffRow = {
  field: string;
  before: string;
  after: string;
};

export const purchaseEventFilterOptions = Object.entries(purchaseEventLabels).map(
  ([value, label]) => ({ value, label }),
);

export function getPurchaseEventLabel(eventType?: string | null) {
  if (!eventType) return "Evento";
  return purchaseEventLabels[eventType as PurchaseEventType] ?? eventType;
}

function stringifyDiffValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "-";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getPurchaseEventDiffRows(
  oldValues?: Record<string, unknown> | null,
  newValues?: Record<string, unknown> | null,
): PurchaseEventDiffRow[] {
  if (!isPlainObject(oldValues) && !isPlainObject(newValues)) return [];

  const before = isPlainObject(oldValues) ? oldValues : {};
  const after = isPlainObject(newValues) ? newValues : {};
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  return keys
    .filter((key) => stringifyDiffValue(before[key]) !== stringifyDiffValue(after[key]))
    .map((key) => ({
      field: key,
      before: stringifyDiffValue(before[key]),
      after: stringifyDiffValue(after[key]),
    }));
}
