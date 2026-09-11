import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { TRANSITION_PURPOSES, type AvailableTransition } from "@/features/workflows/types/workflow";
import { SaleOrderStatusPopover } from "./SaleOrderStatusPopover";

const { changeState, getTransitions, onOrderChanged, showFeedback } = vi.hoisted(() => ({
  changeState: vi.fn(),
  getTransitions: vi.fn(),
  onOrderChanged: vi.fn(),
  showFeedback: vi.fn(),
}));

vi.mock("@/shared/services/saleOrderService", () => ({
  changeSaleOrderState: changeState,
  getAvailableSaleOrderTransitions: getTransitions,
}));

vi.mock("@/features/sale-orders/utils/showTransitionWarnings", () => ({
  showTransitionWarnings: vi.fn(),
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback, clearFeedback: vi.fn() }),
}));

vi.mock("./SaleOrderWorkflowHistoryModal", () => ({
  SaleOrderWorkflowHistoryModal: ({ open }: { open: boolean }) => (open ? <div>historial abierto</div> : null),
}));

const order = {
  id: "order-1",
  workflowId: "workflow-1",
  currentStateId: "state-1",
  currentState: {
    id: "state-1",
    name: "Pendiente",
    code: "PENDING",
    color: "#64748b",
    isInitial: true,
    isFinal: false,
    isActive: true,
  },
} as SaleOrder;

const transition = {
  id: "transition-1",
  name: "Confirmar",
  code: "CONFIRM",
  purpose: TRANSITION_PURPOSES.STANDARD,
  fromState: { id: "state-1", name: "Pendiente", code: "PENDING", color: "#64748b" },
  toState: { id: "state-2", name: "Confirmado", code: "CONFIRMED", color: "#16a34a", isFinal: false },
  available: true,
  failures: [],
  conditions: [],
} satisfies AvailableTransition;

describe("SaleOrderStatusPopover", () => {
  it("moves workflow transitions and history into the status cell", async () => {
    getTransitions.mockReset();
    getTransitions.mockResolvedValue([transition]);
    changeState.mockReset();
    changeState.mockResolvedValue({ warnings: [] });
    onOrderChanged.mockReset();

    render(<SaleOrderStatusPopover order={order} onOrderChanged={onOrderChanged} />);

    expect(screen.getByRole("button", { name: "Pendiente" })).toBeInTheDocument();
    expect(getTransitions).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Pendiente" }));

    await waitFor(() => expect(getTransitions).toHaveBeenCalledWith("order-1"));
    expect(screen.getByText("Historial del tipo")).toBeInTheDocument();
    expect(screen.getByText("Confirmar")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Historial del tipo"));
    await waitFor(() =>
      expect(screen.getByText("historial abierto")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: "Pendiente" }));
    await userEvent.click(screen.getByText("Confirmar"));

    await waitFor(() => expect(changeState).toHaveBeenCalledWith("order-1", "transition-1", { source: "sale-order-status-actions" }));
    expect(onOrderChanged).toHaveBeenCalledWith("order-1");
  });

  it("shows the workflow failure reason when changing state returns 422", async () => {
    getTransitions.mockReset();
    getTransitions.mockResolvedValue([transition]);
    changeState.mockReset();
    changeState.mockRejectedValue({
      response: {
        status: 422,
        data: {
          message: "La transicion no cumple sus condiciones",
          details: {
            failures: [
              { type: "HAS_STOCK", reason: "El pedido no tiene stock suficiente" },
              { type: "SALE_ORDER_FIELD_REQUIRED", reason: "Direccion de cliente requerida" },
            ],
          },
        },
      },
    });
    onOrderChanged.mockReset();
    showFeedback.mockReset();

    render(<SaleOrderStatusPopover order={order} onOrderChanged={onOrderChanged} />);

    await userEvent.click(screen.getByRole("button", { name: "Pendiente" }));
    await waitFor(() => expect(screen.getByText("Confirmar")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Confirmar"));

    await waitFor(() =>
      expect(showFeedback).toHaveBeenCalledWith({
        type: "error",
        title: "No se pudo cambiar el estado",
        message:
          "El pedido no tiene stock suficiente. Direccion de cliente requerida",
      }),
    );
    expect(onOrderChanged).not.toHaveBeenCalled();
  });
});
