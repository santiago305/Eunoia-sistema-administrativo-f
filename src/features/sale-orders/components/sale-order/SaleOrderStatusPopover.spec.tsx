import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { TRANSITION_PURPOSES, type AvailableTransition } from "@/features/workflows/types/workflow";
import { SaleOrderStatusPopover } from "./SaleOrderStatusPopover";

const { changeState, getTransitions, listPayments, cancelOrder, listCancellationTargets, onOrderChanged, showFeedback } = vi.hoisted(() => ({
  changeState: vi.fn(),
  getTransitions: vi.fn(),
  listPayments: vi.fn(),
  cancelOrder: vi.fn(),
  listCancellationTargets: vi.fn(),
  onOrderChanged: vi.fn(),
  showFeedback: vi.fn(),
}));

vi.mock("@/shared/services/incomeService", () => ({ listIncomeCancellationTargets: listCancellationTargets }));

vi.mock("@/shared/services/saleOrderService", () => ({
  changeSaleOrderState: changeState,
  getAvailableSaleOrderTransitions: getTransitions,
  listSaleOrderPayments: listPayments,
  cancelSaleOrder: cancelOrder,
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true }),
}));

vi.mock("@/shared/hooks/useAuth", () => ({
  useAuth: () => ({ userId: "unit-user" }),
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

  it("routes cancellation through payment resolution instead of the generic transition", async () => {
    const cancelTransition = { ...transition, id: "cancel-transition", name: "Cancelar pedido", code: "CANCEL", purpose: TRANSITION_PURPOSES.CANCEL } satisfies AvailableTransition;
    getTransitions.mockReset().mockResolvedValue([cancelTransition]);
    listPayments.mockReset().mockResolvedValue([]);
    cancelOrder.mockReset().mockResolvedValue({ saleOrderId: "order-1", currentStateId: "cancelled" });
    changeState.mockReset();
    onOrderChanged.mockReset();

    render(<SaleOrderStatusPopover order={order} onOrderChanged={onOrderChanged} />);
    await userEvent.click(screen.getByRole("button", { name: "Pendiente" }));
    await userEvent.click(screen.getByText("Cancelar pedido"));

    expect(changeState).not.toHaveBeenCalled();
    expect(await screen.findByText(/No hay ingresos pendientes ni contabilizados/)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/Confirmo las resoluciones indicadas/));
    await userEvent.click(screen.getByRole("button", { name: /Resolver y cancelar pedido/ }));

    await waitFor(() => expect(cancelOrder).toHaveBeenCalledWith("order-1", expect.objectContaining({ resolutions: [] })));
    expect(onOrderChanged).toHaveBeenCalledWith("order-1");
  });

  it("retries an uncertain cancellation with its original request and key, without allowing edits", async () => {
    getTransitions.mockReset().mockResolvedValue([{ ...transition, id: "cancel-transition", name: "Cancelar pedido", purpose: TRANSITION_PURPOSES.CANCEL }]);
    listPayments.mockReset().mockResolvedValue([]);
    cancelOrder.mockReset()
      .mockRejectedValueOnce(new Error("network connection lost"))
      .mockResolvedValueOnce({ saleOrderId: "order-1", currentStateId: "cancelled" });
    onOrderChanged.mockReset();
    sessionStorage.clear();

    render(<SaleOrderStatusPopover order={order} onOrderChanged={onOrderChanged} />);
    await userEvent.click(screen.getByRole("button", { name: "Pendiente" }));
    await userEvent.click(screen.getByText("Cancelar pedido"));
    await userEvent.click(await screen.findByLabelText(/Confirmo las resoluciones indicadas/));
    await userEvent.click(screen.getByRole("button", { name: "Resolver y cancelar pedido" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/Se conservaron sus decisiones/);
    const firstRequest = cancelOrder.mock.calls[0];
    expect(firstRequest[1].idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
    expect(screen.getByLabelText(/Confirmo las resoluciones indicadas/)).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar cancelación segura" }));
    await waitFor(() => expect(cancelOrder).toHaveBeenCalledTimes(2));
    expect(cancelOrder.mock.calls[1]).toEqual(firstRequest);
    expect(onOrderChanged).toHaveBeenCalledWith("order-1");
    expect(sessionStorage.length).toBe(0);
  });

  it("requires a compatible target before transferring a pending payment during cancellation", async () => {
    getTransitions.mockReset().mockResolvedValue([{ ...transition, id: "cancel-transition", name: "Cancelar pedido", purpose: TRANSITION_PURPOSES.CANCEL }]);
    listPayments.mockReset().mockResolvedValue([{
      id: "income-1", version: 2, status: "PENDING_CONFIRMATION", amount: 25, currency: "PEN", method: "Transferencia",
      operationNumber: "OP-1", date: "2026-10-02", note: null, bankAccount: null, createdAt: "2026-10-02",
    }]);
    listCancellationTargets.mockReset().mockResolvedValue([{
      saleOrderId: "order-2", saleOrderNumber: "SO-2", clientName: "Cliente", total: 100, available: 75, currency: "PEN",
    }]);
    cancelOrder.mockReset().mockResolvedValue({ saleOrderId: "order-1" });

    render(<SaleOrderStatusPopover order={order} onOrderChanged={onOrderChanged} />);
    await userEvent.click(screen.getByRole("button", { name: "Pendiente" }));
    await userEvent.click(screen.getByText("Cancelar pedido"));
    await userEvent.selectOptions(await screen.findByLabelText("Resolución"), "TRANSFER_PENDING");
    expect(await screen.findByText(/SO-2 · Cliente · Disponible/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Pedido destino"), "order-2");
    await userEvent.type(screen.getByLabelText(/Motivo/), "Ingreso asociado a otro pedido");
    await userEvent.click(screen.getByLabelText(/Confirmo las resoluciones indicadas/));
    await userEvent.click(screen.getByRole("button", { name: /Resolver y cancelar pedido/ }));

    await waitFor(() => expect(cancelOrder).toHaveBeenCalledWith("order-1", expect.objectContaining({
      resolutions: [expect.objectContaining({ incomeId: "income-1", action: "TRANSFER_PENDING", targetSaleOrderId: "order-2" })],
    })));
  });

});
