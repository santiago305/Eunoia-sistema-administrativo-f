import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkflowEditorModal } from "./WorkflowEditorModal";

const workflowServiceMocks = vi.hoisted(() => ({
  listManagedWorkflows: vi.fn(),
  listWorkflowConditions: vi.fn(),
  listWorkflowActions: vi.fn(),
  listSaleOrderStates: vi.fn(),
  getWorkflow: vi.fn(),
  updateFullWorkflow: vi.fn(),
  createFullWorkflow: vi.fn(),
  createWorkflowDraft: vi.fn(),
  getWorkflowPublishPreview: vi.fn(),
  publishWorkflowDraft: vi.fn(),
  listWorkflowDraftTests: vi.fn(),
  startWorkflowDraftTest: vi.fn(),
  revertWorkflowDraftTest: vi.fn(),
}));

vi.mock("@/shared/services/workflowService", () => workflowServiceMocks);

vi.mock("./WorkflowCanvas", () => ({
  WorkflowCanvas: () => <div data-testid="workflow-canvas" />,
}));

vi.mock("./WorkflowGlobalTransitions", () => ({
  WorkflowGlobalTransitions: (props: { onAddRunAction: () => void }) => (
    <button type="button" onClick={props.onAddRunAction}>
      Agregar accion global
    </button>
  ),
}));

vi.mock("./WorkflowPropertiesPanel", () => ({
  WorkflowPropertiesPanel: () => <div data-testid="workflow-properties" />,
}));

vi.mock("./SaleOrderStateFormModal", () => ({
  SaleOrderStateFormModal: () => null,
}));

vi.mock("./WorkflowDraftTestModal", () => ({
  WorkflowDraftTestModal: () => null,
}));

describe("WorkflowEditorModal", () => {
  it("loads only minimal catalogs on open and loads condition/action catalogs when a transition is selected", async () => {
    const user = userEvent.setup();
    workflowServiceMocks.listManagedWorkflows.mockResolvedValue([]);
    workflowServiceMocks.listSaleOrderStates.mockResolvedValue([
      { id: "state-1", name: "Pendiente", color: "#64748b" },
    ]);
    workflowServiceMocks.listWorkflowConditions.mockResolvedValue([]);
    workflowServiceMocks.listWorkflowActions.mockResolvedValue([]);

    render(<WorkflowEditorModal open onClose={vi.fn()} />);

    await waitFor(() => {
      expect(workflowServiceMocks.listManagedWorkflows).toHaveBeenCalledTimes(1);
      expect(workflowServiceMocks.listSaleOrderStates).toHaveBeenCalledTimes(1);
    });
    expect(workflowServiceMocks.listWorkflowConditions).not.toHaveBeenCalled();
    expect(workflowServiceMocks.listWorkflowActions).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Agregar accion global" }));

    await waitFor(() => {
      expect(workflowServiceMocks.listWorkflowConditions).toHaveBeenCalledTimes(1);
      expect(workflowServiceMocks.listWorkflowActions).toHaveBeenCalledTimes(1);
    });
  });
});
