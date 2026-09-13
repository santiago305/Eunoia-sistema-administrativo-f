import type { SaleOrderReservationReconciliation } from "../types/saleOrder";

export function buildSaleOrderReservationFeedback(
  reservation?: SaleOrderReservationReconciliation | null,
): { title: string; description?: string } {
  if (!reservation?.checked) {
    return { title: "Pedido actualizado correctamente." };
  }

  const adjustedItems = reservation.items.filter(
    (item) => item.status !== "UNCHANGED",
  );
  const title = adjustedItems.length
    ? `Pedido actualizado. Reserva corregida en ${adjustedItems.length} ${adjustedItems.length === 1 ? "producto" : "productos"}.`
    : "Pedido actualizado. Reserva verificada sin cambios.";
  const description = reservation.items
    .map((item) => {
      if (item.status === "COMPLETED") {
        return `${item.productName} (${item.skuCode}): reservado ${item.previousReserved} → ${item.expectedReserved} (+${item.adjustment}).`;
      }
      if (item.status === "RELEASED_EXCESS") {
        return `${item.productName} (${item.skuCode}): reservado ${item.previousReserved} → ${item.expectedReserved} (${item.adjustment}).`;
      }
      return `${item.productName} (${item.skuCode}): sin cambios (${item.expectedReserved} reservado).`;
    })
    .join(" ");

  return {
    title,
    description: description ? `Revisión de reserva: ${description}` : undefined,
  };
}
