import { describe, expect, it } from "vitest";
import { CurrencyTypes, PaymentFormTypes, PaymentTypes, PurchaseOrderStatuses, VoucherDocTypes } from "@/features/purchases/types/purchaseEnums";
import type { PurchaseAttachment } from "@/features/purchases/types/purchase-attachment.types";
import type { PurchaseOrderDetailOutput } from "@/features/purchases/types/itemPurchaseEdit";
import type { SummaryPurchase } from "@/features/purchases/types/purchaseDetails";
import { buildPurchaseExtendedDetailsConfig } from "./purchaseDetailsMapper";

const purchase: SummaryPurchase = {
  poId: "purchase-1",
  supplierId: "supplier-1",
  warehouseId: "warehouse-1",
  documentType: VoucherDocTypes.FACTURA,
  serie: "F001",
  correlative: 1,
  currency: CurrencyTypes.PEN,
  status: PurchaseOrderStatuses.RECEIVED,
  purchaseType: "INVENTORY",
  paymentForm: "CONTADO",
  totalTaxed: 100,
  totalExempted: 0,
  totalIgv: 18,
  purchaseValue: 100,
  total: 100,
  totalPaid: 100,
  totalToPay: 0,
  supplierLabel: "Proveedor",
  warehouseLabel: "Almacen",
  statusLabel: "Recibido",
  docLabel: "Factura",
  numero: "F001-1",
  date: "04/07/2026",
  dateEnter: "04/07/2026",
};

const attachment = (paymentId: string, filename: string): PurchaseAttachment => ({
  attachmentId: `attachment-${paymentId}`,
  purchaseId: "purchase-1",
  paymentId,
  receptionId: null,
  type: "PAYMENT_PROOF",
  filename,
  originalName: filename,
  mimeType: "image/webp",
  sizeBytes: 1200,
  url: `purchase-attachments/purchase-1/${filename}`,
  note: null,
  uploadedByUserId: null,
  createdAt: "2026-07-04T10:00:00.000Z",
});

describe("purchase details mapper", () => {
  it("keeps each payment proof image attached to its own payment", () => {
    const detail: PurchaseOrderDetailOutput = {
      ...purchase,
      paymentForm: PaymentFormTypes.CONTADO,
      items: [],
      payments: [
        { payDocId: "payment-1", method: PaymentTypes.TRANSFERENCIA, date: "2026-07-01", currency: CurrencyTypes.PEN, amount: 25, operationNumber: "OP-1" },
        { payDocId: "payment-2", method: PaymentTypes.TRANSFERENCIA, date: "2026-07-02", currency: CurrencyTypes.PEN, amount: 25, operationNumber: "OP-2" },
        { payDocId: "payment-3", method: PaymentTypes.TRANSFERENCIA, date: "2026-07-03", currency: CurrencyTypes.PEN, amount: 25, operationNumber: "OP-3" },
        { payDocId: "payment-4", method: PaymentTypes.TRANSFERENCIA, date: "2026-07-04", currency: CurrencyTypes.PEN, amount: 25, operationNumber: "OP-4" },
      ],
      quotas: [],
    };

    const config = buildPurchaseExtendedDetailsConfig({
      purchase,
      detail,
      canViewPayments: true,
      paymentProofAttachments: [
        attachment("payment-1", "voucher-1.webp"),
        attachment("payment-2", "voucher-2.webp"),
        attachment("payment-3", "voucher-3.webp"),
        attachment("payment-4", "voucher-4.webp"),
      ],
      canAdminUploadMissingPhoto: false,
      uploadingPhoto: false,
      onUploadImage: () => {},
    });

    expect(config.payments?.map((payment) => payment.id)).toEqual([
      "payment-1",
      "payment-2",
      "payment-3",
      "payment-4",
    ]);
    expect(config.payments?.map((payment) => payment.evidenceCount)).toEqual([1, 1, 1, 1]);
    expect(config.payments?.map((payment) => payment.evidenceImages)).toEqual([
      ["http://localhost:3000/purchase-attachments/purchase-1/voucher-1.webp"],
      ["http://localhost:3000/purchase-attachments/purchase-1/voucher-2.webp"],
      ["http://localhost:3000/purchase-attachments/purchase-1/voucher-3.webp"],
      ["http://localhost:3000/purchase-attachments/purchase-1/voucher-4.webp"],
    ]);
  });

  it("keeps payment proof URLs available even when backend omits image metadata", () => {
    const detail: PurchaseOrderDetailOutput = {
      ...purchase,
      paymentForm: PaymentFormTypes.CONTADO,
      items: [],
      payments: [
        { payDocId: "payment-1", method: PaymentTypes.TRANSFERENCIA, date: "2026-07-01", currency: CurrencyTypes.PEN, amount: 25, operationNumber: "OP-1" },
        { payDocId: "payment-2", method: PaymentTypes.TRANSFERENCIA, date: "2026-07-02", currency: CurrencyTypes.PEN, amount: 25, operationNumber: "OP-2" },
      ],
      quotas: [],
    };

    const config = buildPurchaseExtendedDetailsConfig({
      purchase,
      detail,
      canViewPayments: true,
      paymentProofAttachments: [
        {
          ...attachment("payment-1", "asset-payment-1"),
          mimeType: "",
          url: "assets/payment-proof-1",
        },
        {
          ...attachment("payment-2", "asset-payment-2"),
          mimeType: "application/octet-stream",
          url: "assets/payment-proof-2",
        },
      ],
      canAdminUploadMissingPhoto: false,
      uploadingPhoto: false,
      onUploadImage: () => {},
    });

    expect(config.payments?.map((payment) => payment.evidenceCount)).toEqual([1, 1]);
    expect(config.payments?.map((payment) => payment.evidenceImages)).toEqual([
      ["http://localhost:3000/assets/payment-proof-1"],
      ["http://localhost:3000/assets/payment-proof-2"],
    ]);
  });
});
