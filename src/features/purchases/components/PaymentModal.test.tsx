import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentModal } from "./PaymentModal";

const {
  createPaymentMock,
  getAllPaymentMethodsMock,
  listCompanyPaymentAccountsByCompanyMock,
  uploadPurchaseAttachmentMock,
} = vi.hoisted(() => ({
  createPaymentMock: vi.fn(),
  getAllPaymentMethodsMock: vi.fn(),
  listCompanyPaymentAccountsByCompanyMock: vi.fn(),
  uploadPurchaseAttachmentMock: vi.fn(),
}));

vi.mock("@/shared/services/paymentService", () => ({
  createPayment: createPaymentMock,
}));

vi.mock("@/shared/services/paymentMethodService", () => ({
  getAllPaymentMethods: getAllPaymentMethodsMock,
}));

vi.mock("@/shared/services/companyPaymentAccountService", () => ({
  listCompanyPaymentAccountsByCompany: listCompanyPaymentAccountsByCompanyMock,
}));

vi.mock("@/shared/services/purchaseAttachmentService", () => ({
  uploadPurchaseAttachment: uploadPurchaseAttachmentMock,
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: vi.fn(), clearFeedback: vi.fn() }),
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: (permission: string) => permission === "payments.attach_evidence" }),
}));

vi.mock("@/shared/hooks/useCompany", () => ({
  useCompany: () => ({ company: { companyId: "company-1" } }),
}));

vi.mock("@/features/payments/components/SchedulePaymentModal", () => ({
  SchedulePaymentModal: () => null,
}));

vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) =>
    open ? (
      <section>
        <h1>{title}</h1>
        {children}
      </section>
    ) : null,
}));

describe("PaymentModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createPaymentMock.mockResolvedValue({ type: "success", message: "ok", paymentId: "payment-1" });
    getAllPaymentMethodsMock.mockResolvedValue([
      { name: "EFECTIVO" },
      { name: "TRANSFERENCIA" },
    ]);
    listCompanyPaymentAccountsByCompanyMock.mockResolvedValue([
      {
        id: "account-1",
        companyId: "company-1",
        type: "BANK_ACCOUNT",
        name: "BCP Soles",
        bankName: "BCP",
        accountLastFour: "1234",
        cardLastFour: null,
        walletName: null,
        currency: "PEN",
        isActive: true,
        isDefault: true,
        maskedLabel: "BCP Soles ****1234",
      },
    ]);
    uploadPurchaseAttachmentMock.mockResolvedValue({ type: "success", message: "uploaded" });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  it("keeps cash as default and hides voucher upload for cash payments", async () => {
    render(
      <PaymentModal
        title="Formulario de Pago"
        close={vi.fn()}
        open
        poId="purchase-1"
        totalToPay={100}
      />,
    );

    await waitFor(() => expect(screen.getByText("Formulario de Pago")).toBeInTheDocument());
    expect(screen.queryByText("Foto/comprobante de pago")).not.toBeInTheDocument();
    expect(screen.queryByText("Cuenta/tarjeta de empresa")).not.toBeInTheDocument();
  });

  it("shows origin account and optional voucher drop zone for non-cash payments", async () => {
    render(
      <PaymentModal
        title="Formulario de Pago"
        close={vi.fn()}
        open
        poId="purchase-1"
        totalToPay={100}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Metodo: EFECTIVO" }));
    fireEvent.mouseDown(await screen.findByRole("option", { name: "TRANSFERENCIA" }));

    expect(await screen.findByText("Cuenta/tarjeta de empresa")).toBeInTheDocument();
    expect(await screen.findByText("BCP Soles ****1234 · PEN")).toBeInTheDocument();

    const input = await screen.findByLabelText("Foto/comprobante de pago");
    const image = new File(["image"], "voucher.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [image] } });

    expect(await screen.findByAltText("Previsualizacion del comprobante de pago")).toHaveAttribute("src", "blob:preview");
    expect(screen.getByText("voucher.png")).toBeInTheDocument();
  });

  it("requires a voucher before saving when the selected method requires evidence", async () => {
    getAllPaymentMethodsMock.mockResolvedValue([
      { name: "EFECTIVO", requiresVoucher: false },
      { name: "TRANSFERENCIA", requiresVoucher: true },
    ]);

    render(
      <PaymentModal
        title="Formulario de Pago"
        close={vi.fn()}
        open
        poId="purchase-1"
        totalToPay={100}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Metodo: EFECTIVO" }));
    fireEvent.mouseDown(await screen.findByRole("option", { name: "TRANSFERENCIA" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar pago" }));

    await waitFor(() => expect(createPaymentMock).not.toHaveBeenCalled());
  });
});
