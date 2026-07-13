import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MoneyInput } from "./MoneyInput";

describe("MoneyInput", () => {
  it("renders a friendly soles amount field without changing the numeric value contract", () => {
    const onChange = vi.fn();

    render(
      <MoneyInput
        label="Monto"
        name="amount"
        currency="PEN"
        value="120.50"
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText("Monto");

    expect(screen.getByText("S/")).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "0.00");
    expect(input).toHaveValue(120.5);

    fireEvent.change(input, { target: { value: "130.75" } });

    expect(onChange).toHaveBeenCalled();
  });

  it("uses the dollar prefix for USD amounts", () => {
    render(
      <MoneyInput
        label="Monto"
        name="amount"
        currency="USD"
        value=""
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("$")).toBeInTheDocument();
  });
});
