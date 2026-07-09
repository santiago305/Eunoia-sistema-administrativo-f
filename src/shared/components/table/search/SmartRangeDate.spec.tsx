import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SmartRangeDate } from "./SmartRangeDate";
import type { SmartSearchRule } from "./types";

type FieldKey = "createdAt";
type Operator = "between" | "inWeek" | "inMonth";

const operators = {
  range: "between",
  week: "inWeek",
  month: "inMonth",
} as const;

function renderSmartRangeDate(
  value: SmartSearchRule<FieldKey, Operator> | null = null,
  onChange = vi.fn(),
) {
  render(
    <SmartRangeDate
      fieldId="createdAt"
      label="Fecha creacion"
      value={value}
      onChange={onChange}
      operators={operators}
    />,
  );

  return onChange;
}

describe("SmartRangeDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("hydrates an incoming range rule", () => {
    renderSmartRangeDate({
      field: "createdAt",
      operator: "between",
      range: { start: "2026-07-01", end: "2026-07-10" },
    });

    expect(screen.queryByRole("button", { name: "Rango" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fecha creacion" })).toHaveTextContent(
      "01/07/2026 - 10/07/2026",
    );
  });

  it("emits a range rule when the user selects two dates", async () => {
    const user = userEvent.setup();
    const onChange = renderSmartRangeDate({
      field: "createdAt",
      operator: "between",
      range: { start: "2026-07-01", end: "2026-07-10" },
    });

    await user.click(screen.getByRole("button", { name: "Fecha creacion" }));
    await user.click(await screen.findByRole("button", { name: "5 julio 2026" }));
    await user.click(await screen.findByRole("button", { name: "9 julio 2026" }));

    expect(onChange).toHaveBeenLastCalledWith({
      field: "createdAt",
      operator: "between",
      range: { start: "2026-07-05", end: "2026-07-09" },
    });
  });

  it("hydrates and emits a month rule", async () => {
    const user = userEvent.setup();
    const onChange = renderSmartRangeDate({
      field: "createdAt",
      operator: "inMonth",
      value: "2026-06",
    });

    expect(screen.queryByRole("button", { name: "Mes" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fecha creacion" })).toHaveTextContent(
      /junio 2026/,
    );

    await user.click(screen.getByRole("button", { name: "Fecha creacion" }));
    await user.click(await screen.findByRole("button", { name: "Mes" }));
    await user.click(await screen.findByRole("button", { name: "Julio" }));

    expect(onChange).toHaveBeenLastCalledWith({
      field: "createdAt",
      operator: "inMonth",
      value: "2026-07",
    });
  });

  it("emits a range rule for the last selected number of weeks", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 15));

    const onChange = renderSmartRangeDate();

    fireEvent.click(screen.getByRole("button", { name: "Fecha creacion" }));
    fireEvent.click(screen.getByText("Semanas"));
    fireEvent.change(screen.getByLabelText("Cantidad de semanas", { selector: "input" }), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByText(/Aplicar .* semanas/));

    expect(onChange).toHaveBeenLastCalledWith({
      field: "createdAt",
      operator: "between",
      range: { start: "2026-07-13", end: "2026-07-26" },
    });
  });

  it("emits null when cleared", async () => {
    const user = userEvent.setup();
    const onChange = renderSmartRangeDate({
      field: "createdAt",
      operator: "inMonth",
      value: "2026-06",
    });

    await user.click(screen.getByRole("button", { name: "Limpiar fecha creacion" }));

    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
