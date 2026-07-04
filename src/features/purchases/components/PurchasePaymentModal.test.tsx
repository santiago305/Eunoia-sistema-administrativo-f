import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PurchasePaymentModal } from "./PurchasePaymentModal";
import { CurrencyTypes, PaymentFormTypes, PaymentTypes, PurchaseOrderStatuses, VoucherDocTypes } from "@/features/purchases/types/purchaseEnums";
import type { Payment, PurchaseOrder } from "@/features/purchases/types/purchase";

const {
  getPaymentMethodsBySupplierMock,
  listCompanyPaymentAccountsByCompanyMock,
  setFormMock,
} = vi.hoisted(() => ({
  getPaymentMethodsBySupplierMock: vi.fn(),
  listCompanyPaymentAccountsByCompanyMock: vi.fn(),
  setFormMock: vi.fn(),
}));

vi.mock("@/shared/services/paymentMethodService", () => ({
  getPaymentMethodsBySupplier: getPaymentMethodsBySupplierMock,
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
    getPaymentMethodsBySupplierMock.mockResolvedValue([
      { supplierMethodId: "supplier-method-cash", methodId: "method-cash", name: "EFECTIVO", number: null, isActive: true, isDefault: false },
      { supplierMethodId: "supplier-method-bank", methodId: "method-bank", name: "TRANSFERENCIA", number: "001-222", isActive: true, isDefault: true },
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

    await waitFor(() => expect(getPaymentMethodsBySupplierMock).toHaveBeenCalledWith("supplier-1"));

    expect(screen.queryByText("Desde cuenta de empresa")).not.toBeInTheDocument();
    expect(screen.queryByText("A cuenta del proveedor")).not.toBeInTheDocument();
  });

  it("uses supplier method as destination and only shows company origin for non-cash payments", async () => {
    render(<StatefulPurchasePaymentModal />);

    fireEvent.click(await screen.findByRole("button", { name: "Metodo: EFECTIVO" }));
    fireEvent.mouseDown(await screen.findByRole("option", { name: "TRANSFERENCIA - 001-222" }));

    expect(await screen.findByText("Desde cuenta de empresa")).toBeInTheDocument();
    expect(await screen.findByText("BCP Soles ****1234 · PEN")).toBeInTheDocument();
    expect(screen.queryByText("A cuenta del proveedor")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Metodo: TRANSFERENCIA - 001-222" })).toBeInTheDocument();
  });

  it("does not allow saving a payment without selecting a supplier payment method", async () => {
    render(<PurchasePaymentModalWithoutMethod />);

    expect(await screen.findByRole("button", { name: "Generar Comprobante" })).toBeDisabled();
  });

  it("requires an evidence file for non-cash payments", async () => {
    render(<StatefulPurchasePaymentModal />);

    fireEvent.click(await screen.findByRole("button", { name: "Metodo: EFECTIVO" }));
    fireEvent.mouseDown(await screen.findByRole("option", { name: "TRANSFERENCIA - 001-222" }));

    expect(await screen.findByText("Comprobante requerido para este metodo de pago.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generar Comprobante" })).toBeDisabled();
  });

  it("allows saving a non-cash payment after selecting evidence", async () => {
    render(<StatefulPurchasePaymentModal />);

    fireEvent.click(await screen.findByRole("button", { name: "Metodo: EFECTIVO" }));
    fireEvent.mouseDown(await screen.findByRole("option", { name: "TRANSFERENCIA - 001-222" }));

    const file = new File(["voucher"], "voucher.png", { type: "image/png" });
    fireEvent.change(await screen.findByLabelText("Comprobante de pago 1"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Generar Comprobante" })).not.toBeDisabled();
    });
  });
});
