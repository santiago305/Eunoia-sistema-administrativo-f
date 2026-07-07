import { describe, expect, it } from "vitest";
import {
  getPurchaseEventDiffRows,
  getPurchaseEventLabel,
  purchaseEventFilterOptions,
} from "./purchase-event-labels";

describe("purchase event labels", () => {
  it("maps phase 8 purchase history events to readable labels", () => {
    expect(getPurchaseEventLabel("PURCHASE_CREATED")).toBe("Compra creada");
    expect(getPurchaseEventLabel("PURCHASE_EXTRA_TIME_ADDED")).toBe("Tiempo extra agregado");
    expect(getPurchaseEventLabel("PURCHASE_ATTACHMENT_UPLOADED")).toBe("Documento subido");
    expect(getPurchaseEventLabel("PURCHASE_ATTACHMENT_DELETED")).toBe("Documento eliminado");
    expect(getPurchaseEventLabel("PURCHASE_QUOTA_CREATED")).toBe("Cuota creada");
    expect(getPurchaseEventLabel("PURCHASE_QUOTA_DELETED")).toBe("Cuota eliminada");
    expect(getPurchaseEventLabel("PURCHASE_STOCK_ENTRY_CREATED")).toBe("Ingreso de stock creado");
    expect(getPurchaseEventLabel("PURCHASE_SERVICE_CONFIRMED")).toBe("Servicio confirmado");
    expect(getPurchaseEventLabel("PAYMENT_EVIDENCE_ATTACHED")).toBe("Evidencia de pago adjuntada");
    expect(getPurchaseEventLabel("PURCHASE_FULLY_RECEIVED")).toBe("Compra recibida completamente");
    expect(getPurchaseEventLabel("UNKNOWN_EVENT")).toBe("UNKNOWN_EVENT");
  });

  it("exposes filter options for every known event", () => {
    expect(purchaseEventFilterOptions).toContainEqual({
      value: "PAYABLE_OVERDUE",
      label: "Cuenta por pagar vencida",
    });
    expect(purchaseEventFilterOptions.length).toBeGreaterThanOrEqual(28);
  });

  it("builds before and after diff rows from oldValues and newValues", () => {
    expect(
      getPurchaseEventDiffRows(
        { status: "DRAFT", total: 100, unchanged: "same" },
        { status: "SENT", total: 120, unchanged: "same" },
      ),
    ).toEqual([
      { field: "status", before: "DRAFT", after: "SENT" },
      { field: "total", before: "100", after: "120" },
    ]);
  });
});
