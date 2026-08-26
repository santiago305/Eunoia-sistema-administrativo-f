import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkflowConditionEditor } from "./WorkflowConditionEditor";
import type {
  ConditionCatalogItem,
  WorkflowCondition,
} from "@/features/workflows/types/workflow";

describe("WorkflowConditionEditor", () => {
  it("configures delivery validation as days after the delivery date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const catalog = [
      {
        type: "SCHEDULE_DELIVERY_WINDOW",
        configSchema: {
          mode: { type: "select" },
          days: { type: "integer" },
        },
      },
    ] as ConditionCatalogItem[];
    const value = [
      {
        type: "SCHEDULE_DELIVERY_WINDOW",
        config: { mode: "BEFORE", days: 1 },
      },
    ] as WorkflowCondition[];

    const { rerender } = render(
      <WorkflowConditionEditor
        catalog={catalog}
        value={value}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Comparar con la entrega: Días antes" }),
    );
    await user.click(
      screen.getByRole("option", { name: "Días después (fecha pasada)" }),
    );

    expect(onChange).toHaveBeenLastCalledWith([
      {
        type: "SCHEDULE_DELIVERY_WINDOW",
        config: { mode: "AFTER", days: 1 },
      },
    ]);

    rerender(
      <WorkflowConditionEditor
        catalog={catalog}
        value={[
          {
            type: "SCHEDULE_DELIVERY_WINDOW",
            config: { mode: "AFTER", days: 1 },
          },
        ] as WorkflowCondition[]}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Cantidad de días después"), {
      target: { value: "2" },
    });

    expect(onChange).toHaveBeenLastCalledWith([
      {
        type: "SCHEDULE_DELIVERY_WINDOW",
        config: { mode: "AFTER", days: 2 },
      },
    ]);
  });

  it("shows legacy delivery rules as days before", () => {
    render(
      <WorkflowConditionEditor
        catalog={[
          {
            type: "SCHEDULE_DELIVERY_WINDOW",
            configSchema: {},
          },
        ] as ConditionCatalogItem[]}
        value={[
          {
            type: "SCHEDULE_DELIVERY_WINDOW",
            config: { minDaysBefore: 0, maxDaysBefore: 3 },
          },
        ] as WorkflowCondition[]}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Comparar con la entrega: Días antes" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Cantidad de días antes")).toHaveValue(3);
  });

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
