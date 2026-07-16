import type { Payment } from "@/features/purchases/types/purchase";
import {
  PurchaseAttachmentTypes,
  type UploadPurchaseAttachmentPayload,
} from "@/features/purchases/types/purchase-attachment.types";

type UploadPaymentEvidenceParams = {
  purchaseId: string;
  draftPayments: Payment[];
  persistedPayments: Payment[];
  upload: (payload: UploadPurchaseAttachmentPayload) => Promise<unknown>;
};

const normalize = (value?: string | null) => (value ?? "").trim().toUpperCase();

export const paymentRequiresEvidence = (payment: Pick<Payment, "method">) => {
  const method = normalize(payment.method);
  return Boolean(method) && method !== "EFECTIVO";
};

export const stripPaymentEvidenceFile = (payment: Payment): Payment => {
  const payload = { ...payment };
  delete payload.paymentEvidenceFile;
  return payload;
};

const sameMoney = (left?: number | null, right?: number | null) =>
  Number(left ?? 0).toFixed(2) === Number(right ?? 0).toFixed(2);

const sameDate = (left?: string | null, right?: string | null) =>
  (left ?? "").slice(0, 10) === (right ?? "").slice(0, 10);

const findMatchingPayment = (
  draft: Payment,
  persistedPayments: Payment[],
  usedIds: Set<string>,
) => {
  const match = persistedPayments.find((persisted) => {
    if (!persisted.payDocId || usedIds.has(persisted.payDocId)) return false;
    return (
      normalize(persisted.method) === normalize(draft.method) &&
      sameDate(persisted.date, draft.date) &&
      sameMoney(persisted.amount, draft.amount) &&
      normalize(persisted.operationNumber) === normalize(draft.operationNumber)
    );
  });

  if (match?.payDocId) usedIds.add(match.payDocId);
  return match;
};

export const uploadPaymentEvidenceFiles = async ({
  purchaseId,
  draftPayments,
  persistedPayments,
  upload,
}: UploadPaymentEvidenceParams) => {
  const usedIds = new Set<string>();

  for (const draft of draftPayments) {
    if (!draft.paymentEvidenceFile) continue;
    const persisted = findMatchingPayment(draft, persistedPayments, usedIds);
    if (!persisted?.payDocId) {
      throw new Error("No se pudo asociar el comprobante al pago registrado.");
    }

    await upload({
      purchaseId,
      paymentId: persisted.payDocId,
      type: PurchaseAttachmentTypes.PAYMENT_PROOF,
      file: draft.paymentEvidenceFile,
    });
  }
};
