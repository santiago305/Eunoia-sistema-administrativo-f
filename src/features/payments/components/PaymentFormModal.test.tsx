import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentFormModal } from "./PaymentFormModal";

const {
  createPaymentMock,
  getAllPaymentMethodsMock,
  uploadPurchaseAttachmentMock,
} = vi.hoisted(() => ({
  createPaymentMock: vi.fn(),
  getAllPaymentMethodsMock: vi.fn(),
  uploadPurchaseAttachmentMock: vi.fn(),
}));

vi.mock("@/shared/services/paymentService", () => ({
  createPayment: createPaymentMock,
}));

vi.mock("@/shared/services/paymentMethodService", () => ({
  getAllPaymentMethods: getAllPaymentMethodsMock,
}));

vi.mock("@/shared/services/purchaseAttachmentService", () => ({
  uploadPurchaseAttachment: uploadPurchaseAttachmentMock,
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true }),
}));

vi.mock("@/shared/hooks/useCompany", () => ({
  useCompany: () => ({ company: { companyId: "company-1" } }),
}));

vi.mock("./CompanyPaymentAccountSelect", () => ({
  CompanyPaymentAccountSelect: ({ onChange }: { onChange: (account: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          id: "account-1",
          bankName: "BCP",
          accountLastFour: "1234",
        })
      }
    >
      Seleccionar cuenta BCP
    </button>
  ),
}));

describe("PaymentFormModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllPaymentMethodsMock.mockResolvedValue([
      { id: "method-1", name: "TRANSFERENCIA", isActive: true, requiresVoucher: false },
    ]);
    createPaymentMock.mockResolvedValue({ type: "success", message: "Pago registrado.", paymentId: "payment-1" });
    uploadPurchaseAttachmentMock.mockResolvedValue({ type: "success", message: "Comprobante subido." });
  });

  it("creates an immediate payment with method and company payment account", async () => {
    const onSaved = vi.fn();

    render(
      <PaymentFormModal
        open
        mode="create"
        onClose={vi.fn()}
        onSaved={onSaved}
        initialPayment={{
          poId: "purchase-1",
          accountPayableId: "payable-1",
          currency: "PEN",
          amount: 120,
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: "80" } });
    fireEvent.click(await screen.findByRole("button", { name: /seleccionar cuenta bcp/i }));
    fireEvent.click(screen.getByRole("button", { name: /guardar pago/i }));

    await waitFor(() => {
      expect(createPaymentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          poId: "purchase-1",
          accountPayableId: "payable-1",
          amount: 80,
          currency: "PEN",
          companyPaymentAccountId: "account-1",
          bankName: "BCP",
          cardLastFour: "1234",
          scheduledAt: undefined,
        }),
      );
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("requires a future scheduled date when scheduling a payment", async () => {
    render(
      <PaymentFormModal
        open
        mode="schedule"
        onClose={vi.fn()}
        onSaved={vi.fn()}
        initialPayment={{
          poId: "purchase-1",
          currency: "PEN",
          amount: 120,
          scheduledAt: "2020-01-01",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /programar pago/i }));

    expect(createPaymentMock).not.toHaveBeenCalled();
    expect(screen.getByText(/fecha futura/i)).toBeInTheDocument();
  });
});
