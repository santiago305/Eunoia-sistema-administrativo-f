import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FloatingMonthPicker } from "./FloatingMonthPicker";

describe("FloatingMonthPicker", () => {
  it("opens a custom dialog and emits the selected month", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FloatingMonthPicker
        label="Mes"
        name="month"
        value="2026-06"
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /^mes$/i }),
    );

    expect(
      await screen.findByRole("dialog", { name: /seleccionar mes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /junio/i }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /julio/i }));

    expect(onChange).toHaveBeenCalledWith("2026-07");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("navigates years and enforces inclusive month constraints", async () => {
    const user = userEvent.setup();

    render(
      <FloatingMonthPicker
        label="Mes"
        name="month"
        value="2026-06"
        min="2025-11"
        max="2026-08"
        onChange={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /^mes$/i }),
    );

    await screen.findByRole("dialog", { name: /seleccionar mes/i });
    expect(
      screen.getByRole("button", { name: /setiembre/i }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: /año anterior/i }),
    );

    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /octubre/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /noviembre/i }),
    ).toBeEnabled();
  });

  it("clears the selected month", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FloatingMonthPicker
        label="Mes"
        name="month"
        value="2026-06"
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /^mes$/i }),
    );
    await screen.findByRole("dialog", { name: /seleccionar mes/i });
    await user.click(
      screen.getByRole("button", { name: /limpiar mes/i }),
    );

    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not open while disabled or read-only", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <FloatingMonthPicker
        label="Mes"
        name="month"
        value=""
        disabled
        onChange={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /^mes$/i }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(
      <FloatingMonthPicker
        label="Mes"
        name="month"
        value=""
        readOnly
        onChange={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /^mes$/i }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ignores invalid constraints and associates the error message", async () => {
    const user = userEvent.setup();

    render(
      <FloatingMonthPicker
        label="Mes"
        name="month"
        value=""
        min="invalid"
        max="2026-99"
        error="Selecciona un mes válido"
        onChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /^mes$/i,
    });
    const error = screen.getByText("Selecciona un mes válido");

    expect(trigger).toHaveAttribute("aria-describedby", error.id);

    await user.click(trigger);
    await screen.findByRole("dialog", { name: /seleccionar mes/i });

    expect(
      screen.getByRole("button", { name: /enero/i }),
    ).toBeEnabled();
  });

  it("closes the panel with Escape", async () => {
    const user = userEvent.setup();

    render(
      <FloatingMonthPicker
        label="Mes"
        name="month"
        value=""
        onChange={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /^mes$/i }),
    );
    await screen.findByRole("dialog", { name: /seleccionar mes/i });
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
