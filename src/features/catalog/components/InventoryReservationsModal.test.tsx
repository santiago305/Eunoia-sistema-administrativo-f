import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryReservationsModal } from "./InventoryReservationsModal";

const { getInventoryReservationDetailsMock } = vi.hoisted(() => ({
  getInventoryReservationDetailsMock: vi.fn(),
}));

vi.mock("@/shared/services/inventoryService", () => ({
  getInventoryReservationDetails: getInventoryReservationDetailsMock,
}));

describe("InventoryReservationsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInventoryReservationDetailsMock.mockResolvedValue({
      stockItemId: "stock-1",
      warehouseId: "warehouse-1",
      productType: "PRODUCT",
      inventoryReserved: 3,
      attributedReserved: 3,
      difference: 0,
      items: [
        {
          sourceType: "SALE_ORDER",
          sourceId: "order-1",
          documentNumber: "PV-101",
          subjectName: "Cliente Uno",
          statusCode: "SCHEDULED",
          statusName: "Programado",
          plannedDate: "2026-08-30",
          createdAt: "2026-08-27T10:00:00.000Z",
          quantity: 3,
        },
      ],
    });
  });

  it("lists the orders that hold the selected product reservation", async () => {
    render(
      <InventoryReservationsModal
        open
        productType="PRODUCT"
        target={{
          stockItemId: "stock-1",
          warehouseId: "warehouse-1",
          warehouseName: "Central",
          itemName: "Producto reservado",
          unitCode: "UND",
          reserved: 3,
        }}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(getInventoryReservationDetailsMock).toHaveBeenCalledWith({
        stockItemId: "stock-1",
        warehouseId: "warehouse-1",
        productType: "PRODUCT",
      }),
    );
    expect(await screen.findAllByText("PV-101")).not.toHaveLength(0);
    expect(screen.getAllByText("Cliente Uno")).not.toHaveLength(0);
    expect(screen.getAllByText("3 UND")).not.toHaveLength(0);
  });

  it("shows an explicit warning when part of the balance has no active origin", async () => {
    getInventoryReservationDetailsMock.mockResolvedValueOnce({
      stockItemId: "stock-1",
      warehouseId: "warehouse-1",
      productType: "PRODUCT",
      inventoryReserved: 5,
      attributedReserved: 3,
      difference: 2,
      items: [],
    });

    render(
      <InventoryReservationsModal
        open
        productType="PRODUCT"
        target={{
          stockItemId: "stock-1",
          warehouseId: "warehouse-1",
          warehouseName: "Central",
          itemName: "Producto reservado",
          unitCode: "UND",
          reserved: 5,
        }}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText(/2 UND del saldo reservado no pudo asociarse/i)).toBeInTheDocument();
  });
});
