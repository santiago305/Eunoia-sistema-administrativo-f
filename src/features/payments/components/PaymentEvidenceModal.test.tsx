import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentEvidenceModal } from "./PaymentEvidenceModal";

const {
  listPurchaseAttachmentsMock,
  uploadPurchaseAttachmentMock,
} = vi.hoisted(() => ({
  listPurchaseAttachmentsMock: vi.fn(),
  uploadPurchaseAttachmentMock: vi.fn(),
}));

vi.mock("@/shared/services/purchaseAttachmentService", () => ({
  listPurchaseAttachments: listPurchaseAttachmentsMock,
  uploadPurchaseAttachment: uploadPurchaseAttachmentMock,
}));

describe("PaymentEvidenceModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPurchaseAttachmentsMock.mockResolvedValue([
      {
        attachmentId: "attachment-1",
        purchaseId: "purchase-1",
        paymentId: "payment-1",
        type: "PAYMENT_PROOF",
        originalName: "voucher.pdf",
        filename: "voucher.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1200,
        url: "/files/voucher.pdf",
        note: null,
        uploadedByUserId: null,
        createdAt: "2026-07-13T10:00:00.000Z",
      },
    ]);
    uploadPurchaseAttachmentMock.mockResolvedValue({ type: "success", message: "Comprobante subido." });
  });

  it("lists and uploads payment evidence for a purchase payment", async () => {
    const onUploaded = vi.fn();

    render(
      <PaymentEvidenceModal
        open
        payment={{
          payDocId: "payment-1",
          poId: "purchase-1",
          method: "TRANSFERENCIA",
          date: "2026-07-13",
          currency: "PEN",
          amount: 120,
        }}
        canAttachEvidence
        onClose={vi.fn()}
        onUploaded={onUploaded}
      />,
    );

    expect(await screen.findByText("voucher.pdf")).toBeInTheDocument();

    const file = new File(["voucher"], "new-voucher.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText(/subir comprobante/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: /subir evidencia/i }));

    await waitFor(() => {
      expect(uploadPurchaseAttachmentMock).toHaveBeenCalledWith({
        purchaseId: "purchase-1",
        paymentId: "payment-1",
        type: "PAYMENT_PROOF",
        file,
        note: "Evidencia cargada desde el centro de pagos.",
      });
    });
    expect(onUploaded).toHaveBeenCalled();
  });
});
