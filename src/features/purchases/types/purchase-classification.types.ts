export const PurchaseTypes = {
  INVENTORY: "INVENTORY",
  RAW_MATERIAL: "RAW_MATERIAL",
  INTERNAL_MATERIAL: "INTERNAL_MATERIAL",
  FIXED_ASSET: "FIXED_ASSET",
  SERVICE: "SERVICE",
  SUBSCRIPTION: "SUBSCRIPTION",
  MIXED: "MIXED",
} as const;

export type PurchaseType = typeof PurchaseTypes[keyof typeof PurchaseTypes];

export const PurchaseItemTypes = {
  PRODUCT: "PRODUCT",
  RAW_MATERIAL: "RAW_MATERIAL",
  INTERNAL_MATERIAL: "INTERNAL_MATERIAL",
  FIXED_ASSET: "FIXED_ASSET",
  SERVICE: "SERVICE",
  SUBSCRIPTION: "SUBSCRIPTION",
} as const;

export type PurchaseItemType = typeof PurchaseItemTypes[keyof typeof PurchaseItemTypes];

export const ReceptionStatuses = {
  NOT_REQUIRED: "NOT_REQUIRED",
  PENDING: "PENDING",
  PARTIALLY_RECEIVED: "PARTIALLY_RECEIVED",
  RECEIVED: "RECEIVED",
} as const;

export type ReceptionStatus = typeof ReceptionStatuses[keyof typeof ReceptionStatuses];

export const PurchasePaymentStatuses = {
  PENDING: "PENDING",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
} as const;

export type PurchasePaymentStatus = typeof PurchasePaymentStatuses[keyof typeof PurchasePaymentStatuses];

export const purchaseTypeLabels: Record<PurchaseType, string> = {
  INVENTORY: "Stock comercial",
  RAW_MATERIAL: "Materia prima",
  INTERNAL_MATERIAL: "Material interno",
  FIXED_ASSET: "Activo fijo",
  SERVICE: "Servicio",
  SUBSCRIPTION: "Suscripción",
  MIXED: "Mixta",
};

export const purchaseItemTypeLabels: Record<PurchaseItemType, string> = {
  PRODUCT: "Producto",
  RAW_MATERIAL: "Materia prima",
  INTERNAL_MATERIAL: "Material interno",
  FIXED_ASSET: "Activo fijo",
  SERVICE: "Servicio",
  SUBSCRIPTION: "Suscripción",
};

export const purchaseTypesWithoutStock: PurchaseType[] = [
  PurchaseTypes.SERVICE,
  PurchaseTypes.SUBSCRIPTION,
];

export const purchaseItemTypesWithoutStock: PurchaseItemType[] = [
  PurchaseItemTypes.SERVICE,
  PurchaseItemTypes.SUBSCRIPTION,
];
