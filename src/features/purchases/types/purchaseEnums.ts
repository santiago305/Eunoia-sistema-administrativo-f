export const CurrencyTypes = {
  PEN: "PEN",
  USD: "USD",
} as const;

export type CurrencyType = typeof CurrencyTypes[keyof typeof CurrencyTypes];

export const PaymentFormTypes = {
  CONTADO: "CONTADO",
  CREDITO: "CREDITO",
} as const;

export type PaymentFormType = typeof PaymentFormTypes[keyof typeof PaymentFormTypes];

export const PurchaseOrderStatuses = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  PARTIAL: "PARTIAL",
  PENDING_RECEIPT_CONFIRMATION: "PENDING_RECEIPT_CONFIRMATION",
  RECEIVED: "RECEIVED",
  CANCELLED: "CANCELLED",
} as const;

export type PurchaseOrderStatus = typeof PurchaseOrderStatuses[keyof typeof PurchaseOrderStatuses];

export const VoucherDocTypes = {
  FACTURA: "01",
  BOLETA: "03",
  NOTA_VENTA: "NOTA_VENTA",
} as const;

export const AfectType = {
  TAXED: "10",
  EXEMPT: "20",
} as const

export type AfectTypeType = typeof AfectType[keyof typeof AfectType];

export type VoucherDocType = typeof VoucherDocTypes[keyof typeof VoucherDocTypes];

export const PaymentTypes = {
  EFECTIVO: "EFECTIVO",
  TRANSFERENCIA: "TRANSFERENCIA",
  TARJETA: "TARJETA",
  DEPOSITO: "DEPOSITO",
  PLIN: "PLIN",
  YAPE: "YAPE",
} as const;

export type PaymentType = typeof PaymentTypes[keyof typeof PaymentTypes];


