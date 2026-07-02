import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DashboardSaleOrderSmartFilter } from "./DashboardSaleOrderSmartFilter";

describe("DashboardSaleOrderSmartFilter", () => {
  it("exposes only creation, schedule and delivery date fields", async () => {
    render(
      <DashboardSaleOrderSmartFilter
        snapshot={{ filters: [] }}
        onApplyRule={vi.fn()}
        onRemoveRule={vi.fn()}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /filtros del dashboard/i }),
    );

    expect(screen.getByText("Fecha de creación")).toBeInTheDocument();
    expect(screen.getByText("Fecha de agenda")).toBeInTheDocument();
    expect(screen.getByText("Fecha de entrega")).toBeInTheDocument();
    expect(screen.queryByText("Documento")).not.toBeInTheDocument();
    expect(screen.queryByText("Cliente")).not.toBeInTheDocument();
  });
});
