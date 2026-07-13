import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RejectPaymentModal } from "./RejectPaymentModal";

describe("RejectPaymentModal", () => {
  it("requires a rejection reason before confirming", () => {
    const onConfirm = vi.fn();

    render(
      <RejectPaymentModal
        open
        paymentId="payment-1"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /rechazar pago/i }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/ingresa el motivo/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/motivo/i), {
      target: { value: "Documento duplicado" },
    });
    fireEvent.click(screen.getByRole("button", { name: /rechazar pago/i }));

    expect(onConfirm).toHaveBeenCalledWith("Documento duplicado");
  });
});
