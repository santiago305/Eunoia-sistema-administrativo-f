import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecurringPurchaseFormModal } from "./RecurringPurchaseFormModal";

const modalMock = vi.hoisted(() => vi.fn());
const floatingInputMock = vi.hoisted(() => vi.fn());
const moneyInputMock = vi.hoisted(() => vi.fn());
const floatingDatePickerMock = vi.hoisted(() => vi.fn());
const floatingSelectMock = vi.hoisted(() => vi.fn());
const floatingTextareaMock = vi.hoisted(() => vi.fn());
const supplierFormModalMock = vi.hoisted(() => vi.fn());
const listSuppliersMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/services/supplierService", () => ({
  listSuppliers: listSuppliersMock,
}));

vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({ children, open, title }: { children: React.ReactNode; open: boolean; title?: string }) => {
    modalMock({ open, title });
    return open ? (
      <section data-testid="shared-modal" aria-label={title}>
        {children}
      </section>
    ) : null;
  },
}));

vi.mock("@/shared/components/components/FloatingInput", () => ({
  FloatingInput: (props: unknown) => {
    floatingInputMock(props);
    return <input aria-label={(props as { label: string }).label} />;
  },
}));

vi.mock("@/shared/components/components/MoneyInput", () => ({
  MoneyInput: (props: unknown) => {
    moneyInputMock(props);
    return <input aria-label={(props as { label: string }).label} />;
  },
}));

vi.mock("@/shared/components/components/date-picker/FloatingDatePicker", () => ({
  FloatingDatePicker: (props: unknown) => {
    floatingDatePickerMock(props);
    return <button type="button">{(props as { label: string }).label}</button>;
  },
}));

vi.mock("@/shared/components/components/FloatingSelect", () => ({
  FloatingSelect: (props: unknown) => {
    floatingSelectMock(props);
    return <button type="button">{(props as { label: string }).label}</button>;
  },
}));

vi.mock("@/shared/components/components/SystemButton", () => ({
  SystemButton: ({
    children,
    title,
    onClick,
    type,
  }: {
    children?: React.ReactNode;
    title?: string;
    onClick?: () => void;
    type?: "button" | "submit";
  }) => (
    <button type={type ?? "button"} title={title} onClick={onClick}>
      {title ?? children}
    </button>
  ),
}));

vi.mock("@/shared/components/components/FloatingTextarea", () => ({
  FloatingTextarea: (props: unknown) => {
    floatingTextareaMock(props);
    return <textarea aria-label={(props as { label: string }).label} />;
  },
}));

vi.mock("@/features/providers/components/SupplierFormModal", () => ({
  SupplierFormModal: (props: unknown) => {
    supplierFormModalMock(props);
    return (props as { open: boolean }).open ? <div data-testid="supplier-form-modal" /> : null;
  },
}));

describe("RecurringPurchaseFormModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSuppliersMock.mockResolvedValue({
      items: [
        {
          supplierId: "supplier-1",
          tradeName: "Proveedor Uno",
          documentNumber: "20111111111",
        },
      ],
    });
  });

  it("uses the shared modal and floating form controls", async () => {
    render(
      <RecurringPurchaseFormModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByTestId("shared-modal")).toBeInTheDocument();
    expect(modalMock).toHaveBeenCalledWith(
      expect.objectContaining({ open: true, title: "Nueva compra recurrente" }),
    );
    await waitFor(() => {
      expect(floatingSelectMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "supplierId",
          searchable: true,
          searchPlaceholder: "Buscar proveedor...",
          emptyMessage: "Sin proveedores",
          options: [{ value: "supplier-1", label: "Proveedor Uno (20111111111)" }],
        }),
      );
    });
    expect(floatingInputMock).not.toHaveBeenCalledWith(expect.objectContaining({ name: "supplierId" }));
    expect(floatingSelectMock).toHaveBeenCalledWith(expect.objectContaining({ name: "frequency" }));
    expect(floatingTextareaMock).toHaveBeenCalledWith(expect.objectContaining({ name: "description" }));
  });

  it("uses money and shared date controls for amount and start date", () => {
    render(
      <RecurringPurchaseFormModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(moneyInputMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "amount",
        label: "Monto",
        currency: "PEN",
        min: "0.01",
        step: "0.01",
      }),
    );
    expect(floatingDatePickerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "startDate",
        label: "Inicio",
        clearable: false,
      }),
    );
    expect(floatingInputMock).not.toHaveBeenCalledWith(expect.objectContaining({ name: "amount" }));
    expect(floatingInputMock).not.toHaveBeenCalledWith(expect.objectContaining({ name: "startDate" }));
  });

  it("opens the shared supplier creation modal from the provider action", async () => {
    const user = userEvent.setup();
    render(
      <RecurringPurchaseFormModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    await user.click(screen.getByTitle("Agregar proveedor"));

    expect(screen.getByTestId("supplier-form-modal")).toBeInTheDocument();
    expect(supplierFormModalMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        mode: "create",
      }),
    );
  });
});
