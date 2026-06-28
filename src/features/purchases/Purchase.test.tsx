import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Purchase from "./Purchase";

vi.mock("@/shared/hooks/useCompany", () => ({
  useCompany: () => ({ hasCompany: true }),
}));

vi.mock("@/shared/services/supplierService", () => ({
  listSuppliers: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock("@/shared/services/warehouseServices", () => ({
  listActiveWarehouses: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/shared/services/skuService", () => ({
  listSkus: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock("@/shared/services/purchaseService", () => ({
  createPurchaseOrder: vi.fn(),
  getById: vi.fn(),
  updatePurchaseOrder: vi.fn(),
  validatePurchaseOrderNumber: vi.fn().mockResolvedValue({ exists: false }),
}));

vi.mock("sileo", () => ({
  sileo: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/shared/layouts/PageShell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: () => <div data-testid="purchase-items-table" />,
}));

vi.mock("@/shared/components/components/SystemButton", () => ({
  SystemButton: ({
    children,
    onClick,
    title,
  }: {
    children?: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    title?: string;
  }) => (
    <button type="button" title={title} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/shared/components/components/FloatingInput", () => ({
  FloatingInput: ({ label, name, value, onChange }: { label: string; name: string; value?: string | number; onChange?: React.ChangeEventHandler<HTMLInputElement> }) => (
    <label>
      {label}
      <input name={name} value={value ?? ""} onChange={onChange} />
    </label>
  ),
}));

vi.mock("@/shared/components/components/FloatingSelect", () => ({
  FloatingSelect: ({ label, name, value, onChange, options = [] }: { label: string; name: string; value?: string; onChange?: (value: string) => void; options?: Array<{ value: string; label: string }> }) => (
    <label>
      {label}
      <select name={name} value={value ?? ""} onChange={(event) => onChange?.(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

vi.mock("@/shared/components/components/date-picker/FloatingDateTimePicker", () => ({
  FloatingDateTimePicker: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock("./components/PurchaseItemsSection", () => ({
  PurchaseItemsSection: () => <div data-testid="purchase-items-section" />,
}));

vi.mock("./components/PurchasePaymentModal", () => ({
  PurchasePaymentModal: ({ form, onClose }: { form: { payments?: unknown[] }; onClose: () => void }) => (
    <section data-testid="purchase-payment-modal" data-payments-count={form.payments?.length ?? 0}>
      <button type="button" onClick={onClose}>
        Cerrar
      </button>
    </section>
  ),
}));

vi.mock("../providers/components/SupplierFormModal", () => ({
  SupplierFormModal: () => null,
}));

vi.mock("../warehouse/components/WarehouseFormModal", () => ({
  WarehouseFormModal: () => null,
}));

vi.mock("./components/EquivalenceModal", () => ({
  EquivalenceModal: () => null,
}));

vi.mock("./components/ModalNavegate", () => ({
  ModalNavegate: () => null,
}));

describe("Purchase form", () => {
  it("renders a direct create purchase action separate from adding a payment", () => {
    render(
      <MemoryRouter>
        <Purchase inModal />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Crear compra" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar Pago" })).toBeInTheDocument();
  });

  it("does not persist a default payment when opening and closing the payment setup modal", () => {
    render(
      <MemoryRouter>
        <Purchase inModal />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agregar Pago" }));

    expect(screen.getByTestId("purchase-payment-modal")).toHaveAttribute("data-payments-count", "0");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(screen.queryByTestId("purchase-payment-modal")).not.toBeInTheDocument();
  });
});
