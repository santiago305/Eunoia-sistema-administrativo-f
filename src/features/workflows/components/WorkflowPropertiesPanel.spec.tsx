import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { WorkflowDraft } from "@/features/workflows/types/workflow";
import { WorkflowPropertiesPanel } from "./WorkflowPropertiesPanel";

vi.mock("./WorkflowConditionEditor", () => ({
  WorkflowConditionEditor: () => <div>Editor de condiciones</div>,
}));

vi.mock("./WorkflowActionEditor", () => ({
  WorkflowActionEditor: () => <div>Editor de acciones</div>,
}));

function publishedDraft(autoTrigger: boolean, priority: number): WorkflowDraft {
  return {
    id: "workflow-v1",
    name: "Abonado envio",
    description: "",
    isActive: true,
    lifecycleStatus: "PUBLISHED",
    revision: 1,
    states: [],
    transitions: [
      {
        id: "transition-1",
        clientId: "transition-transition-1",
        name: "Pago completo",
        code: "PAY",
        fromStateClientId: "state-1",
        toStateClientId: "state-2",
        elseToStateClientId: null,
        isGlobal: false,
        excludedStateClientIds: [],
        purpose: "STANDARD",
        effect: "MOVE_STATE",
        isActive: true,
        autoTrigger,
        priority,
        elseEffect: null,
        conditions: [],
        actions: [],
        elseActions: [],
      },
    ],
  };
}

function renderPanel(
  draft: WorkflowDraft,
  onTransitionChange = vi.fn(),
) {
  render(
    <WorkflowPropertiesPanel
      draft={draft}
      selectedId="transition-transition-1"
      publishedRulesOnly
      conditionCatalog={[]}
      actionCatalog={[]}
      onStateChange={vi.fn()}
      onTransitionChange={onTransitionChange}
      onRemoveState={vi.fn()}
      onRemoveTransition={vi.fn()}
    />,
  );
  return onTransitionChange;
}

describe("WorkflowPropertiesPanel published rules", () => {
  it("shows whether the transition is automatic and lets it be enabled", async () => {
    const user = userEvent.setup();
    const onTransitionChange = renderPanel(publishedDraft(false, 0));

    const automatic = screen.getByRole("checkbox", {
      name: "Disparar automáticamente",
    });
    expect(automatic).not.toBeChecked();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();

    await user.click(automatic);

    expect(onTransitionChange).toHaveBeenCalledWith(
      expect.objectContaining({ autoTrigger: true, priority: 0 }),
    );
  });

  it("shows and updates priority for an automatic transition", () => {
    const onTransitionChange = renderPanel(publishedDraft(true, 4));
    const priority = screen.getByRole("spinbutton", {
      name: "Prioridad automática",
    });

    expect(priority).toHaveValue(4);
    fireEvent.change(priority, { target: { value: "2" } });

    expect(onTransitionChange).toHaveBeenCalledWith(
      expect.objectContaining({ autoTrigger: true, priority: 2 }),
    );
  });

  it("lets an automatic published transition be changed to manual", async () => {
    const user = userEvent.setup();
    const onTransitionChange = renderPanel(publishedDraft(true, 4));

    const automatic = screen.getByRole("checkbox", {
      name: "Disparar automáticamente",
    });
    expect(automatic).toBeChecked();
    expect(
      screen.getByRole("spinbutton", { name: "Prioridad automática" }),
    ).toHaveValue(4);

    await user.click(automatic);

    expect(onTransitionChange).toHaveBeenCalledWith(
      expect.objectContaining({ autoTrigger: false, priority: 0 }),
    );
  });
});
