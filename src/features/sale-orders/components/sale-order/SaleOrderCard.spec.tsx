import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { SaleOrderCard } from "./SaleOrderCard";

vi.mock("./SaleOrderActionsPopover", () => ({
  SaleOrderActionsPopover: ({
    onOpenDetail,
    onEdit,
    order,
  }: {
    onOpenDetail: (order: SaleOrder) => void;
    onEdit: (order: SaleOrder) => void;
    order: SaleOrder;
  }) => (
    <>
      <button type="button" aria-label="Detalle del pedido" onClick={() => onOpenDetail(order)}>detalle</button>
      <button type="button" aria-label="Acciones del pedido" onClick={() => onEdit(order)}>acciones</button>
    </>
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
    const onOpenDetail = vi.fn();
    render(<SaleOrderCard order={order} selected={false} onSelect={onSelect} onOpenDetail={onOpenDetail} onEdit={vi.fn()} onOpenPdf={vi.fn()} onOpenPayments={vi.fn()} onOrderChanged={vi.fn()} />);
    await userEvent.click(screen.getByText("PE-12"));
    expect(onSelect).toHaveBeenCalledWith(order);
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  it("opens the detail from the detail action", async () => {
    const onSelect = vi.fn();
    const onOpenDetail = vi.fn();
    render(<SaleOrderCard order={order} selected={false} onSelect={onSelect} onOpenDetail={onOpenDetail} onEdit={vi.fn()} onOpenPdf={vi.fn()} onOpenPayments={vi.fn()} onOrderChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Detalle del pedido" }));
    expect(onOpenDetail).toHaveBeenCalledWith(order);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("runs an action without opening the detail", async () => {
    const onSelect = vi.fn();
    const onOpenDetail = vi.fn();
    const onEdit = vi.fn();
    render(<SaleOrderCard order={order} selected={false} onSelect={onSelect} onOpenDetail={onOpenDetail} onEdit={onEdit} onOpenPdf={vi.fn()} onOpenPayments={vi.fn()} onOrderChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Acciones del pedido" }));
    expect(onEdit).toHaveBeenCalledWith(order);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onOpenDetail).not.toHaveBeenCalled();
  });
});
