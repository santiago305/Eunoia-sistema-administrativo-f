import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleOrderItemInput } from "@/features/sale-orders/types/saleOrder";
import { getSaleOrderStocksBySkuIds } from "@/shared/services/saleOrderStockService";
import { SaleOrderItemsTable } from "./SaleOrderItemsTable";

vi.mock("@/shared/services/saleOrderStockService", () => ({
  getSaleOrderStocksBySkuIds: vi.fn(),
}));

vi.mock(
  "@/features/sale-orders/components/modal-create/SaleOrderAddSkuModal",
  () => ({
    SaleOrderAddSkuModal: ({
      open,
      onAdd,
    }: {
      open: boolean;
      onAdd: (selection: {
        skuId: string;
        label: string;
        basePrice: number;
        unitPrice: number;
        quantity: number;
        skuImage?: string | null;
      }) => void;
    }) =>
      open ? (
        <button
          type="button"
          onClick={() =>
            onAdd({
              skuId: "sku-3",
              label: "Lentes negros",
              basePrice: 8,
              unitPrice: 5,
              quantity: 2,
              skuImage: "lentes.png",
            })
          }
        >
          Confirmar SKU de prueba
        </button>
      ) : null,
  }),
);

const packItem: SaleOrderItemInput = {
  id: "item-1",
  description: "Pack verano",
  referencePackId: "pack-1",
  quantity: 1,
  basePrice: 40,
  unitPrice: 30,
  total: 30,
  components: [
    {
      skuId: "sku-1",
      skuLabel: "Polo azul",
      skuCode: "POL-001",
      quantity: 2,
      basePrice: 15,
      unitPrice: 10,
      total: 20,
    },
    {
      skuId: "sku-2",
      skuLabel: "Gorra roja",
      skuCode: "GOR-001",
      quantity: 1,
      basePrice: 12,
      unitPrice: 10,
      total: 10,
    },
  ],
};

describe("SaleOrderItemsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a pack table followed by its SKU component subtable", () => {
    render(
      <SaleOrderItemsTable
        items={[packItem]}
        productsEditable
        onChangeItem={vi.fn()}
        onDelete={vi.fn()}
        onOpenDetail={vi.fn()}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Pack" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Expandir componentes" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader", { name: "Precio base" })).toHaveLength(2);
    expect(screen.getByRole("columnheader", { name: "Reservado" })).toBeInTheDocument();
    expect(screen.getByText("Pack verano")).toBeInTheDocument();

    const packRow = screen.getByText("Pack verano").closest("tr");
    const subtableRow = packRow?.nextElementSibling;
    expect(subtableRow?.querySelector("table")).not.toBeNull();

    expect(screen.getByRole("columnheader", { name: "Producto" })).toBeInTheDocument();
    expect(screen.getByText("Polo azul")).toBeInTheDocument();
    expect(screen.getByText("Gorra roja")).toBeInTheDocument();
  });


  it("adds a product to the pack from the subtable header", async () => {
    const user = userEvent.setup();
    const onChangeItem = vi.fn();

    render(
      <SaleOrderItemsTable
        items={[packItem]}
        productsEditable
        onChangeItem={onChangeItem}
        onDelete={vi.fn()}
        onOpenDetail={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Adicionar producto a Pack verano",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar SKU de prueba" }),
    );

    expect(onChangeItem).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 40,
        unitPrice: 40,
        components: [
          expect.objectContaining({ skuId: "sku-1" }),
          expect.objectContaining({ skuId: "sku-2" }),
          expect.objectContaining({
            skuId: "sku-3",
            skuLabel: "Lentes negros",
            skuImage: "lentes.png",
            quantity: 2,
            basePrice: 8,
            unitPrice: 5,
            total: 10,
          }),
        ],
      }),
      0,
    );
  });

  it("formats component products from sku details before legacy labels", () => {
    render(
      <SaleOrderItemsTable
        items={[
          {
            ...packItem,
            components: [
              {
                skuId: "sku-1",
                skuLabel: "Etiqueta antigua",
                skuCode: "LEGACY-001",
                sku: {
                  id: "sku-1",
                  backendSku: "10017",
                  customSku: "EVA01893",
                  name: "JABON AZUFRE",
                  barcode: null,
                  image: null,
                },
                attributes: [{ code: "variant", name: "Variante", value: "AZUFRE" }],
                quantity: 2,
                unitPrice: 10,
                total: 20,
              },
            ],
          },
        ]}
        productsEditable
        onChangeItem={vi.fn()}
        onDelete={vi.fn()}
        onOpenDetail={vi.fn()}
      />,
    );

    expect(screen.getByText("JABON AZUFRE AZUFRE -10017 (EVA01893)")).toBeInTheDocument();
    expect(screen.queryByText("Etiqueta antigua")).not.toBeInTheDocument();
  });

  it("starts with the component subtable expanded and can collapse and reopen it", async () => {
    const user = userEvent.setup();

    render(
      <SaleOrderItemsTable
        items={[packItem]}
        productsEditable
        onChangeItem={vi.fn()}
        onDelete={vi.fn()}
        onOpenDetail={vi.fn()}
      />,
    );

    expect(screen.getByText("Polo azul")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Contraer componentes de Pack verano",
      }),
    );
    expect(screen.queryByText("Polo azul")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Desplegar componentes de Pack verano",
      }),
    );
    expect(screen.getByText("Polo azul")).toBeInTheDocument();
  });

  it("derives pack flags and component stock from the selected warehouse", async () => {
    vi.mocked(getSaleOrderStocksBySkuIds).mockResolvedValueOnce({
      "sku-1": {
        warehouseId: "warehouse-1",
        stockItemId: "stock-1",
        onHand: 8,
        reserved: 3,
        available: 5,
        updatedAt: "2026-07-06T00:00:00.000Z",
      },
      "sku-2": {
        warehouseId: "warehouse-1",
        stockItemId: "stock-2",
        onHand: 4,
        reserved: 1,
        available: 3,
        updatedAt: "2026-07-06T00:00:00.000Z",
      },
    });

    render(
      <SaleOrderItemsTable
        items={[packItem]}
        warehouseId="warehouse-1"
        reserveBool={true}
        productsEditable
        onChangeItem={vi.fn()}
        onDelete={vi.fn()}
        onOpenDetail={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("pack-stock-item-1")).toHaveTextContent("Sí");
      expect(screen.getByTestId("pack-reserved-item-1")).toHaveTextContent("Sí");
    });
    expect(screen.getByTestId("component-stock-sku-1")).toHaveTextContent("5");
    expect(screen.getByTestId("component-stock-sku-2")).toHaveTextContent("3");
  });


  it("does not reload stock when only prices change", async () => {
    vi.mocked(getSaleOrderStocksBySkuIds).mockResolvedValue({
      "sku-1": {
        warehouseId: "warehouse-1",
        stockItemId: "stock-1",
        onHand: 8,
        reserved: 0,
        available: 8,
        updatedAt: "2026-07-06T00:00:00.000Z",
      },
      "sku-2": {
        warehouseId: "warehouse-1",
        stockItemId: "stock-2",
        onHand: 4,
        reserved: 0,
        available: 4,
        updatedAt: "2026-07-06T00:00:00.000Z",
      },
    });

    const props = {
      warehouseId: "warehouse-1",
      productsEditable: true,
      onChangeItem: vi.fn(),
      onDelete: vi.fn(),
      onOpenDetail: vi.fn(),
    };

    const { rerender } = render(
      <SaleOrderItemsTable items={[packItem]} {...props} />,
    );

    await waitFor(() =>
      expect(getSaleOrderStocksBySkuIds).toHaveBeenCalledTimes(1),
    );

    rerender(
      <SaleOrderItemsTable
        items={[
          {
            ...packItem,
            unitPrice: 25,
            total: 25,
            components: packItem.components?.map((component) => ({
              ...component,
              unitPrice: component.unitPrice + 1,
              total: component.total + component.quantity,
            })),
          },
        ]}
        {...props}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(getSaleOrderStocksBySkuIds).toHaveBeenCalledTimes(1);
  });

  it("reloads stock when a required component quantity changes", async () => {
    vi.mocked(getSaleOrderStocksBySkuIds).mockResolvedValue({
      "sku-1": {
        warehouseId: "warehouse-1",
        stockItemId: "stock-1",
        onHand: 8,
        reserved: 0,
        available: 8,
        updatedAt: "2026-07-06T00:00:00.000Z",
      },
      "sku-2": {
        warehouseId: "warehouse-1",
        stockItemId: "stock-2",
        onHand: 4,
        reserved: 0,
        available: 4,
        updatedAt: "2026-07-06T00:00:00.000Z",
      },
    });

    const props = {
      warehouseId: "warehouse-1",
      productsEditable: true,
      onChangeItem: vi.fn(),
      onDelete: vi.fn(),
      onOpenDetail: vi.fn(),
    };

    const { rerender } = render(
      <SaleOrderItemsTable items={[packItem]} {...props} />,
    );

    await waitFor(() =>
      expect(getSaleOrderStocksBySkuIds).toHaveBeenCalledTimes(1),
    );

    rerender(
      <SaleOrderItemsTable
        items={[
          {
            ...packItem,
            components: packItem.components?.map((component, index) =>
              index === 0
                ? {
                    ...component,
                    quantity: 3,
                    total: 30,
                  }
                : component,
            ),
          },
        ]}
        {...props}
      />,
    );

    await waitFor(() =>
      expect(getSaleOrderStocksBySkuIds).toHaveBeenCalledTimes(2),
    );
    expect(getSaleOrderStocksBySkuIds).toHaveBeenLastCalledWith(
      expect.objectContaining({
        warehouseId: "warehouse-1",
        skuIds: ["sku-1", "sku-2"],
        forceRefresh: true,
        requestKey: expect.stringContaining("sku-1:3"),
      }),
    );
  });

  it("uses the sale order reserve flag instead of stock reserved amounts", async () => {
    vi.mocked(getSaleOrderStocksBySkuIds).mockResolvedValueOnce({
      "sku-1": {
        warehouseId: "warehouse-1",
        stockItemId: "stock-1",
        onHand: 8,
        reserved: 3,
        available: 5,
        updatedAt: "2026-07-06T00:00:00.000Z",
      },
      "sku-2": {
        warehouseId: "warehouse-1",
        stockItemId: "stock-2",
        onHand: 4,
        reserved: 1,
        available: 3,
        updatedAt: "2026-07-06T00:00:00.000Z",
      },
    });

    render(
      <SaleOrderItemsTable
        items={[packItem]}
        warehouseId="warehouse-1"
        reserveBool={false}
        productsEditable
        onChangeItem={vi.fn()}
        onDelete={vi.fn()}
        onOpenDetail={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("pack-stock-item-1")).toHaveTextContent("Sí");
      expect(screen.getByTestId("pack-reserved-item-1")).toHaveTextContent("No");
    });
  });


  it("shows OUT for stock and reserved labels when stock is consumed", async () => {
    render(
      <SaleOrderItemsTable
        items={[packItem]}
        warehouseId="warehouse-1"
        reserveBool={false}
        stockStatus="CONSUMED"
        productsEditable
        onChangeItem={vi.fn()}
        onDelete={vi.fn()}
        onOpenDetail={vi.fn()}
      />,
    );

    expect(screen.getByTestId("pack-stock-item-1")).toHaveTextContent("OUT");
    expect(screen.getByTestId("pack-reserved-item-1")).toHaveTextContent("OUT");
    expect(screen.getByTestId("component-stock-sku-1")).toHaveTextContent("OUT");
    expect(screen.getByTestId("component-stock-sku-2")).toHaveTextContent("OUT");
    expect(getSaleOrderStocksBySkuIds).not.toHaveBeenCalled();
  });

  it("edits pack values directly without opening a modal from the row", () => {
    const onChangeItem = vi.fn();
    const onDelete = vi.fn();
    const onOpenDetail = vi.fn();

    render(
      <SaleOrderItemsTable
        items={[packItem]}
        productsEditable
        onChangeItem={onChangeItem}
        onDelete={onDelete}
        onOpenDetail={onOpenDetail}
      />,
    );

    fireEvent.click(screen.getByText("Pack verano"));
    expect(onChangeItem).not.toHaveBeenCalled();
    expect(onOpenDetail).not.toHaveBeenCalled();

    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "Precio unitario del pack Pack verano",
      }),
      { target: { value: "25" } },
    );

    expect(onChangeItem).toHaveBeenCalledWith(
      expect.objectContaining({
        unitPrice: 25,
        total: 25,
        components: [
          expect.objectContaining({ total: 12.5 }),
          expect.objectContaining({ total: 12.5 }),
        ],
      }),
      0,
    );

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Pack verano" }));
    expect(onDelete).toHaveBeenCalledWith(packItem, 0);
  });

  it("edits the pack description even when pack products are not editable", () => {
    const onChangeItem = vi.fn();

    render(
      <SaleOrderItemsTable
        items={[packItem]}
        productsEditable={false}
        onChangeItem={onChangeItem}
        onDelete={vi.fn()}
        onOpenDetail={vi.fn()}
      />,
    );

    fireEvent.change(
      screen.getByRole("textbox", {
        name: "Descripcion del pack Pack verano",
      }),
      { target: { value: "Pack invierno" } },
    );

    expect(onChangeItem).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Pack invierno",
      }),
      0,
    );
  });

  it("recalculates the pack when a component is edited from the subtable", () => {
    const onChangeItem = vi.fn();

    render(
      <SaleOrderItemsTable
        items={[packItem]}
        productsEditable
        onChangeItem={onChangeItem}
        onDelete={vi.fn()}
        onOpenDetail={vi.fn()}
      />,
    );

    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Precio unitario de Polo azul" }),
      { target: { value: "12" } },
    );

    expect(onChangeItem).toHaveBeenCalledWith(
      expect.objectContaining({
        unitPrice: 34,
        total: 34,
        components: [
          expect.objectContaining({ unitPrice: 12, total: 24 }),
          expect.objectContaining({ unitPrice: 10, total: 10 }),
        ],
      }),
      0,
    );
  });

  it("opens component detail only from its image", () => {
    const onOpenDetail = vi.fn();

    render(
      <SaleOrderItemsTable
        items={[packItem]}
        productsEditable
        onChangeItem={vi.fn()}
        onDelete={vi.fn()}
        onOpenDetail={onOpenDetail}
      />,
    );

    fireEvent.click(screen.getByText("Polo azul"));
    expect(onOpenDetail).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Ver imagen de Polo azul" }),
    );
    expect(onOpenDetail).toHaveBeenCalledWith(
      packItem,
      0,
      packItem.components?.[0],
    );
  });

});
