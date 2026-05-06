import { describe, expect, it } from "vitest";
import { sanitizePurchaseSearchSnapshot } from "@/features/purchases/utils/purchaseSmartSearch";

describe("purchaseSmartSearch", () => {
  it("keeps current smart-search contract for catalog, numeric and date fields", () => {
    const snapshot = sanitizePurchaseSearchSnapshot({
      q: "  compra  ",
      filters: [
        { field: "supplierId", operator: "in", values: ["sup-1"] },
        { field: "warehouseId", operator: "in", values: ["wh-1"] },
        { field: "status", operator: "in", values: ["DRAFT"] },
        { field: "documentType", operator: "in", values: ["FACTURA"] },
        { field: "paymentForm", operator: "in", values: ["CONTADO"] },
        { field: "total", operator: "gte", value: "150.50" },
        { field: "waitTime", operator: "in", values: ["IN_PROGRESS"] },
        { field: "dateIssue", operator: "after", value: "2026-04-10T10:30:00.000Z" },
        { field: "expectedAt", operator: "between", range: { start: "2026-04-12", end: "2026-04-15" } },
      ],
    });

    expect(snapshot.q).toBe("compra");
    expect(snapshot.filters).toEqual([
      expect.objectContaining({
        field: "dateIssue",
        operator: "after",
      }),
      { field: "documentType", operator: "in", mode: "include", values: ["FACTURA"] },
      { field: "supplierId", operator: "in", mode: "include", values: ["sup-1"] },
      { field: "warehouseId", operator: "in", mode: "include", values: ["wh-1"] },
      { field: "paymentForm", operator: "in", mode: "include", values: ["CONTADO"] },
      { field: "total", operator: "gte", value: "150.50" },
      { field: "status", operator: "in", mode: "include", values: ["DRAFT"] },
      { field: "waitTime", operator: "in", mode: "include", values: ["IN_PROGRESS"] },
      { field: "expectedAt", operator: "between", range: { start: "2026-04-12", end: "2026-04-15" } },
    ]);

    expect(snapshot.filters[0]?.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });
});
