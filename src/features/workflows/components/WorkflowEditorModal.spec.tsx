import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  WorkflowDraft,
  WorkflowDraftTransition,
} from "@/features/workflows/types/workflow";
import { WorkflowEditorModal } from "./WorkflowEditorModal";

const workflowServiceMocks = vi.hoisted(() => ({
  listManagedWorkflows: vi.fn(),
  listWorkflowConditions: vi.fn(),
  listWorkflowActions: vi.fn(),
  listSaleOrderStates: vi.fn(),
  getWorkflow: vi.fn(),
  updateFullWorkflow: vi.fn(),
  updatePublishedWorkflowRules: vi.fn(),
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
  WorkflowCanvas: (props: {
    draft: WorkflowDraft;
    readOnly?: boolean;
    onSelect: (id: string) => void;
  }) => (
    <div
      data-testid="workflow-canvas"
      data-read-only={String(props.readOnly ?? false)}
    >
      {props.draft.transitions[0] ? (
        <button
          type="button"
          onClick={() => props.onSelect(props.draft.transitions[0].clientId)}
        >
          Seleccionar transicion
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("./WorkflowGlobalTransitions", () => ({
  WorkflowGlobalTransitions: (props: { onAddRunAction: () => void }) => (
    <button type="button" onClick={props.onAddRunAction}>
      Agregar accion global
    </button>
  ),
}));

vi.mock("./WorkflowPropertiesPanel", () => ({
  WorkflowPropertiesPanel: (props: {
    draft: WorkflowDraft;
    selectedId: string | null;
    publishedRulesOnly?: boolean;
    onTransitionChange: (transition: WorkflowDraftTransition) => void;
  }) => {
    const transition = props.draft.transitions.find(
      (item) => item.clientId === props.selectedId,
    );
    return (
      <div
        data-testid="workflow-properties"
        data-rules-only={String(props.publishedRulesOnly ?? false)}
      >
        {transition ? (
          <button
            type="button"
            onClick={() =>
              props.onTransitionChange({
                ...transition,
                conditions: [
                  { type: "IS_PAID", config: {}, position: 0 },
                ],
              })
            }
          >
            Agregar pago completo
          </button>
        ) : null}
      </div>
    );
  },
}));

vi.mock("./SaleOrderStateFormModal", () => ({
  SaleOrderStateFormModal: () => null,
}));

vi.mock("./WorkflowDraftTestModal", () => ({
  WorkflowDraftTestModal: () => null,
}));

describe("WorkflowEditorModal", () => {
  beforeEach(() => vi.clearAllMocks());

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

  it("edits allowed configuration and rules on the same published revision", async () => {
    const user = userEvent.setup();
    const publishedResponse = {
      workflow: {
        id: "workflow-v1",
        name: "Abonado envio",
        normalizedName: "ABONADO ENVIO",
        description: null,
        isActive: true,
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: null,
        familyId: "family-1",
        revision: 1,
        lifecycleStatus: "PUBLISHED" as const,
        isCurrent: true,
        basedOnWorkflowId: null,
        publishedAt: "2026-08-01T00:00:00.000Z",
      },
      states: [
        {
          id: "state-created",
          workflowId: "workflow-v1",
          saleOrderStateId: "global-created",
          name: "Creado",
          code: "CREATED",
          color: "#64748b",
          position: 0,
          positionX: 0,
          positionY: 0,
          isInitial: true,
          isFinal: false,
          isActive: true,
        },
        {
          id: "state-done",
          workflowId: "workflow-v1",
          saleOrderStateId: "global-done",
          name: "Final",
          code: "DONE",
          color: "#22c55e",
          position: 1,
          positionX: 200,
          positionY: 0,
          isInitial: false,
          isFinal: true,
          isActive: true,
        },
      ],
      transitions: [
        {
          id: "transition-pay",
          workflowId: "workflow-v1",
          fromStateId: "state-created",
          toStateId: "state-done",
          elseToStateId: null,
          isGlobal: false,
          excludedStateIds: [],
          effect: "MOVE_STATE" as const,
          purpose: "STANDARD" as const,
          name: "Pago completo",
          code: "PAY",
          isActive: true,
          autoTrigger: false,
          priority: 0,
          elseEffect: null,
          conditions: [],
          actions: [],
        },
      ],
      conditions: [],
      actions: [],
    };
    workflowServiceMocks.listManagedWorkflows.mockResolvedValue([
      {
        id: "workflow-v1",
        name: "Abonado envio",
        lifecycleStatus: "PUBLISHED",
        revision: 1,
        description: null,
        isActive: true,
        states: [],
        transitions: [],
      },
    ]);
    workflowServiceMocks.listSaleOrderStates.mockResolvedValue([]);
    workflowServiceMocks.listWorkflowConditions.mockResolvedValue([]);
    workflowServiceMocks.listWorkflowActions.mockResolvedValue([]);
    workflowServiceMocks.getWorkflow.mockResolvedValue(publishedResponse);
    workflowServiceMocks.updatePublishedWorkflowRules.mockResolvedValue(
      publishedResponse,
    );

    render(<WorkflowEditorModal open onClose={vi.fn()} />);

    const typeSelect = await screen.findByRole("button", { name: "Tipos" });
    await user.click(typeSelect);
    await user.click(await screen.findByText(/Abonado envio/));

    await waitFor(() =>
      expect(workflowServiceMocks.getWorkflow).toHaveBeenCalledWith(
        "workflow-v1",
      ),
    );
    expect(screen.getByTestId("workflow-canvas")).toHaveAttribute(
      "data-read-only",
      "true",
    );
    expect(screen.getByRole("button", { name: "Crear borrador" })).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Seleccionar transicion" }),
    );
    expect(screen.getByTestId("workflow-properties")).toHaveAttribute(
      "data-rules-only",
      "true",
    );
    await user.click(
      screen.getByRole("button", { name: "Agregar pago completo" }),
    );
    const saveRulesButton = screen.getByRole("button", {
      name: "Guardar configuración y reglas",
    });
    await waitFor(() => expect(saveRulesButton).toBeEnabled());
    await user.click(saveRulesButton);

    await waitFor(() =>
      expect(
        workflowServiceMocks.updatePublishedWorkflowRules,
      ).toHaveBeenCalledWith("workflow-v1", {
        transitions: [
          expect.objectContaining({
            transitionId: "transition-pay",
            autoTrigger: false,
            priority: 0,
            conditions: [
              { type: "IS_PAID", config: {}, position: 0 },
            ],
          }),
        ],
      }),
    );
    expect(workflowServiceMocks.updateFullWorkflow).not.toHaveBeenCalled();
  });
});
