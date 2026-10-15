import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTableSearchBar } from "./DataTableSearchBar";

const renderSearchBar = () => {
  const onChange = vi.fn();
  const onSubmitSearch = vi.fn();

  render(
    <>
      <DataTableSearchBar
        value=""
        onChange={onChange}
        onSubmitSearch={onSubmitSearch}
      >
        <button type="button">Acción interna</button>
      </DataTableSearchBar>
      <button type="button">Fuera del buscador</button>
    </>,
  );

  return { onChange, onSubmitSearch };
};

describe("DataTableSearchBar", () => {
  it("keeps the panel open when interacting inside the search area", async () => {
    const user = userEvent.setup();
    renderSearchBar();

    await user.click(screen.getByRole("textbox"));
    expect(screen.getByRole("button", { name: "Acción interna" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Acción interna" }));
    expect(screen.getByRole("button", { name: "Acción interna" })).toBeVisible();
  });

  it("closes the panel when the pointer goes outside the bounded search area", async () => {
    const user = userEvent.setup();
    renderSearchBar();

    await user.click(screen.getByRole("textbox"));
    expect(screen.getByRole("button", { name: "Acción interna" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Fuera del buscador" }));
    expect(screen.queryByRole("button", { name: "Acción interna" })).not.toBeInTheDocument();
  });

  it("does not close when a floating overlay is clicked", () => {
    renderSearchBar();
    fireEvent.click(screen.getByRole("textbox"));

    const overlay = document.createElement("div");
    overlay.setAttribute("data-floating-overlay-root", "true");
    document.body.appendChild(overlay);

    fireEvent.pointerDown(overlay);

    expect(screen.getByRole("button", { name: "Acción interna" })).toBeVisible();
    overlay.remove();
  });
});
