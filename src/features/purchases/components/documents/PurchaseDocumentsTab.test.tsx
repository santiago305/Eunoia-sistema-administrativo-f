import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PurchaseDocumentsTab } from "./PurchaseDocumentsTab";

const { listPurchaseAttachmentsMock } = vi.hoisted(() => ({
  listPurchaseAttachmentsMock: vi.fn(),
}));

vi.mock("@/shared/services/purchaseAttachmentService", () => ({
  deletePurchaseAttachment: vi.fn(),
  listPurchaseAttachments: listPurchaseAttachmentsMock,
  uploadPurchaseAttachment: vi.fn(),
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

  it("allows fiscal uploads constrained to invoices and receipts", async () => {
    render(
      <PurchaseDocumentsTab
        purchaseId="purchase-1"
        allowedTypes={["INVOICE", "RECEIPT"]}
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
    expect(screen.getByRole("option", { name: "Recibo" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Comprobante de pago" })).not.toBeInTheDocument();
  });
});
