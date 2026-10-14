import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  it("accepts a whole amount and enables correction", async () => {
    const onConfirm = vi.fn();
    const onPreview = vi.fn(async (total: number) => ({
      saleOrderId: "order-1", currency: "PEN" as const, currentTotal: 0, correctedTotal: total,
      appliedAmount: 20, pendingAmount: Math.max(total - 20, 0), customerCreditCreated: Math.max(20 - total, 0), releasedByIncome: [], previewToken: "a".repeat(64),
    }));
    render(
      <CorrectSaleOrderTotalModal
        open
        order={order}
        loading={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        onPreview={onPreview}
      />,
    );

    fireEvent.change(screen.getByLabelText("Total correcto"), {
      target: { value: "100" },
    });
    await waitFor(() => expect(onPreview).toHaveBeenCalledWith(100));
    await screen.findByText(/Saldo pendiente resultante/);
    fireEvent.click(
      screen.getByRole("button", { name: "Analizar y corregir" }),
    );

    expect(onConfirm).toHaveBeenCalledWith(100, "a".repeat(64));
    expect(screen.getByText(/80\.00/)).toBeInTheDocument();
  });

  it("accepts a decimal comma and explains invalid values after clicking", async () => {
    const onConfirm = vi.fn();
    const onPreview = vi.fn(async (total: number) => ({
      saleOrderId: "order-1", currency: "PEN" as const, currentTotal: 0, correctedTotal: total,
      appliedAmount: 20, pendingAmount: Math.max(total - 20, 0), customerCreditCreated: Math.max(20 - total, 0), releasedByIncome: [], previewToken: "a".repeat(64),
    }));
    render(
      <CorrectSaleOrderTotalModal
        open
        order={order}
        loading={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        onPreview={onPreview}
      />,
    );
    const input = screen.getByLabelText("Total correcto");
    const confirmButton = screen.getByRole("button", {
      name: "Analizar y corregir",
    });

    fireEvent.change(input, { target: { value: "100,50" } });
    await waitFor(() => expect(onPreview).toHaveBeenCalledWith(100.5));
    await screen.findByText(/Saldo pendiente resultante/);
    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenLastCalledWith(100.5, "a".repeat(64));

    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.click(confirmButton);
    expect(
      screen.getByText("Ingresa un importe válido con máximo 2 decimales."),
    ).toBeInTheDocument();
  });

  it("previews the excess in USD and requires explicit confirmation before creating customer credit", async () => {
    const onConfirm = vi.fn();
    const orderUsd = { ...order, currency: "USD" } as SaleOrder;
    const onPreview = vi.fn(async (total: number) => ({
      saleOrderId: "order-1", currency: "USD" as const, currentTotal: 100, correctedTotal: total,
      appliedAmount: 100, pendingAmount: 0, customerCreditCreated: 30,
      releasedByIncome: [{ paymentId: "payment-1", currency: "USD" as const, amount: 30 }],
      previewToken: "b".repeat(64),
    }));
    render(<CorrectSaleOrderTotalModal open order={orderUsd} loading={false} onClose={vi.fn()} onConfirm={onConfirm} onPreview={onPreview} />);

    fireEvent.change(screen.getByLabelText("Total correcto"), { target: { value: "70" } });
    await screen.findByText(/Excedente que quedar/i);
    expect(screen.getByText(/30\.00/)).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: "Analizar y corregir" });
    expect(confirmButton).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Confirmo que el excedente/));
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledWith(70, "b".repeat(64));
  });
});
