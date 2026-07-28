import { useState, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AfectType } from "@/features/purchases/types/purchaseEnums";
import { PurchaseItemTypes, PurchaseTypes } from "./types/purchase-classification.types";
import type { PurchaseOrder, PurchaseOrderItem } from "./types/purchase";
import Purchase from "./Purchase";

function PurchaseInModalWithFooter() {
  const [footer, setFooter] = useState<ReactNode | null>(null);

  return (
    <>
      <Purchase inModal onFooterChange={setFooter} />
      <footer data-testid="purchase-modal-footer">{footer}</footer>
    </>
  );
}

vi.mock("@/shared/hooks/useCompany", () => ({
  useCompany: () => ({ hasCompany: true }),
}));

vi.mock("@/shared/services/supplierService", () => ({
  listSuppliers: vi.fn().mockResolvedValue({
    items: [
      {
        supplierId: "11111111-1111-4111-8111-111111111111",
        name: "Proveedor",
        lastName: "",
        tradeName: "",
        documentNumber: "20123456789",
        leadTimeDays: 0,
      },
    ],
  }),
}));

vi.mock("@/shared/services/warehouseServices", () => ({
  listActiveWarehouses: vi.fn().mockResolvedValue({
    items: [
      {
        warehouseId: "22222222-2222-4222-8222-222222222222",
        name: "Central",
      },
    ],
  }),
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
  DataTable: ({
    data,
    columns,
  }: {
    data: Array<Record<string, unknown>>;
    columns: Array<{
      id: string;
      accessorKey?: string;
      cell?: (row: Record<string, unknown>, index: number) => React.ReactNode;
      onCellClick?: (row: Record<string, unknown>, index: number, event: React.MouseEvent<HTMLElement>) => void;
    }>;
  }) => (
    <div data-testid="purchase-items-table">
      {data.map((row, index) => (
        <div key={String(row.id)} data-testid={`purchase-row-${String(row.id)}`}>
          {columns.map((column) => (
            <div
              key={column.id}
              role={column.onCellClick ? "button" : undefined}
              tabIndex={column.onCellClick ? 0 : undefined}
              data-testid={`purchase-cell-${column.id}-${String(row.id)}`}
              onClick={(event) => column.onCellClick?.(row, index, event)}
            >
              {column.cell
                ? column.cell(row, index)
                : column.accessorKey
                  ? String(row[column.accessorKey] ?? "")
                  : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
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

vi.mock("@/shared/components/components/FloatingTextarea", () => ({
  FloatingTextarea: ({ label, name, value, onChange }: { label: string; name: string; value?: string | number; onChange?: React.ChangeEventHandler<HTMLTextAreaElement> }) => (
    <label>
      {label}
      <textarea name={name} value={value ?? ""} onChange={onChange} />
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
  PurchaseItemsSection: ({
    itemRows,
    itemColumns,
  }: {
    itemRows: Array<Record<string, unknown>>;
    itemColumns: Array<{
      id: string;
      accessorKey?: string;
      cell?: (row: Record<string, unknown>, index: number) => React.ReactNode;
      onCellClick?: (row: Record<string, unknown>, index: number, event: React.MouseEvent<HTMLElement>) => void;
    }>;
  }) => (
    <section data-testid="purchase-items-section">
      {itemRows.map((row, index) => (
        <div key={String(row.id)} data-testid={`purchase-row-${String(row.id)}`}>
          {itemColumns.map((column) => (
            <div
              key={column.id}
              role={column.onCellClick ? "button" : undefined}
              tabIndex={column.onCellClick ? 0 : undefined}
              data-testid={`purchase-cell-${column.id}-${String(row.id)}`}
              onClick={(event) => column.onCellClick?.(row, index, event)}
            >
              {column.cell
                ? column.cell(row, index)
                : column.accessorKey
                  ? String(row[column.accessorKey] ?? "")
                  : null}
            </div>
          ))}
        </div>
      ))}
    </section>
  ),
}));

vi.mock("@/features/sale-orders/components/editor/SaleOrderEditorSection", () => ({
  SaleOrderEditorSection: ({
    title,
    actions,
    children,
  }: {
    title: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section data-testid={`sale-order-editor-section-${title}`}>
      {actions}
      {children}
    </section>
  ),
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
  EquivalenceModal: ({
    open,
    editingItem,
    editingItemKey,
    setForm,
    onClose,
  }: {
    open: boolean;
    editingItem?: PurchaseOrderItem | null;
    editingItemKey?: string | null;
    setForm: React.Dispatch<React.SetStateAction<PurchaseOrder>>;
    onClose: () => void;
  }) => {
    if (!open) return null;

    return (
      <section
        data-testid="equivalence-modal"
        data-editing-item-key={editingItemKey ?? ""}
        data-editing-item-name={editingItem?.name ?? editingItem?.description ?? ""}
      >
        <button type="button" onClick={onClose}>
          Cerrar item
        </button>
        <button
          type="button"
          onClick={() => {
            setForm((prev) => ({
              ...prev,
              supplierId: prev.supplierId || "11111111-1111-4111-8111-111111111111",
              items: [
                ...(prev.items ?? []),
                {
                  clientKey: "manual-1",
                  skuId: "",
                  unitBase: "NIU",
                  equivalence: "NIU",
                  factor: 1,
                  afectType: AfectType.TAXED,
                  quantity: 1,
                  porcentageIgv: 18,
                  baseWithoutIgv: 0,
                  amountIgv: 0,
                  unitValue: 0,
                  unitPrice: 100,
                  purchaseValue: 0,
                  name: "Flete externo",
                  description: "Flete externo",
                  itemType: PurchaseItemTypes.SERVICE,
                  affectsStock: false,
                  generatesAsset: false,
                  isService: true,
                  isSubscription: false,
                },
              ],
            }));
            onClose();
          }}
        >
          Agregar descripcion
        </button>
      </section>
    );
  },
}));

vi.mock("./components/ModalNavegate", () => ({
  ModalNavegate: () => null,
}));

describe("Purchase form", () => {
  it("renders a direct create purchase action separate from adding a payment", () => {
    render(
      <MemoryRouter>
        <PurchaseInModalWithFooter />
      </MemoryRouter>,
    );

    const footer = screen.getByTestId("purchase-modal-footer");

    expect(within(footer).getByRole("button", { name: "Crear compra" })).toBeInTheDocument();
    expect(within(footer).getByRole("button", { name: "Agregar Pago" })).toBeInTheDocument();
  });

  it("does not render modal actions inside the scrollable body when a modal footer is available", () => {
    render(
      <MemoryRouter>
        <PurchaseInModalWithFooter />
      </MemoryRouter>,
    );

    const body = screen.getByTestId("purchase-items-section").closest(".grid");
    const footer = screen.getByTestId("purchase-modal-footer");

    expect(within(footer).getByRole("button", { name: "Crear compra" })).toBeInTheDocument();
    expect(within(footer).getByRole("button", { name: "Agregar Pago" })).toBeInTheDocument();
    expect(body).not.toContainElement(within(footer).getByRole("button", { name: "Crear compra" }));
    expect(body).not.toContainElement(within(footer).getByRole("button", { name: "Agregar Pago" }));
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

  it("shows an editable igv percentage input in the summary", () => {
    render(
      <MemoryRouter>
        <Purchase inModal />
      </MemoryRouter>,
    );

    const igvInput = screen.getByLabelText("IGV %");
    expect(igvInput).toHaveValue("18");

    fireEvent.change(igvInput, { target: { value: "10" } });

    expect(screen.getByLabelText("IGV %")).toHaveValue("10");
  });

  it("renders summary and purchase description with sale order editor sections below items", () => {
    render(
      <MemoryRouter>
        <Purchase inModal />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("sale-order-editor-section-Resumen")).toContainElement(
      screen.getByLabelText("IGV %"),
    );
    expect(screen.getByTestId("sale-order-editor-section-Descripcion")).toContainElement(
      screen.getByLabelText("Descripcion de compra"),
    );
  });

  it("sends purchase description from textarea", async () => {
    render(
      <MemoryRouter>
        <Purchase inModal />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Descripcion de compra"), {
      target: { value: "Enviar a almacen central" },
    });

    expect(screen.getByLabelText("Descripcion de compra")).toHaveValue("Enviar a almacen central");
  });

  it("opens the item modal in edit mode from product, type, and unit columns", async () => {
    render(
      <MemoryRouter>
        <Purchase inModal />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar descripcion" }));

    for (const columnId of ["name", "itemType", "unit"]) {
      expect(screen.queryByTestId("equivalence-modal")).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId(`purchase-cell-${columnId}-manual-1`));

      expect(screen.getByTestId("equivalence-modal")).toHaveAttribute("data-editing-item-key", "manual-1");
      expect(screen.getByTestId("equivalence-modal")).toHaveAttribute("data-editing-item-name", "Flete externo");

      fireEvent.click(screen.getByRole("button", { name: "Cerrar item" }));
    }
  });

  it("sends a manual item description without skuId", async () => {
    const { createPurchaseOrder } = await import("@/shared/services/purchaseService");
    vi.mocked(createPurchaseOrder).mockResolvedValue({
      type: "success",
      message: "Compra creada",
      order: { poId: "po-1" } as PurchaseOrder,
    });

    render(
      <MemoryRouter>
        <Purchase inModal />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Tipo de compra"), {
      target: { value: PurchaseTypes.SERVICE },
    });
    fireEvent.change(await screen.findByLabelText("Proveedor"), {
      target: { value: "11111111-1111-4111-8111-111111111111" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar descripcion" }));
    fireEvent.change(screen.getByLabelText("Serie"), { target: { value: "F001" } });
    fireEvent.change(screen.getByLabelText(/N.mero/i), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear compra" }));

    await waitFor(() => {
      expect(createPurchaseOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              skuId: undefined,
              description: "Flete externo",
              affectsStock: false,
            }),
          ],
        }),
      );
    });
  });

  it("does not require warehouse for non-stock purchase types", async () => {
    const { createPurchaseOrder } = await import("@/shared/services/purchaseService");
    vi.mocked(createPurchaseOrder).mockResolvedValue({
      type: "success",
      message: "Compra creada",
      order: { poId: "po-1" } as PurchaseOrder,
    });

    render(
      <MemoryRouter>
        <Purchase inModal />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Tipo de compra"), {
      target: { value: PurchaseTypes.SERVICE },
    });
    fireEvent.change(await screen.findByLabelText("Proveedor"), {
      target: { value: "11111111-1111-4111-8111-111111111111" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar descripcion" }));
    fireEvent.change(screen.getByLabelText("Serie"), { target: { value: "F001" } });
    fireEvent.change(screen.getByLabelText(/N.mero/i), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear compra" }));

    await waitFor(() => {
      expect(createPurchaseOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouseId: undefined,
        }),
      );
    });
  });
});
