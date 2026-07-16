import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaleOrderTotalsSection } from "./SaleOrderTotalsSection";
import { buildEmptySaleOrderEditorForm } from "./saleOrderEditorForm";

describe("SaleOrderTotalsSection", () => {
  it("renders subtotal, delivery cost, discount, and final total", () => {
    const form = {
      ...buildEmptySaleOrderEditorForm(),
      deliveryCost: 10,
      discount: 15,
      items: [
        { description: "Pack A", quantity: 1, unitPrice: 80, total: 80, components: [] },
        { description: "Pack B", quantity: 2, unitPrice: 20, total: 40, components: [] },
      ],
    };

    render(<SaleOrderTotalsSection form={form} />);

    expect(screen.getByText("Valor del pedido")).toBeInTheDocument();
    expect(screen.getByText("Subtotal").nextElementSibling).toHaveTextContent("120.00");
    expect(screen.getByText("Tarifa").nextElementSibling).toHaveTextContent("10.00");
    expect(screen.getByText("Descuento").nextElementSibling).toHaveTextContent("-S/");
    expect(screen.getByText("Descuento").nextElementSibling).toHaveTextContent("15.00");
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("115.00");
  });

  it("normalizes negative delivery and discount values before display", () => {
    const form = {
      ...buildEmptySaleOrderEditorForm(),
      deliveryCost: -10,
      discount: -5,
      items: [{ description: "Pack", quantity: 1, unitPrice: 30, total: 30, components: [] }],
    };

    render(<SaleOrderTotalsSection form={form} />);

    expect(screen.getByText("Tarifa").nextElementSibling).toHaveTextContent("0.00");
    expect(screen.getByText("Descuento").nextElementSibling).toHaveTextContent("0.00");
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("30.00");
  });
});
