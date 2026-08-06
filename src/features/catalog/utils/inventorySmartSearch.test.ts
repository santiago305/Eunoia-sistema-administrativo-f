import { describe, expect, it } from "vitest";
import {
  buildInventorySmartSearchColumns,
  sanitizeInventorySearchSnapshot,
} from "./inventorySmartSearch";

describe("inventory smart search", () => {
  it.each(["include", "exclude"] as const)(
    "preserves the SKU selection in %s mode",
    (mode) => {
      const snapshot = sanitizeInventorySearchSnapshot({
        filters: [{
          field: "sku",
          operator: "IN",
          mode,
          values: ["sku-1", "sku-1", "sku-2"],
        }],
      });

      expect(snapshot.filters).toEqual([{
        field: "sku",
        operator: "IN",
        mode,
        values: ["sku-1", "sku-2"],
      }]);
    },
  );

  it("enables include and exclude for the SKU catalog field", () => {
    const skuField = buildInventorySmartSearchColumns({ warehouses: [], skus: [] })
      .find((field) => field.id === "sku");

    expect(skuField).toEqual(expect.objectContaining({
      supportsExclude: true,
      operators: [{ id: "IN", label: "Es alguno de" }],
    }));
  });
});
