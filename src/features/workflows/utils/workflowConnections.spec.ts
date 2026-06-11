import { describe, expect, it } from "vitest";
import {
  getDestinationStateName,
  normalizeWorkflowHandleId,
} from "./workflowConnections";

describe("normalizeWorkflowHandleId", () => {
  it.each([
    ["source-top", "top"],
    ["target-right", "right"],
    ["bottom", "bottom"],
    [null, null],
  ])("normalizes %s to %s", (value, expected) => {
    expect(normalizeWorkflowHandleId(value)).toBe(expected);
  });
});

describe("getDestinationStateName", () => {
  it("returns the current destination state name", () => {
    expect(
      getDestinationStateName(
        [
          { clientId: "state-created", name: "Creado" },
          { clientId: "state-delivered", name: "Entregado" },
        ],
        "state-delivered",
      ),
    ).toBe("Entregado");
  });
});
