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

    expect(await screen.findByText("Compra creada")).toBeInTheDocument();
    expect(screen.getByText("Ana Torres")).toBeInTheDocument();
    expect(screen.getByText("1 eventos")).toBeInTheDocument();
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

    expect(await screen.findByText("Primer evento")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    await waitFor(() => {
      expect(getPurchaseTimelineMock).toHaveBeenLastCalledWith("po-2", {
        page: 2,
        limit: 10,
      });
    });
    expect(await screen.findByText("Evento pagina dos")).toBeInTheDocument();
  });
});
