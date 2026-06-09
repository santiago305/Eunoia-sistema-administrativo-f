import { describe, expect, it } from "vitest";
import type { Workflow } from "@/features/workflows/types/workflow";
import {
  TRANSITION_EFFECTS,
  TRANSITION_PURPOSES,
} from "@/features/workflows/types/workflow";
import { buildFullWorkflowRequest, mapWorkflowToDraft, validateWorkflowDraft } from "./workflowDraft";

describe("mapWorkflowToDraft", () => {
  it("restores the system flags for the cancellation transition and its destination", () => {
    const workflow = {
      id: "workflow-1",
      name: "Ventas",
      description: null,
      isActive: true,
      createdAt: "",
      updatedAt: "",
      states: [
        {
          id: "state-active",
          workflowId: "workflow-1",
          saleOrderStateId: "global-active",
          name: "Activo",
          code: "ACTIVO",
          color: null,
          positionX: 0,
          positionY: 0,
          isInitial: true,
          isFinal: false,
          isActive: true,
        },
        {
          id: "state-cancelled",
          workflowId: "workflow-1",
          saleOrderStateId: "global-cancelled",
          name: "Cancelado",
          code: "CANCELADO",
          color: null,
          positionX: 0,
          positionY: 0,
          isInitial: false,
          isFinal: false,
          isActive: true,
        },
      ],
      transitions: [
        {
          id: "transition-cancel",
          workflowId: "workflow-1",
          fromStateId: null,
          toStateId: "state-cancelled",
          isGlobal: true,
          excludedStateIds: [],
          effect: TRANSITION_EFFECTS.MOVE_STATE,
          purpose: TRANSITION_PURPOSES.CANCEL,
          name: "Cancelar",
          code: "CANCEL",
          isActive: true,
          conditions: [],
          actions: [],
        },
      ],
    } satisfies Workflow;

    const draft = mapWorkflowToDraft(workflow);

    expect(
      draft.states.find((state) => state.id === "state-cancelled")?.isSystem,
    ).toBe(true);
    expect(draft.transitions[0]?.isSystem).toBe(true);
  });
});

describe("buildFullWorkflowRequest", () => {
  it("sends workflow states with the selected global sale order state only", () => {
    const request = buildFullWorkflowRequest({
      name: "Ventas",
      description: "",
      isActive: true,
      states: [
        {
          clientId: "state-created",
          saleOrderStateId: "global-created",
          name: "Creado",
          code: "CREATED",
          color: "#0ea5e9",
          positionX: 10,
          positionY: 20,
          isInitial: true,
          isFinal: false,
          isActive: true,
        },
        {
          id: "workflow-state-delivered",
          clientId: "state-delivered",
          saleOrderStateId: "global-delivered",
          name: "Entregado",
          code: "DELIVERED",
          color: "#22c55e",
          positionX: 200,
          positionY: 20,
          isInitial: false,
          isFinal: true,
          isActive: true,
        },
      ],
      transitions: [],
    });

    expect(request.states).toEqual([
      {
        clientId: "state-created",
        saleOrderStateId: "global-created",
        position: 0,
        positionX: 10,
        positionY: 20,
        isInitial: true,
        isFinal: false,
        isActive: true,
      },
      {
        id: "workflow-state-delivered",
        clientId: "state-delivered",
        saleOrderStateId: "global-delivered",
        position: 1,
        positionX: 200,
        positionY: 20,
        isInitial: false,
        isFinal: true,
        isActive: true,
      },
    ]);
  });
});

describe("validateWorkflowDraft", () => {
  it("rejects duplicate active global sale order states in the same workflow", () => {
    const validation = validateWorkflowDraft({
      name: "Ventas",
      description: "",
      isActive: true,
      states: [
        {
          clientId: "state-1",
          saleOrderStateId: "global-created",
          name: "Creado",
          code: "CREATED",
          color: "#0ea5e9",
          positionX: 0,
          positionY: 0,
          isInitial: true,
          isFinal: false,
          isActive: true,
        },
        {
          clientId: "state-2",
          saleOrderStateId: "global-created",
          name: "Creado",
          code: "CREATED_2",
          color: "#0ea5e9",
          positionX: 200,
          positionY: 0,
          isInitial: false,
          isFinal: true,
          isActive: true,
        },
      ],
      transitions: [],
    });

    expect(validation.errors).toContain("Hay estados globales duplicados.");
  });
});
