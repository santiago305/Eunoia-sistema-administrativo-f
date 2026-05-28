import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SaleOrders from "@/features/sale-orders/SaleOrders";

describe("SaleOrders", () => {
  it("muestra el botón Nuevo pedido", () => {
    render(<SaleOrders />);
    expect(screen.getByRole("button", { name: /nuevo pedido/i })).toBeTruthy();
  });
});
