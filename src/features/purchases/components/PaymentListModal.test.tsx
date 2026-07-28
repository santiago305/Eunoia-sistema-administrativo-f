import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentListModal } from "./PaymentListModal";

const {
  listPaymentsMock,
  listPurchaseAttachmentsMock,
  permissionsMock,
} = vi.hoisted(() => ({
  listPaymentsMock: vi.fn(),
  listPurchaseAttachmentsMock: vi.fn(),
  permissionsMock: new Set<string>(),
}));

vi.mock("@/shared/services/purchaseService", () => ({
  listPayments: listPaymentsMock,
}));

vi.mock("@/shared/services/purchaseAttachmentService", () => ({
  listPurchaseAttachments: listPurchaseAttachmentsMock,
}));

vi.mock("@/shared/services/paymentService", () => ({
  approvePayment: vi.fn(),
  rejectPayment: vi.fn(),
  removePayment: vi.fn(),
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: (permission: string) => permissionsMock.has(permission) }),
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: vi.fn(), clearFeedback: vi.fn() }),
}));

vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({ open, title, children }: { open: boolean; title?: string; children: React.ReactNode }) =>
    open ? (
      <section role="dialog" aria-label={title}>
        {children}
      </section>
    ) : null,
}));

vi.mock("@/shared/components/components/ImagePreviewModal", () => ({
  ImagePreviewModal: ({ open }: { open: boolean }) => (open ? <div data-testid="image-preview" /> : null),
}));

vi.mock("./PaymentModal", () => ({
  PaymentModal: () => null,
}));

describe("PaymentListModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      media: "",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
    permissionsMock.clear();
    permissionsMock.add("payments.view_evidence");
    listPaymentsMock.mockResolvedValue([
      {
        payDocId: "payment-1",
        method: "TRANSFERENCIA",
        date: "2026-07-04T10:00:00.000Z",
        currency: "PEN",
        amount: 100,
        status: "APPROVED",
      },
    ]);
    listPurchaseAttachmentsMock.mockResolvedValue([
      {
        attachmentId: "attachment-1",
        purchaseId: "purchase-1",
        paymentId: "payment-1",
        receptionId: null,
        type: "PAYMENT_PROOF",
        filename: "voucher.pdf",
        originalName: "voucher.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1200,
        url: "purchase-attachments/purchase-1/voucher.pdf",
        note: null,
        uploadedByUserId: null,
        createdAt: "2026-07-04T10:00:00.000Z",
      },
    ]);
  });

  it("opens a pdf payment proof from the payment list", async () => {
    render(
      <PaymentListModal
        title="Pagos"
        close={vi.fn()}
        poId="purchase-1"
        total={100}
        loadPurchases={vi.fn()}
        open
      />,
    );

    await waitFor(() => expect(listPurchaseAttachmentsMock).toHaveBeenCalledWith({ purchaseId: "purchase-1", type: "PAYMENT_PROOF" }));

    fireEvent.click(await screen.findByRole("button", { name: /1/i }));

    expect(screen.getByRole("dialog", { name: "voucher.pdf" })).toBeInTheDocument();
    expect(screen.getByTitle("voucher.pdf")).toHaveAttribute("src", "http://localhost:3000/purchase-attachments/purchase-1/voucher.pdf");
  });
});
