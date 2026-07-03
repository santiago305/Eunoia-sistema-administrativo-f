import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SmartSearchActiveField } from "./SmartSearchActiveField";
import { SmartSearchDatePeriodOperators } from "./datePeriodOperators";
import type { SmartSearchFieldConfig, SmartSearchRule } from "./types";

type FieldKey = "createdAt";
type Operator = "inMonth" | "inWeek";
type Snapshot = { filters: SmartSearchRule<FieldKey, Operator>[] };

const renderPeriodField = (
  field: SmartSearchFieldConfig<FieldKey, Operator>,
  activeRule: SmartSearchRule<FieldKey, Operator>,
) => {
  const onApplyRule = vi.fn();
  const snapshot: Snapshot = { filters: [activeRule] };

  render(
    <SmartSearchActiveField
      field={field}
      snapshot={snapshot}
      getRule={() => activeRule}
      getRuleSummary={() => null}
      onApplyRule={onApplyRule}
      onRemoveRule={vi.fn()}
      onBack={vi.fn()}
    />,
  );

  return onApplyRule;
};

describe("SmartSearchActiveField calendar periods", () => {
  it("uses the shared semantic operator identifiers", () => {
    expect(SmartSearchDatePeriodOperators).toEqual({
      IN_MONTH: "inMonth",
      IN_WEEK: "inWeek",
    });
  });

  it("applies the selected month as a scalar rule value", async () => {
    const user = userEvent.setup();
    const onApplyRule = renderPeriodField(
      {
        id: "createdAt",
        label: "Creación",
        kind: "date",
        operators: [
          { id: "inMonth", label: "En el mes", inputMode: "month" },
        ],
      },
      { field: "createdAt", operator: "inMonth", value: "2026-06" },
    );

    await user.click(screen.getByRole("button", { name: "Mes" }));
    await user.click(
      await screen.findByRole("button", { name: /julio/i }),
    );
    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onApplyRule).toHaveBeenCalledWith({
      field: "createdAt",
      operator: "inMonth",
      value: "2026-07",
      range: undefined,
    });
  });

  it("applies the selected week using its canonical Monday", async () => {
    const user = userEvent.setup();
    const onApplyRule = renderPeriodField(
      {
        id: "createdAt",
        label: "Creación",
        kind: "date",
        operators: [
          { id: "inWeek", label: "En la semana", inputMode: "week" },
        ],
      },
      { field: "createdAt", operator: "inWeek", value: "2026-06-22" },
    );

    await user.click(screen.getByRole("button", { name: "Semana" }));
    await user.click(
      await screen.findByRole("button", { name: "3 julio 2026" }),
    );
    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onApplyRule).toHaveBeenCalledWith({
      field: "createdAt",
      operator: "inWeek",
      value: "2026-06-29",
      range: undefined,
    });
  });
});
