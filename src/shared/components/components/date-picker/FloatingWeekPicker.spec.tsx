import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FloatingWeekPicker } from "./FloatingWeekPicker";

describe("FloatingWeekPicker", () => {
  it("selects a whole calendar week and emits its Monday", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FloatingWeekPicker
        label="Semana"
        name="week"
        value="2026-06-22"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Semana" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Seleccionar semana",
    });

    await user.click(
      within(dialog).getByRole("button", { name: "3 julio 2026" }),
    );

    expect(onChange).toHaveBeenCalledWith("2026-06-29");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("displays and marks all seven days of a week crossing months", async () => {
    const user = userEvent.setup();

    render(
      <FloatingWeekPicker
        label="Semana"
        name="week"
        value="2026-06-29"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("29 jun - 5 jul 2026")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Semana" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Seleccionar semana",
    });

    expect(
      within(dialog).getAllByRole("button", { pressed: true }),
    ).toHaveLength(7);
  });

  it("disables weeks that are not fully inside min and max", async () => {
    const user = userEvent.setup();

    render(
      <FloatingWeekPicker
        label="Semana"
        name="week"
        value="2026-06-29"
        min="2026-06-29"
        max="2026-07-05"
        onChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Semana" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Seleccionar semana",
    });

    expect(
      within(dialog).getByRole("button", { name: "28 junio 2026" }),
    ).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: "3 julio 2026" }),
    ).toBeEnabled();
    expect(
      within(dialog).getByRole("button", { name: "6 julio 2026" }),
    ).toBeDisabled();
  });

  it("clears a selected week and associates its error", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FloatingWeekPicker
        label="Semana"
        name="week"
        value="2026-12-28"
        error="Selecciona una semana válida"
        onChange={onChange}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Semana" });
    const error = screen.getByText("Selecciona una semana válida");
    expect(trigger).toHaveAttribute("aria-describedby", error.id);

    await user.click(trigger);
    await user.click(
      await screen.findByRole("button", { name: "Limpiar semana" }),
    );

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("does not open while disabled or read-only and closes with Escape", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <FloatingWeekPicker
        label="Semana"
        name="week"
        value=""
        disabled
        onChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Semana" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(
      <FloatingWeekPicker
        label="Semana"
        name="week"
        value=""
        readOnly
        onChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Semana" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(
      <FloatingWeekPicker
        label="Semana"
        name="week"
        value=""
        onChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Semana" }));
    await screen.findByRole("dialog", { name: "Seleccionar semana" });
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
