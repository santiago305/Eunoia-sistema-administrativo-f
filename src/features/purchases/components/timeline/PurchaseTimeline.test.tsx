import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PurchaseTimeline } from "./PurchaseTimeline";

describe("PurchaseTimeline", () => {
  it("keeps the main purchase history readable and hides technical details by default", () => {
    render(
      <PurchaseTimeline
        events={[
          {
            id: "event-payment",
            eventType: "PAYMENT_REGISTERED",
            description: "Se registro un pago en la compra",
            performedByUserName: "Ana Torres",
            targetUserName: "Caja Central",
            metadata: { paymentId: "pay-123" },
            oldValues: { status: "PENDING" },
            newValues: { status: "APPROVED" },
            createdAt: "2026-07-02T12:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getAllByText("Pago registrado").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Ana Torres registró un pago.")).toBeInTheDocument();
    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Realizado por")).toBeInTheDocument();
    expect(screen.getByText("Ana Torres")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();
    expect(screen.queryByText("Pago pay-123")).not.toBeInTheDocument();
    expect(screen.queryByText("Afecta a Caja Central")).not.toBeInTheDocument();
    expect(screen.queryByText("status")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver detalles" }));

    expect(screen.getByText("Pago pay-123")).toBeInTheDocument();
    expect(screen.getByText("Afecta a Caja Central")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
  });
});
