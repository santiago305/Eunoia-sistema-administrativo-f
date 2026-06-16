import { describe, expect, it } from "vitest";
import {
  applyTransitionCardConnection,
  getTransitionCardId,
  getTransitionCardPosition,
  isTransitionCard,
} from "./workflowTransitionCard";
import type { WorkflowDraftTransition } from "../types/workflow";

const transition: WorkflowDraftTransition = {
  clientId: "transition-1",
  name: "Decision",
  code: "DECISION",
  fromStateClientId: "state-1",
  toStateClientId: "state-2",
  elseToStateClientId: null,
  isGlobal: false,
  excludedStateClientIds: [],
  effect: "MOVE_STATE",
  purpose: "STANDARD",
  isActive: true,
  autoTrigger: true,
  priority: 1,
  elseEffect: "MOVE_STATE",
  conditions: [],
  actions: [],
  elseActions: [],
};

describe("workflow transition card", () => {
  it("classifies automatic transitions with ELSE as cards", () => {
    expect(isTransitionCard(transition)).toBe(true);
    expect(getTransitionCardId(transition.clientId)).toBe(
      "transition-card-transition-1",
    );
  });

  it("exposes the NO connector before an ELSE branch exists", () => {
    expect(
      isTransitionCard({
        ...transition,
        elseEffect: null,
        elseToStateClientId: null,
      }),
    ).toBe(true);
  });

  it("uses the midpoint between origin and destination", () => {
    expect(
      getTransitionCardPosition(transition, {
        "state-1": { x: 0, y: 20 },
        "state-2": { x: 400, y: 220 },
      }),
    ).toEqual({ x: 200, y: 120 });
  });

  it("updates the ELSE destination from the SI NO handle", () => {
    expect(
      applyTransitionCardConnection(transition, {
        source: getTransitionCardId(transition.clientId),
        sourceHandle: "transition-else",
        target: "state-3",
      }),
    ).toMatchObject({ elseToStateClientId: "state-3" });
  });

  it("creates the ELSE branch when connecting NO for the first time", () => {
    const withoutElse = {
      ...transition,
      elseEffect: null,
      elseToStateClientId: null,
    };

    expect(
      applyTransitionCardConnection(withoutElse, {
        source: getTransitionCardId(withoutElse.clientId),
        sourceHandle: "transition-else",
        target: "state-3",
      }),
    ).toMatchObject({
      elseEffect: "MOVE_STATE",
      elseToStateClientId: "state-3",
    });
  });
});
