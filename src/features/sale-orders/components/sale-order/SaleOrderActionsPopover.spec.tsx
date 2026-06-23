import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { SaleOrderActionsPopover } from "./SaleOrderActionsPopover";

const { getTransitions } = vi.hoisted(() => ({ getTransitions: vi.fn() }));

vi.mock("@/shared/services/saleOrderService", () => ({
  getAvailableSaleOrderTransitions: getTransitions,
  changeSaleOrderState: vi.fn(),
}));

vi.mock("@/shared/components/components/ActionsPopover", () => ({
  ActionsPopover: ({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) => (
    <button type="button" onClick={() => onOpenChange?.(true)}>abrir acciones</button>
  ),
}));

vi.mock("./SaleOrderWorkflowHistoryModal", () => ({ SaleOrderWorkflowHistoryModal: () => null }));

const order = {
  id: "order-1",
  workflowId: "workflow-1",
  currentStateId: "state-1",
} as SaleOrder;

describe("SaleOrderActionsPopover", () => {
  it("loads available transitions only when the menu is first opened", async () => {
    getTransitions.mockReset();
    getTransitions.mockResolvedValue([]);
    render(<SaleOrderActionsPopover order={order} onEdit={vi.fn()} onOpenPdf={vi.fn()} onOpenPayments={vi.fn()} onOrderChanged={vi.fn()} />);

    expect(getTransitions).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "abrir acciones" }));
    await waitFor(() => expect(getTransitions).toHaveBeenCalledOnce());
    await userEvent.click(screen.getByRole("button", { name: "abrir acciones" }));
    expect(getTransitions).toHaveBeenCalledOnce();
  });
});
