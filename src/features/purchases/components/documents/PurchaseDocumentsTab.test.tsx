import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PurchaseDocumentsTab } from "./PurchaseDocumentsTab";

const { listPurchaseAttachmentsMock, uploadPurchaseAttachmentMock } = vi.hoisted(() => ({
  listPurchaseAttachmentsMock: vi.fn(),
  uploadPurchaseAttachmentMock: vi.fn(),
}));

vi.mock("@/shared/services/purchaseAttachmentService", () => ({
  deletePurchaseAttachment: vi.fn(),
  listPurchaseAttachments: listPurchaseAttachmentsMock,
  uploadPurchaseAttachment: uploadPurchaseAttachmentMock,
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: vi.fn() }),
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: () => true,
  }),
}));

describe("PurchaseDocumentsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPurchaseAttachmentsMock.mockResolvedValue([]);
    uploadPurchaseAttachmentMock.mockResolvedValue({ type: "success", message: "Documento subido." });
  });

  it("shows purchase photos without legacy or image_prodution copy", async () => {
    render(
      <PurchaseDocumentsTab
        purchaseId="purchase-1"
        legacyImages={["purchase-attachments/purchase-1/product.webp"]}
      />,
    );

    await waitFor(() => {
      expect(listPurchaseAttachmentsMock).toHaveBeenCalledWith({ purchaseId: "purchase-1" });
    });

    expect(screen.getByText("Fotos de compra")).toBeInTheDocument();
    expect(screen.queryByText(/legacy/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/image_prodution/i)).not.toBeInTheDocument();
  });

  it("allows fiscal uploads using purchase document types", async () => {
    render(
      <PurchaseDocumentsTab
        purchaseId="purchase-1"
        fiscalOnly
        title="Comprobantes fiscales"
        showUploader
        showLegacyImages={false}
      />,
    );

    await waitFor(() => {
      expect(listPurchaseAttachmentsMock).toHaveBeenCalledWith({ purchaseId: "purchase-1" });
    });

    expect(screen.getByText("Comprobantes fiscales")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Factura" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Boleta" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Nota de venta" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Comprobante de pago" })).not.toBeInTheDocument();
  });

  it("auto associates the only payment when uploading a fiscal document", async () => {
    render(
      <PurchaseDocumentsTab
        purchaseId="purchase-1"
        fiscalOnly
        payments={[{
          payDocId: "payment-1",
          method: "TRANSFERENCIA",
          date: "2026-06-28",
          currency: "PEN",
          amount: 120,
        }]}
        showUploader
        showLegacyImages={false}
      />,
    );

    await waitFor(() => {
      expect(listPurchaseAttachmentsMock).toHaveBeenCalledWith({ purchaseId: "purchase-1" });
    });

    const input = screen.getByLabelText("Archivo fiscal");
    const selectedFile = new File(["pdf"], "factura.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [selectedFile] } });
    fireEvent.click(screen.getByRole("button", { name: /subir/i }));

    await waitFor(() => {
      expect(uploadPurchaseAttachmentMock).toHaveBeenCalledWith(expect.objectContaining({
        purchaseId: "purchase-1",
        type: "FISCAL_DOCUMENT",
        fiscalDocumentType: "01",
        paymentId: "payment-1",
        file: selectedFile,
      }));
    });
  });

  it("hides fiscal upload form after a fiscal document exists", async () => {
    listPurchaseAttachmentsMock.mockResolvedValue([{
      attachmentId: "attachment-1",
      purchaseId: "purchase-1",
      paymentId: null,
      receptionId: null,
      type: "FISCAL_DOCUMENT",
      fiscalDocumentType: "01",
      filename: "factura.pdf",
      originalName: "factura.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4,
      url: "purchase-attachments/purchase-1/factura.pdf",
      note: null,
      uploadedByUserId: null,
      createdAt: "2026-06-28T00:00:00.000Z",
    }]);

    render(
      <PurchaseDocumentsTab
        purchaseId="purchase-1"
        fiscalOnly
        title="Comprobantes fiscales"
        showUploader
        showLegacyImages={false}
      />,
    );

    expect(await screen.findByText("factura.pdf")).toBeInTheDocument();
    expect(screen.queryByLabelText("Archivo fiscal")).not.toBeInTheDocument();
    expect(screen.getByText("El comprobante fiscal ya fue registrado para esta compra.")).toBeInTheDocument();
  });
});
