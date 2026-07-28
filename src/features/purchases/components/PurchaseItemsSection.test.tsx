import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PurchaseItemsSection } from "./PurchaseItemsSection";

vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: ({
    className,
    tableClassName,
    maxHeight,
  }: {
    className?: string;
    tableClassName?: string;
    maxHeight?: string;
  }) => (
    <div
      data-testid="purchase-items-table"
      data-class-name={className ?? ""}
      data-table-class-name={tableClassName ?? ""}
      data-max-height={maxHeight ?? ""}
    />
  ),
}));

describe("PurchaseItemsSection", () => {
  const baseProps = {
    itemRows: [],
    itemColumns: [],
  };

  it("renders the items table without inline product controls", () => {
    render(<PurchaseItemsSection {...baseProps} />);

    expect(screen.getByTestId("purchase-items-table")).toBeInTheDocument();
    expect(screen.queryByLabelText("Producto")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar" })).not.toBeInTheDocument();
  });

  it("uses the DataTable scroll container for the items list", () => {
    render(<PurchaseItemsSection {...baseProps} />);

    expect(screen.getByTestId("purchase-items-table")).toHaveAttribute(
      "data-class-name",
      "min-h-0",
    );
    expect(screen.getByTestId("purchase-items-table")).toHaveAttribute("data-table-class-name", "");
    expect(screen.getByTestId("purchase-items-table")).toHaveAttribute("data-max-height", "200px");
  });
});
