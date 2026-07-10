import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SmartSearchActiveField } from "./SmartSearchActiveField";
import { SmartSearchDatePeriodOperators } from "./datePeriodOperators";
import type { SmartSearchFieldConfig, SmartSearchRule } from "./types";

type FieldKey = "createdAt";
type Operator = "between" | "inMonth" | "inWeek";
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
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("applies the selected number of weeks as a range when the field supports ranges", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 15));

    const onApplyRule = renderPeriodField(
      {
        id: "createdAt",
        label: "Creación",
        kind: "date",
        operators: [
          { id: "between", label: "Entre", inputMode: "date-range" },
          { id: "inWeek", label: "En la semana", inputMode: "week" },
        ],
      },
      { field: "createdAt", operator: "inWeek", value: "2026-06-22" },
    );

    expect(
      screen.getByLabelText("Cantidad de semanas", { selector: "input" }),
    ).toHaveValue(1);

    fireEvent.change(
      screen.getByLabelText("Cantidad de semanas", { selector: "input" }),
      {
        target: { value: "2" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onApplyRule).toHaveBeenCalledWith({
      field: "createdAt",
      operator: "between",
      range: { start: "2026-07-13", end: "2026-07-26" },
    });
  });

  it("uses the animated date range picker for between date filters", async () => {
    const user = userEvent.setup();
    renderPeriodField(
      {
        id: "createdAt",
        label: "Creación",
        kind: "date",
        operators: [
          { id: "between", label: "Entre", inputMode: "date-range" },
        ],
      },
      {
        field: "createdAt",
        operator: "between",
        range: { start: "2026-07-13", end: "2026-07-26" },
      },
    );

    await user.click(screen.getByRole("button", { name: "Rango" }));

    expect(
      await screen.findByRole("dialog", { name: "Rango: rango de fechas" }),
    ).toBeInTheDocument();
  });
});
