import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SaleOrder } from "../../types/saleOrder";
import { CorrectSaleOrderTotalModal } from "./CorrectSaleOrderTotalModal";

const order = {
  id: "order-1",
  total: 0,
  totalPaid: 20,
  currentState: {
    id: "state-delivered",
    code: "DELIVERED",
    name: "Entregado",
  },
} as SaleOrder;

describe("CorrectSaleOrderTotalModal", () => {
  it("accepts a whole amount and enables correction", () => {
    const onConfirm = vi.fn();
    render(
      <CorrectSaleOrderTotalModal
        open
        order={order}
        loading={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.change(screen.getByLabelText("Total correcto"), {
      target: { value: "100" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Analizar y corregir" }),
    );

    expect(onConfirm).toHaveBeenCalledWith(100);
    expect(screen.getByText(/80\.00/)).toBeInTheDocument();
  });

  it("accepts a decimal comma and explains invalid values after clicking", () => {
    const onConfirm = vi.fn();
    render(
      <CorrectSaleOrderTotalModal
        open
        order={order}
        loading={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    const input = screen.getByLabelText("Total correcto");
    const confirmButton = screen.getByRole("button", {
      name: "Analizar y corregir",
    });

    fireEvent.change(input, { target: { value: "100,50" } });
    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenLastCalledWith(100.5);

    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.click(confirmButton);
    expect(
      screen.getByText("Ingresa un importe válido con máximo 2 decimales."),
    ).toBeInTheDocument();
  });
});
