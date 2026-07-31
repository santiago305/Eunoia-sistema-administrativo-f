import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SaleOrder } from "../../types/saleOrder";
import { SaleOrderBulkTrackingModal } from "./SaleOrderBulkTrackingModal";

const orders = [
  { id: "order-1", serie: "P", correlative: 1, preguide: false, prepared: false, client: { fullName: "Cliente 1" } },
  { id: "order-2", serie: "P", correlative: 2, preguide: true, prepared: false, client: { fullName: "Cliente 2" } },
  { id: "order-3", serie: "P", correlative: 3, preguide: false, prepared: true, client: { fullName: "Cliente 3" } },
  { id: "order-4", serie: "P", correlative: 4, preguide: true, prepared: true, client: { fullName: "Cliente 4" } },
] as SaleOrder[];

function chooseSelect(label: string, option: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(label, "i") }));
  fireEvent.mouseDown(screen.getByRole("option", { name: option }));
}

describe("SaleOrderBulkTrackingModal", () => {
  it("filters selected orders and submits one tracking field", () => {
    const onSubmit = vi.fn();
    render(
      <SaleOrderBulkTrackingModal
        open
        selectedOrders={orders}
        canUpdatePreguide
        canUpdatePrepared
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("Total: 4. Visibles: 4.")).toBeInTheDocument();

    chooseSelect("Filtrar por preguía", "Sin preguía");
    expect(screen.getByText("Total: 4. Visibles: 2.")).toBeInTheDocument();

    chooseSelect("Resultado de preguía", "Con preguía");
    fireEvent.click(screen.getByRole("button", { name: "Ejecutar" }));

    expect(onSubmit).toHaveBeenCalledWith({
      saleOrderIds: ["order-1", "order-3"],
      preguide: true,
    });
  });

  it("offers only execution modes authorized by permissions", () => {
    render(
      <SaleOrderBulkTrackingModal
        open
        selectedOrders={orders}
        canUpdatePreguide={false}
        canUpdatePrepared
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /ejecutar por/i }));
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByRole("option", { name: "Preparación" })).toBeInTheDocument();
    expect(within(listbox).queryByRole("option", { name: "Preguía" })).toBeNull();
    expect(screen.getByRole("button", { name: /resultado de preparación/i })).toBeInTheDocument();
  });

  it("disables execution when filters leave no applicable orders", () => {
    render(
      <SaleOrderBulkTrackingModal
        open
        selectedOrders={[orders[0]]}
        canUpdatePreguide
        canUpdatePrepared
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    chooseSelect("Filtrar por preguía", "Con preguía");
    chooseSelect("Resultado de preguía", "Sin preguía");

    expect(screen.getByText("Total: 1. Visibles: 0.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ejecutar" })).toBeDisabled();
  });
});
