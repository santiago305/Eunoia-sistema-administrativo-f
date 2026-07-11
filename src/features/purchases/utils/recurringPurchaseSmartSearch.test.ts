import { describe, expect, it } from "vitest";
import {
  buildRecurringPurchaseSearchChips,
  buildRecurringPurchaseSmartSearchColumns,
  getRecurringPurchaseSearchRuleSummary,
  sanitizeRecurringPurchaseSearchSnapshot,
} from "./recurringPurchaseSmartSearch";
import {
  RecurringPurchaseSearchFields,
  RecurringPurchaseSearchOperators,
} from "../types/recurring-purchase.types";

describe("recurringPurchaseSmartSearch", () => {
  it("sanitizes and orders recurring purchase smart filters", () => {
    const snapshot = sanitizeRecurringPurchaseSearchSnapshot({
      q: "  hosting  ",
      filters: [
        {
          field: RecurringPurchaseSearchFields.STATUS,
          operator: RecurringPurchaseSearchOperators.IN,
          values: ["ACTIVE", "ACTIVE", "PAUSED"],
        },
        {
          field: RecurringPurchaseSearchFields.NEXT_DUE_DATE,
          operator: RecurringPurchaseSearchOperators.BETWEEN,
          range: { start: "2026-07-01T12:00:00.000Z", end: "2026-07-31" },
        },
        {
          field: RecurringPurchaseSearchFields.AMOUNT,
          operator: RecurringPurchaseSearchOperators.GTE,
          value: "100",
        },
        {
          field: RecurringPurchaseSearchFields.PAYMENT_STATUS,
          operator: RecurringPurchaseSearchOperators.IN,
          values: ["PENDING", "PARTIAL"],
        },
        {
          field: RecurringPurchaseSearchFields.AMOUNT,
          operator: RecurringPurchaseSearchOperators.GTE,
          value: "no-numero",
        },
      ],
    });

    expect(snapshot).toEqual({
      q: "hosting",
      filters: [
        {
          field: RecurringPurchaseSearchFields.NEXT_DUE_DATE,
          operator: RecurringPurchaseSearchOperators.BETWEEN,
          range: { start: "2026-07-01", end: "2026-07-31" },
        },
        {
          field: RecurringPurchaseSearchFields.STATUS,
          operator: RecurringPurchaseSearchOperators.IN,
          mode: "include",
          values: ["ACTIVE", "PAUSED"],
        },
        {
          field: RecurringPurchaseSearchFields.AMOUNT,
          operator: RecurringPurchaseSearchOperators.GTE,
          value: "100",
        },
        {
          field: RecurringPurchaseSearchFields.PAYMENT_STATUS,
          operator: RecurringPurchaseSearchOperators.IN,
          mode: "include",
          values: ["PENDING", "PARTIAL"],
        },
      ],
    });
  });

  it("builds readable chips and summaries for recurring purchase filters", () => {
    const snapshot = sanitizeRecurringPurchaseSearchSnapshot({
      q: "hosting",
      filters: [
        {
          field: RecurringPurchaseSearchFields.SUPPLIER_ID,
          operator: RecurringPurchaseSearchOperators.IN,
          values: ["supplier-1"],
        },
        {
          field: RecurringPurchaseSearchFields.NEXT_DUE_DATE,
          operator: RecurringPurchaseSearchOperators.BETWEEN,
          range: { start: "2026-07-01", end: "2026-07-31" },
        },
        {
          field: RecurringPurchaseSearchFields.PAYMENT_STATUS,
          operator: RecurringPurchaseSearchOperators.IN,
          values: ["PENDING", "PARTIAL"],
        },
      ],
    });

    expect(
      buildRecurringPurchaseSearchChips(snapshot, {
        suppliers: [{ id: "supplier-1", label: "Proveedor Uno" }],
      }).map((chip) => chip.label),
    ).toEqual([
      "Busqueda: hosting",
      "Vencimiento entre 01/07/2026 y 31/07/2026",
      "Proveedor: Proveedor Uno",
      "Estado de pago: Pendiente - Parcial",
    ]);

    expect(
      getRecurringPurchaseSearchRuleSummary(
        snapshot,
        RecurringPurchaseSearchFields.PAYMENT_STATUS,
      ),
    ).toBe("Pendiente - Parcial");
  });

  it("exposes expected smart-search columns for recurring purchases", () => {
    const columns = buildRecurringPurchaseSmartSearchColumns({
      suppliers: [{ id: "supplier-1", label: "Proveedor Uno" }],
    });

    expect(columns.map((column) => column.id)).toEqual([
      RecurringPurchaseSearchFields.NEXT_DUE_DATE,
      RecurringPurchaseSearchFields.SUPPLIER_ID,
      RecurringPurchaseSearchFields.STATUS,
      RecurringPurchaseSearchFields.FREQUENCY,
      RecurringPurchaseSearchFields.CURRENCY,
      RecurringPurchaseSearchFields.PURCHASE_TYPE,
      RecurringPurchaseSearchFields.AMOUNT,
      RecurringPurchaseSearchFields.PAYMENT_STATUS,
      RecurringPurchaseSearchFields.START_DATE,
    ]);
    expect(columns.find((column) => column.id === RecurringPurchaseSearchFields.SUPPLIER_ID)).toEqual(
      expect.objectContaining({
        kind: "catalog",
        supportsExclude: true,
        options: [{ id: "supplier-1", label: "Proveedor Uno" }],
      }),
    );
    expect(columns.find((column) => column.id === RecurringPurchaseSearchFields.AMOUNT)).toEqual(
      expect.objectContaining({
        kind: "number",
        placeholder: "Ej. 120",
      }),
    );
  });
});
