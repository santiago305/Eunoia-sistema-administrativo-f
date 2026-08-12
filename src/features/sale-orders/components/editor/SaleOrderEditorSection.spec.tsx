import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaleOrderEditorSection } from "./SaleOrderEditorSection";

describe("SaleOrderEditorSection", () => {
  it("starts collapsed and can reveal its content accessibly", () => {
    render(
      <SaleOrderEditorSection title="Insumos" collapsible defaultCollapsed>
        <div>Tabla de insumos</div>
      </SaleOrderEditorSection>,
    );

    const toggle = screen.getByRole("button", { name: "Insumos" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Tabla de insumos")).not.toBeVisible();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Tabla de insumos")).toBeVisible();
  });
});
