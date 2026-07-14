import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentFormModal } from "./PaymentFormModal";

const {
  createPaymentMock,
  getAllPaymentMethodsMock,
  listAccountPayablesMock,
  uploadPurchaseAttachmentMock,
} = vi.hoisted(() => ({
  createPaymentMock: vi.fn(),
  getAllPaymentMethodsMock: vi.fn(),
  listAccountPayablesMock: vi.fn(),
  uploadPurchaseAttachmentMock: vi.fn(),
}));

vi.mock("@/shared/services/paymentService", () => ({
  createPayment: createPaymentMock,
}));

vi.mock("@/shared/services/paymentMethodService", () => ({
  getAllPaymentMethods: getAllPaymentMethodsMock,
}));

vi.mock("@/shared/services/accountsPayableService", () => ({
  listAccountPayables: listAccountPayablesMock,
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
      { methodId: "method-1", name: "TRANSFERENCIA", isActive: true, requiresVoucher: false },
    ]);
    listAccountPayablesMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
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
          paymentMethodId: "method-1",
          companyPaymentAccountId: "account-1",
          bankName: "BCP",
          cardLastFour: "1234",
          scheduledAt: undefined,
        }),
      );
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("prefills payment fields from a selected account payable", async () => {
    listAccountPayablesMock.mockResolvedValueOnce({
      items: [
        {
          accountPayableId: "payable-1",
          purchaseId: "purchase-1",
          quotaId: "quota-1",
          description: "Servicio hosting",
          currency: "PEN",
          amountTotal: 300,
          amountPaid: 100,
          amountPending: 200,
          status: "PARTIAL",
          dueDate: "2026-07-20",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    const onSaved = vi.fn();

    render(
      <PaymentFormModal
        open
        mode="create"
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /seleccionar cuenta por pagar/i }));
    fireEvent.mouseDown(await screen.findByRole("option", { name: /servicio hosting/i }));
    fireEvent.click(await screen.findByRole("button", { name: /seleccionar cuenta bcp/i }));
    fireEvent.click(screen.getByRole("button", { name: /guardar pago/i }));

    await waitFor(() => {
      expect(createPaymentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          poId: "purchase-1",
          accountPayableId: "payable-1",
          quotaId: "quota-1",
          amount: 200,
          currency: "PEN",
          paymentMethodId: "method-1",
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
