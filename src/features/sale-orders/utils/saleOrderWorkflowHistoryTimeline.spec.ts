import { describe, expect, it } from "vitest";
import {
  TRANSITION_EFFECTS,
  TRANSITION_PURPOSES,
  type SaleOrderWorkflowHistoryItem,
  type WorkflowState,
} from "@/features/workflows/types/workflow";
import { buildSaleOrderWorkflowHistoryTimeline } from "./saleOrderWorkflowHistoryTimeline";

const state = (
  id: string,
  name: string,
  color: string,
): WorkflowState => ({
  id,
  workflowId: "workflow-1",
  saleOrderStateId: `global-${id}`,
  code: id.toUpperCase(),
  name,
  color,
  position: 1,
  positionX: 0,
  positionY: 0,
  isInitial: false,
  isFinal: false,
  isActive: true,
});

const created = state("created", "Creado", "#64748B");
const waiting = state("waiting", "Esperando", "#A855F7");

const historyItem = (
  overrides: Partial<SaleOrderWorkflowHistoryItem> = {},
): SaleOrderWorkflowHistoryItem => ({
  id: "history-1",
  workflowId: "workflow-1",
  transition: {
    id: "transition-1",
    workflowId: "workflow-1",
    code: "WAIT",
    name: "Esperando",
    effect: TRANSITION_EFFECTS.MOVE_STATE,
    purpose: TRANSITION_PURPOSES.STANDARD,
    fromStateId: created.id,
    toStateId: waiting.id,
    isGlobal: false,
    excludedStateIds: [],
    sourceHandle: "bottom",
    targetHandle: "top",
    isActive: true,
  },
  fromState: created,
  toState: waiting,
  executedByUser: { id: "user-1", email: "operator@example.com" },
  executedAt: "2026-06-09T20:03:45.157Z",
  metadata: null,
  ...overrides,
});

describe("buildSaleOrderWorkflowHistoryTimeline", () => {
  it("sorts events from oldest to newest without removing repeats", () => {
    const repeated = historyItem({
      id: "history-2",
      executedAt: "2026-06-09T20:04:45.157Z",
    });

    const timeline = buildSaleOrderWorkflowHistoryTimeline([
      repeated,
      historyItem(),
    ]);

    expect(timeline.map((event) => event.id)).toEqual([
      "history-1",
      "history-2",
    ]);
    expect(timeline).toHaveLength(2);
  });

  it("maps state movement details and destination marker color", () => {
    const [event] = buildSaleOrderWorkflowHistoryTimeline([historyItem()]);

    expect(event).toMatchObject({
      kind: "MOVE_STATE",
      markerColor: "#A855F7",
      executorEmail: "operator@example.com",
      fromState: created,
      toState: waiting,
    });
  });

  it("classifies action-only events and uses the current state color", () => {
    const [event] = buildSaleOrderWorkflowHistoryTimeline([
      historyItem({
        transition: {
          ...historyItem().transition,
          effect: TRANSITION_EFFECTS.RUN_ACTIONS,
          fromStateId: null,
          toStateId: null,
          name: "Enviar comprobante",
        },
        fromState: waiting,
        toState: waiting,
      }),
    ]);

    expect(event).toMatchObject({
      kind: "RUN_ACTIONS",
      markerColor: "#A855F7",
      currentState: waiting,
    });
  });

  it("classifies cancellation before transition effect", () => {
    const [event] = buildSaleOrderWorkflowHistoryTimeline([
      historyItem({
        transition: {
          ...historyItem().transition,
          purpose: TRANSITION_PURPOSES.CANCEL,
        },
      }),
    ]);

    expect(event.kind).toBe("CANCEL");
  });
});
