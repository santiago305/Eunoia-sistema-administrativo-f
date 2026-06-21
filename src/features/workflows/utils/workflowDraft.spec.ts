import { describe, expect, it } from "vitest";
import type { Workflow } from "@/features/workflows/types/workflow";
import {
  TRANSITION_EFFECTS,
  TRANSITION_PURPOSES,
} from "@/features/workflows/types/workflow";
import {
  buildFullWorkflowRequest,
  associateCancelSaleOrderState,
  getAutoTriggerPatch,
  hasAutomaticTransitionSibling,
  mapWorkflowToDraft,
  removeWorkflowElement,
  validateWorkflowDraft,
} from "./workflowDraft";

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

  it("maps automatic transition branches into separate draft fields", () => {
    const workflow = {
      id: "workflow-1",
      name: "Ventas",
      description: null,
      isActive: true,
      states: [
        {
          id: "state-1",
          workflowId: "workflow-1",
          saleOrderStateId: "global-1",
          name: "Programado",
          code: "SCHEDULED",
          color: null,
          positionX: 0,
          positionY: 0,
          isInitial: true,
          isFinal: false,
          isActive: true,
        },
        {
          id: "state-2",
          workflowId: "workflow-1",
          saleOrderStateId: "global-2",
          name: "Preparacion",
          code: "PREPARATION",
          color: null,
          positionX: 200,
          positionY: 0,
          isInitial: false,
          isFinal: false,
          isActive: true,
        },
        {
          id: "state-3",
          workflowId: "workflow-1",
          saleOrderStateId: "global-3",
          name: "Revision",
          code: "REVIEW",
          color: null,
          positionX: 200,
          positionY: 120,
          isInitial: false,
          isFinal: true,
          isActive: true,
        },
      ],
      transitions: [
        {
          id: "transition-1",
          workflowId: "workflow-1",
          fromStateId: "state-1",
          toStateId: "state-2",
          elseToStateId: "state-3",
          isGlobal: false,
          excludedStateIds: [],
          effect: TRANSITION_EFFECTS.MOVE_STATE,
          elseEffect: TRANSITION_EFFECTS.MOVE_STATE,
          purpose: TRANSITION_PURPOSES.STANDARD,
          name: "Validar entrega",
          code: "DELIVERY_DECISION",
          isActive: true,
          autoTrigger: true,
          priority: 2,
          conditions: [],
          actions: [
            { type: "RESERVE_STOCK", config: {}, position: 0, branch: "THEN" },
            { type: "REVERT_STOCK", config: {}, position: 0, branch: "ELSE" },
          ],
        },
      ],
    } satisfies Workflow;

    const transition = mapWorkflowToDraft(workflow).transitions[0];

    expect(transition).toMatchObject({
      autoTrigger: true,
      priority: 2,
      elseEffect: TRANSITION_EFFECTS.MOVE_STATE,
      elseToStateClientId: "state-state-3",
    });
    expect(transition.actions.map((action) => action.type)).toEqual([
      "RESERVE_STOCK",
    ]);
    expect(transition.elseActions.map((action) => action.type)).toEqual([
      "REVERT_STOCK",
    ]);
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

  it("sends automatic THEN and ELSE branches without backend branch markers", () => {
    const request = buildFullWorkflowRequest({
      name: "Ventas",
      description: "",
      isActive: true,
      states: [],
      transitions: [
        {
          clientId: "transition-1",
          name: "Validar entrega",
          code: "DELIVERY_DECISION",
          fromStateClientId: "state-1",
          toStateClientId: "state-2",
          elseToStateClientId: "state-3",
          isGlobal: false,
          excludedStateClientIds: [],
          purpose: TRANSITION_PURPOSES.STANDARD,
          effect: TRANSITION_EFFECTS.MOVE_STATE,
          elseEffect: TRANSITION_EFFECTS.MOVE_STATE,
          isActive: true,
          autoTrigger: true,
          priority: 1,
          conditions: [],
          actions: [
            { type: "RESERVE_STOCK", config: {}, position: 0, branch: "THEN" },
          ],
          elseActions: [
            { type: "REVERT_STOCK", config: {}, position: 0, branch: "ELSE" },
          ],
        },
      ],
    });

    expect(request.transitions[0]).toMatchObject({
      autoTrigger: true,
      priority: 1,
      elseEffect: TRANSITION_EFFECTS.MOVE_STATE,
      elseToStateRef: "state-3",
      actions: [{ type: "RESERVE_STOCK", config: {}, position: 0 }],
      elseActions: [{ type: "REVERT_STOCK", config: {}, position: 0 }],
    });
  });
});

describe("validateWorkflowDraft", () => {
  it("identifies active states without a global state by name", () => {
    const validation = validateWorkflowDraft({
      name: "Ventas",
      description: "",
      isActive: true,
      states: [
        {
          clientId: "state-1",
          saleOrderStateId: "",
          name: "Preparacion",
          code: "PREPARATION",
          color: null,
          positionX: 0,
          positionY: 0,
          isInitial: true,
          isFinal: true,
          isActive: true,
        },
      ],
      transitions: [],
    });

    expect(validation.errors).toContain(
      "Los estados activos sin estado global son: Preparacion.",
    );
  });

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

  it("validates automatic priority, conditions, and ELSE branch requirements", () => {
    const validation = validateWorkflowDraft({
      name: "Ventas",
      description: "",
      isActive: true,
      states: [
        {
          clientId: "state-1",
          saleOrderStateId: "global-1",
          name: "Programado",
          code: "SCHEDULED",
          color: null,
          positionX: 0,
          positionY: 0,
          isInitial: true,
          isFinal: false,
          isActive: true,
        },
        {
          clientId: "state-2",
          saleOrderStateId: "global-2",
          name: "Final",
          code: "FINAL",
          color: null,
          positionX: 200,
          positionY: 0,
          isInitial: false,
          isFinal: true,
          isActive: true,
        },
      ],
      transitions: [
        {
          clientId: "transition-1",
          name: "Automatic",
          code: "AUTOMATIC",
          fromStateClientId: "state-1",
          toStateClientId: "state-2",
          elseToStateClientId: null,
          isGlobal: false,
          excludedStateClientIds: [],
          purpose: TRANSITION_PURPOSES.STANDARD,
          effect: TRANSITION_EFFECTS.MOVE_STATE,
          elseEffect: TRANSITION_EFFECTS.MOVE_STATE,
          isActive: true,
          autoTrigger: true,
          priority: -1,
          conditions: [],
          actions: [],
          elseActions: [],
        },
      ],
    });

    expect(validation.errors).toContain(
      "Las transiciones automaticas requieren al menos una condicion.",
    );
    expect(validation.errors).toContain(
      "La prioridad debe ser un entero mayor o igual a cero.",
    );
    expect(validation.errors).toContain(
      "La rama SI NO que cambia estado requiere un destino valido.",
    );
  });

  it("detects another automatic transition from the same source state", () => {
    const current = {
      clientId: "transition-2",
      fromStateClientId: "state-1",
      autoTrigger: false,
      isActive: true,
    };

    expect(
      hasAutomaticTransitionSibling(
        [
          {
            clientId: "transition-1",
            fromStateClientId: "state-1",
            autoTrigger: true,
            isActive: true,
          },
          current,
        ],
        current,
      ),
    ).toBe(true);
  });

  it("clears the ELSE branch when automatic execution is disabled", () => {
    expect(getAutoTriggerPatch(false)).toEqual({
      autoTrigger: false,
      priority: 0,
      elseEffect: null,
      elseToStateClientId: null,
      elseActions: [],
    });
  });

  it("requires a selected sale order field for field-required conditions", () => {
    const validation = validateWorkflowDraft({
      name: "Ventas",
      description: "",
      isActive: true,
      states: [
        {
          clientId: "state-1",
          saleOrderStateId: "global-1",
          name: "Creado",
          code: "CREATED",
          color: null,
          positionX: 0,
          positionY: 0,
          isInitial: true,
          isFinal: false,
          isActive: true,
        },
        {
          clientId: "state-2",
          saleOrderStateId: "global-2",
          name: "Listo",
          code: "READY",
          color: null,
          positionX: 200,
          positionY: 0,
          isInitial: false,
          isFinal: true,
          isActive: true,
        },
      ],
      transitions: [
        {
          clientId: "transition-1",
          name: "Validar direccion",
          code: "VALIDATE_ADDRESS",
          fromStateClientId: "state-1",
          toStateClientId: "state-2",
          elseToStateClientId: null,
          isGlobal: false,
          excludedStateClientIds: [],
          purpose: TRANSITION_PURPOSES.STANDARD,
          effect: TRANSITION_EFFECTS.MOVE_STATE,
          elseEffect: null,
          isActive: true,
          autoTrigger: false,
          priority: 0,
          conditions: [
            {
              type: "SALE_ORDER_FIELD_REQUIRED",
              config: { field: "" },
            },
          ],
          actions: [],
          elseActions: [],
        },
      ],
    });

    expect(validation.errors).toContain(
      "La condicion de campo obligatorio requiere un campo seleccionado.",
    );
  });
});

describe("associateCancelSaleOrderState", () => {
  it("associates the system cancellation node with the global cancellation state", () => {
    const draft = {
      name: "Ventas",
      description: "",
      isActive: true,
      states: [
        {
          clientId: "state-cancel",
          saleOrderStateId: "",
          name: "Cancelado",
          code: "CANCELADO",
          color: "#ef4444",
          positionX: -9999,
          positionY: -9999,
          isInitial: false,
          isFinal: false,
          isActive: true,
          isSystem: true,
        },
      ],
      transitions: [],
    };

    const associated = associateCancelSaleOrderState(draft, {
      id: "global-cancelled",
      code: "CANCELLED",
      name: "Cancelado",
      color: "#dc2626",
    });

    expect(associated.states[0]).toMatchObject({
      saleOrderStateId: "global-cancelled",
      name: "Cancelado",
      code: "CANCELLED",
      color: "#dc2626",
    });
  });
});

describe("removeWorkflowElement", () => {
  it("removes an ELSE destination state and clears only the ELSE branch", () => {
    const draft = {
      name: "Ventas",
      description: "",
      isActive: true,
      states: [
        { clientId: "state-1", saleOrderStateId: "global-1", name: "Inicio", code: "START", color: null, positionX: 0, positionY: 0, isInitial: true, isFinal: false, isActive: true },
        { clientId: "state-2", saleOrderStateId: "global-2", name: "Si", code: "YES", color: null, positionX: 200, positionY: 0, isInitial: false, isFinal: true, isActive: true },
        { clientId: "state-3", saleOrderStateId: "global-3", name: "No", code: "NO", color: null, positionX: 200, positionY: 150, isInitial: false, isFinal: true, isActive: true },
      ],
      transitions: [{
        clientId: "transition-1", name: "Decision", code: "DECISION",
        fromStateClientId: "state-1", toStateClientId: "state-2",
        elseToStateClientId: "state-3", isGlobal: false,
        excludedStateClientIds: [], purpose: TRANSITION_PURPOSES.STANDARD,
        effect: TRANSITION_EFFECTS.MOVE_STATE, elseEffect: TRANSITION_EFFECTS.MOVE_STATE,
        isActive: true, autoTrigger: true, priority: 1, conditions: [], actions: [],
        elseActions: [{ type: "REVERT_STOCK" as const, config: {}, position: 0 }],
      }],
    };

    const result = removeWorkflowElement(draft, "state-3");

    expect(result.states.map((state) => state.clientId)).toEqual(["state-1", "state-2"]);
    expect(result.transitions).toHaveLength(1);
    expect(result.transitions[0]).toMatchObject({
      elseEffect: null,
      elseToStateClientId: null,
      elseActions: [],
    });
  });
});
