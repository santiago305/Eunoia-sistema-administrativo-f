import { describe, expect, it } from "vitest";
import { buildSaleOrderReservationFeedback } from "./saleOrderReservationFeedback";

describe("buildSaleOrderReservationFeedback", () => {
  it("describes completed and unchanged product reservations", () => {
    expect(
      buildSaleOrderReservationFeedback({
        checked: true,
        adjusted: true,
        warehouseId: "warehouse-1",
        items: [
          {
            stockItemId: "stock-1",
            skuCode: "SKU-1",
            productName: "Producto uno",
            orderQuantity: 2,
            onHand: 10,
            previousReserved: 1,
            expectedReserved: 3,
            adjustment: 2,
            availableAfter: 7,
            status: "COMPLETED",
          },
          {
            stockItemId: "stock-2",
            skuCode: "SKU-2",
            productName: "Producto dos",
            orderQuantity: 1,
            onHand: 8,
            previousReserved: 1,
            expectedReserved: 1,
            adjustment: 0,
            availableAfter: 7,
            status: "UNCHANGED",
          },
        ],
      }),
    ).toEqual({
      title: "Pedido actualizado. Reserva corregida en 1 producto.",
      description:
        "Revisión de reserva: Producto uno (SKU-1): reservado 1 → 3 (+2). Producto dos (SKU-2): sin cambios (1 reservado).",
    });
  });

  it("keeps the normal confirmation when no reservation was checked", () => {
    expect(buildSaleOrderReservationFeedback(null)).toEqual({
      title: "Pedido actualizado correctamente.",
    });
  });
});
