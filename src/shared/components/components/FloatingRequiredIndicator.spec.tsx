import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { FloatingInput } from "./FloatingInput";
import { FloatingSelect } from "./FloatingSelect";
import { FloatingSuggestInput } from "./FloatingSuggestInput";
import { FloatingDatePicker } from "./date-picker/FloatingDatePicker";

vi.mock("./date-picker/DatePickerPanelPortal", () => ({
  DatePickerPanelPortal: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));

describe("floating field required indicators", () => {
  it("marks required floating input labels with a red asterisk", () => {
    render(
      <FloatingInput
        label="Nombre completo"
        name="client-full-name"
        requiredIndicator
      />,
    );

    const indicator = screen.getByText("*");

    expect(screen.getByLabelText("Nombre completo")).toBeRequired();
    expect(indicator).toHaveClass("text-red-600");
    expect(indicator).toHaveAttribute("aria-hidden", "true");
  });

  it("marks required floating select labels with a red asterisk", () => {
    render(
      <FloatingSelect
        label="Tipo"
        name="sale-order-workflow"
        value=""
        options={[]}
        onChange={vi.fn()}
        requiredIndicator
      />,
    );

    const indicator = screen.getByText("*");

    expect(screen.getByRole("button", { name: "Tipo" })).toHaveAttribute(
      "aria-required",
      "true",
    );
    expect(indicator).toHaveClass("text-red-600");
    expect(indicator).toHaveAttribute("aria-hidden", "true");
  });

  it("marks required suggest input labels with a red asterisk", () => {
    render(
      <FloatingSuggestInput
        label="Agencia/Direccion"
        name="sale-order-subsidiary"
        value=""
        options={[]}
        onChange={vi.fn()}
        requiredIndicator
      />,
    );

    const indicator = screen.getByText("*");

    expect(screen.getByLabelText("Agencia/Direccion")).toBeRequired();
    expect(indicator).toHaveClass("text-red-600");
    expect(indicator).toHaveAttribute("aria-hidden", "true");
  });

  it("marks required date picker labels with a red asterisk", () => {
    render(
      <FloatingDatePicker
        label="Fecha"
        name="payment-date"
        value={null}
        onChange={vi.fn()}
        requiredIndicator
      />,
    );

    const indicator = screen.getByText("*");

    expect(screen.getByRole("button", { name: "Fecha" })).toHaveAttribute(
      "aria-required",
      "true",
    );
    expect(indicator).toHaveClass("text-red-600");
    expect(indicator).toHaveAttribute("aria-hidden", "true");
  });
});
