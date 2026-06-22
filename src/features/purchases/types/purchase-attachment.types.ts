export const PurchaseAttachmentTypes = {
  PAYMENT_PROOF: "PAYMENT_PROOF",
  INVOICE: "INVOICE",
  RECEIPT: "RECEIPT",
  QUOTATION: "QUOTATION",
  DELIVERY_NOTE: "DELIVERY_NOTE",
  PRODUCT_PHOTO: "PRODUCT_PHOTO",
  SERVICE_EVIDENCE: "SERVICE_EVIDENCE",
  CONTRACT: "CONTRACT",
  OTHER: "OTHER",
} as const;

export type PurchaseAttachmentType =
  typeof PurchaseAttachmentTypes[keyof typeof PurchaseAttachmentTypes];

export const purchaseAttachmentTypeLabels: Record<PurchaseAttachmentType, string> = {
  PAYMENT_PROOF: "Comprobante de pago",
  INVOICE: "Factura",
  RECEIPT: "Recibo",
  QUOTATION: "Cotización",
  DELIVERY_NOTE: "Guía / entrega",
  PRODUCT_PHOTO: "Foto de producto",
  SERVICE_EVIDENCE: "Evidencia de servicio",
  CONTRACT: "Contrato",
  OTHER: "Otro",
};

export type PurchaseAttachment = {
  attachmentId: string;
  purchaseId: string;
  paymentId: string | null;
  receptionId: string | null;
  type: PurchaseAttachmentType;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  note: string | null;
  uploadedByUserId: string | null;
  createdAt: string | null;
};

export type UploadPurchaseAttachmentPayload = {
  purchaseId: string;
  type: PurchaseAttachmentType;
  file: File;
  paymentId?: string | null;
  receptionId?: string | null;
  note?: string | null;
};

