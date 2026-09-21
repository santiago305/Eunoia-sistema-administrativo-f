import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PurchasePaymentModal } from "./PurchasePaymentModal";
import { CurrencyTypes, PaymentFormTypes, PaymentTypes, PurchaseOrderStatuses, VoucherDocTypes } from "@/features/purchases/types/purchaseEnums";
import type { Payment, PurchaseOrder } from "@/features/purchases/types/purchase";

const {
  getPaymentMethodsByCompanyMock,
  listCompanyPaymentAccountsByCompanyMock,
  listSupplierPaymentDestinationsMock,
  setFormMock,
} = vi.hoisted(() => ({
  getPaymentMethodsByCompanyMock: vi.fn(),
  listCompanyPaymentAccountsByCompanyMock: vi.fn(),
  listSupplierPaymentDestinationsMock: vi.fn(),
  setFormMock: vi.fn(),
}));

vi.mock("@/shared/services/paymentMethodService", () => ({
  getPaymentMethodsByCompany: getPaymentMethodsByCompanyMock,
}));

vi.mock("@/shared/services/supplierService", () => ({
  listSupplierPaymentDestinations: listSupplierPaymentDestinationsMock,
}));

vi.mock("@/shared/services/companyPaymentAccountService", () => ({
  listCompanyPaymentAccountsByCompany: listCompanyPaymentAccountsByCompanyMock,
}));

vi.mock("@/shared/hooks/useCompany", () => ({
  useCompany: () => ({ company: { companyId: "company-1" } }),
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: vi.fn(), clearFeedback: vi.fn() }),
}));

vi.mock("@/shared/components/settings/modal", () => ({
  Modal: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h1>{title}</h1>
      {children}
    </section>
  ),
}));

const baseForm = (): PurchaseOrder => ({
  supplierId: "supplier-1",
  warehouseId: "warehouse-1",
  documentType: VoucherDocTypes.FACTURA,
  serie: "F001",
  correlative: 1,
  currency: CurrencyTypes.PEN,
  paymentForm: PaymentFormTypes.CONTADO,
  totalTaxed: 100,
  totalExempted: 0,
  totalIgv: 18,
  purchaseValue: 100,
  total: 118,
  status: PurchaseOrderStatuses.DRAFT,
  payments: [
    {
      method: PaymentTypes.EFECTIVO,
      date: "2026-06-27",
      operationNumber: "",
      currency: CurrencyTypes.PEN,
      amount: 118,
      note: "",
    },
  ],
  items: [],
  quotas: [],
});

function StatefulPurchasePaymentModal() {
  const [form, setForm] = useState<PurchaseOrder>(baseForm());
  const trackedSetForm: typeof setForm = (next) => {
    setFormMock(next);
    setForm(next);
  };

  return (
    <PurchasePaymentModal
      open
      onClose={vi.fn()}
      form={form}
      setForm={trackedSetForm}
      totalPrice={118}
      currency={CurrencyTypes.PEN}
      formatMoney={(value) => `S/ ${value}`}
      onSave={vi.fn()}
      saveDisabled={false}
    />
  );
}

function PurchasePaymentModalWithoutMethod() {
  const [form, setForm] = useState<PurchaseOrder>({
    ...baseForm(),
    payments: [
      {
        method: "" as Payment["method"],
        date: "2026-06-27",
        operationNumber: "",
        currency: CurrencyTypes.PEN,
        amount: 118,
        note: "",
      },
    ],
  });

  return (
    <PurchasePaymentModal
      open
      onClose={vi.fn()}
      form={form}
      setForm={setForm}
      totalPrice={118}
      currency={CurrencyTypes.PEN}
      formatMoney={(value) => `S/ ${value}`}
      onSave={vi.fn()}
      saveDisabled={false}
    />
  );
}

describe("PurchasePaymentModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPaymentMethodsByCompanyMock.mockResolvedValue([
      { companyMethodId: "company-method-cash", methodId: "method-cash", name: "EFECTIVO", code: "CASH", isActive: true, isDefault: false },
      { companyMethodId: "company-method-bank", methodId: "method-bank", name: "TRANSFERENCIA", code: "BANK_TRANSFER", requiresDestination: true, isActive: true, isDefault: true },
    ]);
    listSupplierPaymentDestinationsMock.mockResolvedValue([
      {
        supplierPaymentDestinationId: "supplier-destination-1",
        supplierId: "supplier-1",
        methodId: "method-bank",
        type: "BANK_ACCOUNT",
        currency: "PEN",
        name: "BCP proveedor",
        maskedLabel: "BCP proveedor ****2222",
        isActive: true,
        isDefault: true,
        requiresManualReview: false,
      },
    ]);
    listCompanyPaymentAccountsByCompanyMock.mockResolvedValue([
      {
        id: "company-account-1",
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
  });

  it("hides origin and destination account selects for cash payments", async () => {
    render(<StatefulPurchasePaymentModal />);

    await waitFor(() => expect(getPaymentMethodsByCompanyMock).toHaveBeenCalledWith("company-1"));
    expect(listSupplierPaymentDestinationsMock).toHaveBeenCalledWith("supplier-1");

    expect(screen.queryByText("Desde cuenta de empresa")).not.toBeInTheDocument();
    expect(screen.queryByText("Destino del proveedor")).not.toBeInTheDocument();
  });

  it("separates the company origin from the supplier destination for non-cash payments", async () => {
    render(<StatefulPurchasePaymentModal />);

    fireEvent.click(await screen.findByRole("button", { name: "Metodo: EFECTIVO" }));
    fireEvent.mouseDown(await screen.findByRole("option", { name: "TRANSFERENCIA" }));

    expect(await screen.findByText("Desde cuenta de empresa")).toBeInTheDocument();
    expect(await screen.findByText("BCP Soles ****1234 · PEN")).toBeInTheDocument();
    expect(await screen.findByText("Destino del proveedor")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Destino del proveedor" }));
    expect(await screen.findByRole("option", { name: "BCP proveedor ****2222" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Metodo: TRANSFERENCIA" })).toBeInTheDocument();
  });

  it("does not allow saving a payment without selecting a supplier payment method", async () => {
    render(<PurchasePaymentModalWithoutMethod />);

    expect(await screen.findByRole("button", { name: "Generar Comprobante" })).toBeDisabled();
  });

  it("requires an evidence file for non-cash payments", async () => {
    render(<StatefulPurchasePaymentModal />);

    fireEvent.click(await screen.findByRole("button", { name: "Metodo: EFECTIVO" }));
    fireEvent.mouseDown(await screen.findByRole("option", { name: "TRANSFERENCIA" }));

    expect(await screen.findByText("Comprobante requerido para este metodo de pago.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generar Comprobante" })).toBeDisabled();
  });

  it("allows saving a non-cash payment after selecting evidence", async () => {
    render(<StatefulPurchasePaymentModal />);

    fireEvent.click(await screen.findByRole("button", { name: "Metodo: EFECTIVO" }));
    fireEvent.mouseDown(await screen.findByRole("option", { name: "TRANSFERENCIA" }));

    fireEvent.click(await screen.findByRole("button", { name: "Destino del proveedor" }));
    fireEvent.mouseDown(await screen.findByRole("option", { name: "BCP proveedor ****2222" }));

    const file = new File(["voucher"], "voucher.png", { type: "image/png" });
    fireEvent.change(await screen.findByLabelText("Comprobante de pago 1"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Generar Comprobante" })).not.toBeDisabled();
    });
  });

  it("allows pdf payment evidence files", async () => {
    render(<StatefulPurchasePaymentModal />);

    fireEvent.click(await screen.findByRole("button", { name: "Metodo: EFECTIVO" }));
    fireEvent.mouseDown(await screen.findByRole("option", { name: "TRANSFERENCIA" }));

    const input = await screen.findByLabelText("Comprobante de pago 1") as HTMLInputElement;
    expect(input.accept).toContain("application/pdf");
    expect(input.accept).toContain(".pdf");

    const file = new File(["pdf"], "comprobante.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText("comprobante.pdf")).toBeInTheDocument();
  });
});
