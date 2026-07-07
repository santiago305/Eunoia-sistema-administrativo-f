import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { SaleOrderCard } from "./SaleOrderCard";

vi.mock("./SaleOrderActionsPopover", () => ({
  SaleOrderActionsPopover: ({
    onEdit,
    order,
  }: {
    onEdit: (order: SaleOrder) => void;
    order: SaleOrder;
  }) => (
    <button type="button" aria-label="Acciones del pedido" onClick={() => onEdit(order)}>acciones</button>
  ),
}));

const order = {
  id: "order-1",
  serie: "PE",
  correlative: 12,
  total: 100,
  totalPaid: 0,
  pendingAmount: 100,
  deliveryCost: 0,
  invoiceSend: false,
  client: { fullName: "Cliente", docNumber: "123", mainPhone: "999" },
} as SaleOrder;

describe("SaleOrderCard", () => {
  it("selects the order when the card body is clicked", async () => {
    const onSelect = vi.fn();
    render(<SaleOrderCard order={order} selected={false} onSelect={onSelect} onEdit={vi.fn()} onOpenPdf={vi.fn()} onOpenPayments={vi.fn()} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByText("PE-12"));
    expect(onSelect).toHaveBeenCalledWith(order);
  });

  it("does not expose a detail action", () => {
    render(<SaleOrderCard order={order} selected={false} onSelect={vi.fn()} onEdit={vi.fn()} onOpenPdf={vi.fn()} onOpenPayments={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Detalle del pedido" })).not.toBeInTheDocument();
  });

  it("runs an action without opening the detail", async () => {
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    render(<SaleOrderCard order={order} selected={false} onSelect={onSelect} onEdit={onEdit} onOpenPdf={vi.fn()} onOpenPayments={vi.fn()} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Acciones del pedido" }));
    expect(onEdit).toHaveBeenCalledWith(order);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
