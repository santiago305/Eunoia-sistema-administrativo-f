import { describe, expect, it } from "vitest";
import type { WorkflowDraft } from "@/features/workflows/types/workflow";
import {
  advanceWorkflowSimulation,
  createWorkflowSimulation,
  type WorkflowSimulationInput,
} from "./workflowSimulation";

const draft: WorkflowDraft = {
  name: "Prueba",
  description: "",
  isActive: true,
  states: [
    { clientId: "scheduled", saleOrderStateId: "1", name: "Programado", code: "SCHEDULED", color: null, positionX: 0, positionY: 0, isInitial: true, isFinal: false, isActive: true },
    { clientId: "in-progress", saleOrderStateId: "2", name: "En curso", code: "IN_PROGRESS", color: null, positionX: 0, positionY: 0, isInitial: false, isFinal: false, isActive: true },
    { clientId: "waiting", saleOrderStateId: "3", name: "Esperando", code: "WAITING", color: null, positionX: 0, positionY: 0, isInitial: false, isFinal: false, isActive: true },
    { clientId: "to-send", saleOrderStateId: "4", name: "Por enviar", code: "TO_SEND", color: null, positionX: 0, positionY: 0, isInitial: false, isFinal: true, isActive: true },
  ],
  transitions: [
    {
      clientId: "to-progress", name: "En curso", code: "TO_PROGRESS", fromStateClientId: "scheduled", toStateClientId: "in-progress", elseToStateClientId: null, isGlobal: false, excludedStateClientIds: [], purpose: "STANDARD", effect: "MOVE_STATE", elseEffect: null, isActive: true, autoTrigger: true, priority: 0,
      conditions: [{ type: "SCHEDULE_DELIVERY_WINDOW", config: { mode: "BEFORE", days: 0 } }], actions: [], elseActions: [],
    },
    {
      clientId: "paid-to-send", name: "Por enviar", code: "PAID_TO_SEND", fromStateClientId: "in-progress", toStateClientId: "to-send", elseToStateClientId: null, isGlobal: false, excludedStateClientIds: [], purpose: "STANDARD", effect: "MOVE_STATE", elseEffect: null, isActive: true, autoTrigger: true, priority: 0,
      conditions: [{ type: "IS_PAID", config: {} }], actions: [{ type: "CONSUME_STOCK", config: {}, position: 0 }], elseActions: [],
    },
    {
      clientId: "overdue", name: "Esperando", code: "OVERDUE", fromStateClientId: "in-progress", toStateClientId: "waiting", elseToStateClientId: null, isGlobal: false, excludedStateClientIds: [], purpose: "STANDARD", effect: "MOVE_STATE", elseEffect: null, isActive: true, autoTrigger: true, priority: 1,
      conditions: [{ type: "IS_NOT_PAID", config: {} }, { type: "SCHEDULE_DELIVERY_WINDOW", config: { mode: "AFTER", days: 1 } }], actions: [{ type: "REVERT_STOCK", config: {}, position: 0 }], elseActions: [],
    },
    {
      clientId: "waiting-to-send", name: "Por enviar", code: "WAITING_TO_SEND", fromStateClientId: "waiting", toStateClientId: "to-send", elseToStateClientId: null, isGlobal: false, excludedStateClientIds: [], purpose: "STANDARD", effect: "MOVE_STATE", elseEffect: null, isActive: true, autoTrigger: true, priority: 0,
      conditions: [{ type: "IS_PAID", config: {} }, { type: "HAS_STOCK", config: {} }], actions: [{ type: "RESERVE_STOCK", config: {}, position: 0 }, { type: "CONSUME_STOCK", config: {}, position: 1 }], elseActions: [],
    },
  ],
};

const input = (overrides: Partial<WorkflowSimulationInput> = {}): WorkflowSimulationInput => ({
  total: 100,
  totalPaid: 0,
  deliveryDate: "2026-08-27",
  simulatedDate: "2026-08-27",
  hasStock: true,
  requiredFields: {},
  ...overrides,
});

describe("workflowSimulation", () => {
  it("starts from the matching real order state instead of the initial state", () => {
    const simulation = createWorkflowSimulation(draft, {
      stateCode: "IN_PROGRESS",
      stockReserved: true,
    });

    expect(simulation.currentStateId).toBe("in-progress");
    expect(simulation.stockReserved).toBe(true);
  });

  it("follows the paid route and records stock consumption", () => {
    let simulation = createWorkflowSimulation(draft);
    simulation = advanceWorkflowSimulation(draft, simulation, input({ totalPaid: 100 }));
    simulation = advanceWorkflowSimulation(draft, simulation, input({ totalPaid: 100 }));

    expect(simulation.currentStateId).toBe("to-send");
    expect(simulation.stockConsumed).toBe(true);
    expect(simulation.history.map((step) => step.toStateName)).toEqual(["En curso", "Por enviar"]);
  });

  it("moves unpaid overdue orders to waiting and releases the reservation", () => {
    let simulation = createWorkflowSimulation(draft);
    simulation = advanceWorkflowSimulation(draft, simulation, input());
    simulation = advanceWorkflowSimulation(draft, simulation, input({ simulatedDate: "2026-08-28" }));

    expect(simulation.currentStateId).toBe("waiting");
    expect(simulation.stockReleased).toBe(true);
    expect(simulation.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ transitionName: "Esperando", passed: true }),
      ]),
    );
  });

  it("moves a waiting order to send after payment when stock exists", () => {
    let simulation = createWorkflowSimulation(draft);
    simulation = advanceWorkflowSimulation(draft, simulation, input());
    simulation = advanceWorkflowSimulation(draft, simulation, input({ simulatedDate: "2026-08-28" }));
    simulation = advanceWorkflowSimulation(draft, simulation, input({ totalPaid: 100, simulatedDate: "2026-08-28" }));

    expect(simulation.currentStateId).toBe("to-send");
    expect(simulation.history.at(-1)?.actions).toEqual(["Reservar stock", "Consumir stock"]);
  });
});
