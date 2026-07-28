import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EquivalenceModal } from "./EquivalenceModal";
import {
  AfectType,
  CurrencyTypes,
  PaymentFormTypes,
  PurchaseOrderStatuses,
  VoucherDocTypes,
} from "@/features/purchases/types/purchaseEnums";
import type { PurchaseOrder, PurchaseOrderItem } from "@/features/purchases/types/purchase";
import { PurchaseItemTypes, PurchaseTypes } from "../types/purchase-classification.types";

const {
  showFeedbackMock,
  listProductEquivalencesMock,
  listSkusMock,
  listUnitsMock,
} = vi.hoisted(() => ({
  showFeedbackMock: vi.fn(),
  listProductEquivalencesMock: vi.fn().mockResolvedValue([]),
  listSkusMock: vi.fn().mockResolvedValue({ items: [] }),
  listUnitsMock: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: showFeedbackMock, clearFeedback: vi.fn() }),
}));

vi.mock("@/shared/services/equivalenceService", () => ({
  listProductEquivalences: listProductEquivalencesMock,
}));

vi.mock("@/shared/services/unitService", () => ({
  listUnits: listUnitsMock,
}));

vi.mock("@/shared/services/skuService", () => ({
  listSkus: listSkusMock,
}));

vi.mock("@/shared/components/settings/modal", () => ({
  Modal: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section>
      <h1>{title}</h1>
      {children}
    </section>
  ),
}));

vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: () => <div data-testid="equivalences-table" />,
}));

vi.mock("@/shared/components/components/SystemButton", () => ({
  SystemButton: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/shared/components/components/FloatingInput", () => ({
  FloatingInput: ({
    label,
    name,
    value,
    onChange,
  }: {
    label: string;
    name: string;
    value?: string | number;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
  }) => (
    <label>
      {label}
      <input name={name} value={value ?? ""} onChange={onChange} />
    </label>
  ),
}));

vi.mock("@/shared/components/components/FloatingSelect", () => ({
  FloatingSelect: ({
    label,
    name,
    value,
    onChange,
    options = [],
  }: {
    label: string;
    name: string;
    value?: string;
    onChange?: (value: string) => void;
    options?: Array<{ value: string; label: string }>;
  }) => (
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

vi.mock("@/shared/components/components/FloatingSuggestInput", () => ({
  FloatingSuggestInput: ({
    label,
    name,
    value,
    onChange,
  }: {
    label: string;
    name: string;
    value?: string;
    onChange: (value: string) => void;
  }) => (
    <label>
      {label}
      <input name={name} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </label>
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
  totalTaxed: 0,
  totalExempted: 0,
  totalIgv: 0,
  purchaseValue: 0,
  total: 0,
  status: PurchaseOrderStatuses.DRAFT,
  payments: [],
  items: [],
  quotas: [],
});

describe("EquivalenceModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses a select for catalog item types", () => {
    render(
      <EquivalenceModal
        open
        documentType={VoucherDocTypes.FACTURA}
        primaryColor="#111111"
        igvPercent={18}
        setForm={vi.fn()}
        purchaseType={PurchaseTypes.RAW_MATERIAL}
        onClose={vi.fn()}
      />,
    );

    const productField = screen.getByLabelText("Producto o descripcion");

    expect(productField.tagName).toBe("SELECT");
  });

  it("uses a text input for non-catalog item types", () => {
    render(
      <EquivalenceModal
        open
        documentType={VoucherDocTypes.FACTURA}
        primaryColor="#111111"
        igvPercent={18}
        setForm={vi.fn()}
        purchaseType={PurchaseTypes.SERVICE}
        onClose={vi.fn()}
      />,
    );

    const descriptionField = screen.getByLabelText("Producto o descripcion");

    expect(descriptionField.tagName).toBe("INPUT");
  });

  it("adds typed non-catalog items without affecting stock", () => {
    let form = baseForm();
    const setForm = vi.fn((next: React.SetStateAction<PurchaseOrder>) => {
      form = typeof next === "function" ? next(form) : next;
    });

    function Wrapper() {
      const [open, setOpen] = useState(true);

      return (
        <EquivalenceModal
          open={open}
          documentType={VoucherDocTypes.FACTURA}
          primaryColor="#111111"
          igvPercent={18}
          setForm={setForm}
          purchaseType={PurchaseTypes.SERVICE}
          onClose={() => setOpen(false)}
        />
      );
    }

    render(<Wrapper />);

    fireEvent.change(screen.getByLabelText("Producto o descripcion"), {
      target: { value: "Flete externo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(form.items).toHaveLength(1);
    expect(form.items?.[0]).toEqual(
      expect.objectContaining({
        skuId: "",
        description: "Flete externo",
        affectsStock: false,
        itemType: PurchaseItemTypes.SERVICE,
      }),
    );
  });

  it("prefills and updates an existing non-catalog item", () => {
    let form: PurchaseOrder = {
      ...baseForm(),
      items: [
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
    };
    const setForm = vi.fn((next: React.SetStateAction<PurchaseOrder>) => {
      form = typeof next === "function" ? next(form) : next;
    });

    render(
      <EquivalenceModal
        open
        documentType={VoucherDocTypes.FACTURA}
        primaryColor="#111111"
        igvPercent={18}
        setForm={setForm}
        purchaseType={PurchaseTypes.SERVICE}
        editingItemKey="manual-1"
        editingItem={form.items?.[0]}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Editar Producto" })).toBeInTheDocument();
    expect(screen.getByLabelText("Producto o descripcion")).toHaveValue("Flete externo");

    fireEvent.change(screen.getByLabelText("Producto o descripcion"), {
      target: { value: "Flete local" },
    });
    fireEvent.change(screen.getByLabelText("Cantidad"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(form.items).toHaveLength(1);
    expect(form.items?.[0]).toEqual(
      expect.objectContaining({
        clientKey: "manual-1",
        description: "Flete local",
        quantity: 2,
      }),
    );
  });

  it("loads equivalences from the productId preserved in an edited catalog item", async () => {
    const editingItem: PurchaseOrderItem = {
      skuId: "sku-1",
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
      name: "Producto existente",
      itemType: PurchaseItemTypes.PRODUCT,
      affectsStock: true,
      sku: {
        id: "sku-1",
        productId: "product-1",
        backendSku: "00001",
        customSku: null,
        name: "Producto existente",
      },
    };

    render(
      <EquivalenceModal
        open
        documentType={VoucherDocTypes.FACTURA}
        primaryColor="#111111"
        igvPercent={18}
        setForm={vi.fn()}
        purchaseType={PurchaseTypes.INVENTORY}
        editingItemKey="sku-1"
        editingItem={editingItem}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(listProductEquivalencesMock).toHaveBeenCalledWith("product-1");
    });

    expect(showFeedbackMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: "No se encontro el producto base del SKU seleccionado",
      }),
    );
  });
});
