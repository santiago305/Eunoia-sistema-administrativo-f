import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaleOrderWorkflowPanel } from "./SaleOrderWorkflowPanel";

const mocks = vi.hoisted(() => ({
  changeState: vi.fn(),
  listTransitions: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/shared/services/saleOrderService", () => ({
  changeSaleOrderState: mocks.changeState,
  getAvailableSaleOrderTransitions: mocks.listTransitions,
}));

vi.mock("@/shared/hooks/use-toast", () => ({
  toast: mocks.toast,
}));

vi.mock("@/features/workflows/components/WorkflowAssignmentModal", () => ({
  WorkflowAssignmentModal: () => null,
}));

describe("SaleOrderWorkflowPanel", () => {
  beforeEach(() => {
    mocks.changeState.mockReset();
    mocks.listTransitions.mockReset();
    mocks.toast.mockReset();
    mocks.listTransitions.mockResolvedValue([
      {
        id: "transition-1",
        name: "Asignar almacén",
        code: "ASSIGN_WAREHOUSE",
        purpose: "STANDARD",
        fromState: null,
        toState: null,
        available: true,
        failures: [],
        conditions: [],
      },
    ]);
  });

  it("shows successful action warnings without failing the transition", async () => {
    mocks.changeState.mockResolvedValue({
      type: "success",
      data: { id: "order-1" },
      warnings: ["Ya hay un almacén seleccionado"],
    });
    const onOrderChanged = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <SaleOrderWorkflowPanel
        saleOrderId="order-1"
        workflowId="workflow-1"
        currentStateId="state-1"
        onOrderChanged={onOrderChanged}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "Asignar almacén" }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "Acción omitida",
        description: "Ya hay un almacén seleccionado",
      }),
    );
    expect(onOrderChanged).toHaveBeenCalled();
  });
});
