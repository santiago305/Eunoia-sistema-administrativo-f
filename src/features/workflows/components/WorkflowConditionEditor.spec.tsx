import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkflowConditionEditor } from "./WorkflowConditionEditor";
import type {
  ConditionCatalogItem,
  WorkflowCondition,
} from "@/features/workflows/types/workflow";

describe("WorkflowConditionEditor", () => {
  it("renders sale order field options from the condition schema and stores the selected value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const catalog = [
      {
        type: "SALE_ORDER_FIELD_REQUIRED",
        configSchema: {
          field: {
            type: "select",
            required: true,
            options: [
              { label: "Cliente tiene direccion", value: "client.address" },
              { label: "Pedido tiene nota", value: "note" },
            ],
          },
        },
      },
    ] as ConditionCatalogItem[];
    const value = [
      {
        type: "SALE_ORDER_FIELD_REQUIRED",
        config: { field: "client.address" },
      },
    ] as WorkflowCondition[];

    render(
      <WorkflowConditionEditor
        catalog={catalog}
        value={value}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Campo requerido: Cliente tiene direccion" }),
    );
    await user.click(screen.getByRole("option", { name: "Pedido tiene nota" }));

    expect(onChange).toHaveBeenCalledWith([
      {
        type: "SALE_ORDER_FIELD_REQUIRED",
        config: { field: "note" },
      },
    ]);
  });
});
