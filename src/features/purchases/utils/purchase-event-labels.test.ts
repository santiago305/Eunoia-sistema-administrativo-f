import { describe, expect, it } from "vitest";
import {
  getPurchaseEventDiffRows,
  getPurchaseEventLabel,
  purchaseEventFilterOptions,
} from "./purchase-event-labels";

describe("purchase event labels", () => {
  it("maps phase 8 purchase history events to readable labels", () => {
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
