import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { SaleOrderActionsPopover } from "./SaleOrderActionsPopover";

const { getTransitions, onOpenPdf } = vi.hoisted(() => ({
  getTransitions: vi.fn(),
  onOpenPdf: vi.fn(),
}));

vi.mock("@/shared/services/saleOrderService", () => ({
  getAvailableSaleOrderTransitions: getTransitions,
  changeSaleOrderState: vi.fn(),
}));

vi.mock("@/shared/components/components/ActionsPopover", () => ({
  ActionsPopover: ({ actions, onOpenChange }: { actions: Array<{ id: string; label: string; onClick?: () => void; disabled?: boolean }>; onOpenChange?: (open: boolean) => void }) => (
    <div>
      <button type="button" onClick={() => onOpenChange?.(true)}>abrir acciones</button>
      {actions.map((action) => (
        <button key={action.id} type="button" onClick={action.onClick} disabled={action.disabled}>
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("./SaleOrderWorkflowHistoryModal", () => ({ SaleOrderWorkflowHistoryModal: () => null }));

const order = {
  id: "order-1",
  workflowId: "workflow-1",
  currentStateId: "state-1",
} as SaleOrder;

describe("SaleOrderActionsPopover", () => {
  it("keeps only document actions and does not load workflow transitions", async () => {
    getTransitions.mockReset();
    getTransitions.mockResolvedValue([]);
    onOpenPdf.mockReset();
    render(
      <SaleOrderActionsPopover
        order={order}
        onOpenPdf={onOpenPdf}
      />,
    );

    expect(getTransitions).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "abrir acciones" }));
    expect(getTransitions).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Ver PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Factura" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Boleta" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pagos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Historial del tipo" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ver PDF" }));
    expect(onOpenPdf).toHaveBeenCalledWith(order);
  });

  it("shows logical delete and audit actions for active orders", async () => {
    render(
      <SaleOrderActionsPopover
        order={{ ...order, isActive: true } as SaleOrder}
        onOpenPdf={onOpenPdf}
        onToggleActive={vi.fn()}
        onOpenAudit={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "abrir acciones" }));

    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Auditoria" })).toBeInTheDocument();
  });

  it("shows restore action for inactive orders", async () => {
    render(
      <SaleOrderActionsPopover
        order={{ ...order, isActive: false } as SaleOrder}
        onOpenPdf={onOpenPdf}
        onToggleActive={vi.fn()}
        onOpenAudit={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "abrir acciones" }));

    expect(screen.getByRole("button", { name: "Restaurar" })).toBeInTheDocument();
  });
});
