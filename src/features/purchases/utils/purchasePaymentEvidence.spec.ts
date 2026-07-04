import { describe, expect, it, vi } from "vitest";
import { CurrencyTypes, PaymentTypes } from "@/features/purchases/types/purchaseEnums";
import type { Payment } from "@/features/purchases/types/purchase";
import {
  paymentRequiresEvidence,
  stripPaymentEvidenceFile,
  uploadPaymentEvidenceFiles,
} from "./purchasePaymentEvidence";
import { PurchaseAttachmentTypes } from "@/features/purchases/types/purchase-attachment.types";

const payment = (patch: Partial<Payment> = {}): Payment => ({
  method: PaymentTypes.EFECTIVO,
  date: "2026-07-03",
  operationNumber: "",
  currency: CurrencyTypes.PEN,
  amount: 100,
  note: "",
  ...patch,
});

describe("purchase payment evidence", () => {
  it("requires evidence for non-cash payments only", () => {
    expect(paymentRequiresEvidence(payment({ method: PaymentTypes.EFECTIVO }))).toBe(false);
    expect(paymentRequiresEvidence(payment({ method: "EFECTIVO" }))).toBe(false);
    expect(paymentRequiresEvidence(payment({ method: "BCP" }))).toBe(true);
    expect(paymentRequiresEvidence(payment({ method: "TARJETA" }))).toBe(true);
  });

  it("removes the local file before sending a payment payload", () => {
    const file = new File(["voucher"], "voucher.png", { type: "image/png" });
    const result = stripPaymentEvidenceFile(payment({ method: "BCP", paymentEvidenceFile: file }));

    expect(result).not.toHaveProperty("paymentEvidenceFile");
    expect(result.method).toBe("BCP");
  });

  it("uploads each evidence file using the matching created payment id", async () => {
    const firstFile = new File(["one"], "one.png", { type: "image/png" });
    const secondFile = new File(["two"], "two.png", { type: "image/png" });
    const upload = vi.fn().mockResolvedValue({ type: "success", message: "ok" });

    await uploadPaymentEvidenceFiles({
      purchaseId: "purchase-1",
      draftPayments: [
        payment({ method: "BCP", date: "2026-07-01", amount: 50, operationNumber: "A", paymentEvidenceFile: firstFile }),
        payment({ method: "TARJETA", date: "2026-07-02", amount: 70, operationNumber: "B", paymentEvidenceFile: secondFile }),
      ],
      persistedPayments: [
        payment({ payDocId: "payment-1", method: "BCP", date: "2026-07-01", amount: 50, operationNumber: "A" }),
        payment({ payDocId: "payment-2", method: "TARJETA", date: "2026-07-02", amount: 70, operationNumber: "B" }),
      ],
      upload,
    });

    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenNthCalledWith(1, {
      purchaseId: "purchase-1",
      paymentId: "payment-1",
      type: PurchaseAttachmentTypes.PAYMENT_PROOF,
      file: firstFile,
    });
    expect(upload).toHaveBeenNthCalledWith(2, {
      purchaseId: "purchase-1",
      paymentId: "payment-2",
      type: PurchaseAttachmentTypes.PAYMENT_PROOF,
      file: secondFile,
    });
  });
});
