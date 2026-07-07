import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PurchaseHistoryTimelineModal } from "./PurchaseHistoryTimelineModal";

const { getPurchaseTimelineMock } = vi.hoisted(() => ({
  getPurchaseTimelineMock: vi.fn(),
}));

vi.mock("@/shared/services/purchaseService", () => ({
  getPurchaseTimeline: getPurchaseTimelineMock,
}));

describe("PurchaseHistoryTimelineModal", () => {
  it("loads and renders the selected purchase timeline", async () => {
    getPurchaseTimelineMock.mockResolvedValueOnce({
      purchaseId: "po-1",
      events: [
        {
          id: "event-1",
          eventType: "CREATED",
          description: "Compra creada",
          performedByUserName: "Ana Torres",
          createdAt: "2026-07-04T12:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    });

    render(
      <PurchaseHistoryTimelineModal
        open
        purchase={{
          poId: "po-1",
          serie: "F001",
          correlative: "9",
          supplierName: "Proveedor historial",
        }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Historial" })).toBeInTheDocument();
    expect(screen.getByText("Linea de tiempo de la compra F001-9")).toBeInTheDocument();

    await waitFor(() => {
      expect(getPurchaseTimelineMock).toHaveBeenCalledWith("po-1", {
        page: 1,
        limit: 10,
      });
    });

    expect((await screen.findAllByText("Compra creada")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Ana Torres creó la compra.")).toBeInTheDocument();
    expect(screen.getByText("Realizado por")).toBeInTheDocument();
    expect(screen.getByText("Ana Torres")).toBeInTheDocument();
    expect(screen.queryByText("1 eventos")).not.toBeInTheDocument();
  });

  it("renders the purchase journey without the old summary panel", async () => {
    getPurchaseTimelineMock.mockResolvedValueOnce({
      purchaseId: "po-journey",
      events: [
        {
          id: "event-created",
          eventType: "PURCHASE_DRAFT_CREATED",
          description: "Se creo el pedido de compra",
          performedByUserName: "Ana Torres",
          createdAt: "2026-07-01T09:00:00.000Z",
        },
        {
          id: "event-approved",
          eventType: "PURCHASE_APPROVED",
          description: "La compra fue aprobada",
          performedByUserName: "Luis Ramos",
          targetUserName: "Ana Torres",
          createdAt: "2026-07-01T10:00:00.000Z",
        },
        {
          id: "event-payment",
          eventType: "PAYMENT_REGISTERED",
          description: "Se registro el pago",
          performedByUserName: "Caja Central",
          metadata: { paymentId: "pay-1" },
          createdAt: "2026-07-02T12:00:00.000Z",
        },
        {
          id: "event-received",
          eventType: "PURCHASE_FULLY_RECEIVED",
          description: "La compra ingreso a stock",
          performedByUserName: "Almacen",
          createdAt: "2026-07-03T15:00:00.000Z",
        },
      ],
      total: 4,
      page: 1,
      limit: 10,
    });

    render(
      <PurchaseHistoryTimelineModal
        open
        purchase={{
          poId: "po-journey",
          serie: "F001",
          correlative: "20",
          supplierName: "Proveedor recorrido",
        }}
        onClose={vi.fn()}
      />,
    );

    expect((await screen.findAllByText("Borrador de compra creado")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Compra aprobada").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pago registrado").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Compra recibida completamente").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Luis Ramos aprobó la compra.")).toBeInTheDocument();
    expect(screen.getByText("Caja Central registró un pago.")).toBeInTheDocument();
    expect(screen.queryByText("Afecta a Ana Torres")).not.toBeInTheDocument();
    expect(screen.queryByText("Pago pay-1")).not.toBeInTheDocument();

    const detailButtons = screen.getAllByRole("button", { name: "Ver detalles" });
    fireEvent.click(detailButtons[0]);
    fireEvent.click(detailButtons[1]);

    expect(screen.getByText("Afecta a Ana Torres")).toBeInTheDocument();
    expect(screen.getByText("Pago pay-1")).toBeInTheDocument();
    expect(screen.queryByText("4 eventos")).not.toBeInTheDocument();
    expect(screen.queryByText("Proveedor recorrido")).not.toBeInTheDocument();
  });

  it("loads the requested page when timeline pagination changes", async () => {
    getPurchaseTimelineMock
      .mockResolvedValueOnce({
        purchaseId: "po-2",
        events: [{ id: "event-1", eventType: "CREATED", description: "Primer evento" }],
        total: 12,
        page: 1,
        limit: 10,
      })
      .mockResolvedValueOnce({
        purchaseId: "po-2",
        events: [{ id: "event-11", eventType: "UPDATED", description: "Evento pagina dos" }],
        total: 12,
        page: 2,
        limit: 10,
      });

    render(
      <PurchaseHistoryTimelineModal
        open
        purchase={{
          poId: "po-2",
          serie: "B001",
          correlative: "15",
          supplierName: "Proveedor paginado",
        }}
        onClose={vi.fn()}
      />,
    );

    expect((await screen.findAllByText("Compra creada")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Sistema creó la compra.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    await waitFor(() => {
      expect(getPurchaseTimelineMock).toHaveBeenLastCalledWith("po-2", {
        page: 2,
        limit: 10,
      });
    });
    expect((await screen.findAllByText("Compra actualizada")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Sistema actualizó la compra.")).toBeInTheDocument();
  });
});
