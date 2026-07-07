import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleOrderItemInput } from "@/features/sale-orders/types/saleOrder";
import { getStockSku } from "@/shared/services/documentService";
import { SaleOrderItemsTable } from "./SaleOrderItemsTable";

vi.mock("@/shared/services/documentService", () => ({
  getStockSku: vi.fn(),
}));

const packItem: SaleOrderItemInput = {
  id: "item-1",
  description: "Pack verano",
  referencePackId: "pack-1",
  quantity: 1,
  unitPrice: 30,
  total: 30,
  components: [
    {
      skuId: "sku-1",
      skuLabel: "Polo azul",
      skuCode: "POL-001",
      quantity: 2,
      unitPrice: 10,
      total: 20,
    },
    {
      skuId: "sku-2",
      skuLabel: "Gorra roja",
      skuCode: "GOR-001",
      quantity: 1,
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
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenDetail={vi.fn()}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Pack" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Expandir componentes" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Reservado" })).toBeInTheDocument();
    expect(screen.getByText("Pack verano")).toBeInTheDocument();

    const packRow = screen.getByText("Pack verano").closest("tr");
    const subtableRow = packRow?.nextElementSibling;
    expect(subtableRow?.querySelector("table")).not.toBeNull();

    expect(screen.getByRole("columnheader", { name: "Producto" })).toBeInTheDocument();
    expect(screen.getByText("Polo azul")).toBeInTheDocument();
    expect(screen.getByText("Gorra roja")).toBeInTheDocument();
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
        onEdit={vi.fn()}
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
        onEdit={vi.fn()}
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
    vi.mocked(getStockSku)
      .mockResolvedValueOnce({
        warehouseId: "warehouse-1",
        stockItemId: "stock-1",
        onHand: 8,
        reserved: 3,
        available: 5,
        updatedAt: "2026-07-06T00:00:00.000Z",
      })
      .mockResolvedValueOnce({
        warehouseId: "warehouse-1",
        stockItemId: "stock-2",
        onHand: 4,
        reserved: 1,
        available: 3,
        updatedAt: "2026-07-06T00:00:00.000Z",
      });

    render(
      <SaleOrderItemsTable
        items={[packItem]}
        warehouseId="warehouse-1"
        productsEditable
        onEdit={vi.fn()}
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

  it("opens pack editing from the row and keeps expand, delete and component detail independent", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onOpenDetail = vi.fn();

    render(
      <SaleOrderItemsTable
        items={[packItem]}
        productsEditable
        onEdit={onEdit}
        onDelete={onDelete}
        onOpenDetail={onOpenDetail}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Editar Pack verano" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Pack verano"));
    expect(onEdit).toHaveBeenCalledWith(packItem, 0);
    expect(onOpenDetail).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Pack verano" }));
    expect(onDelete).toHaveBeenCalledWith(packItem, 0);
    expect(onOpenDetail).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Contraer componentes de Pack verano",
      }),
    );
    expect(onEdit).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Desplegar componentes de Pack verano",
      }),
    );

    fireEvent.click(screen.getByText("Polo azul"));
    expect(onOpenDetail).toHaveBeenCalledWith(packItem, 0, packItem.components?.[0]);
  });
});
