import { describe, expect, it } from "vitest";
import {
  buildInventorySearchChips,
  buildInventorySmartSearchColumns,
  sanitizeInventorySearchSnapshot,
} from "@/pages/catalog/utils/inventorySmartSearch";

describe("inventorySmartSearch", () => {
  it("keeps sku, warehouse and numeric filters in order", () => {
    const snapshot = sanitizeInventorySearchSnapshot({
      q: " arcilla ",
      filters: [
        { field: "available", operator: "GTE", value: "5" },
        { field: "warehouse", operator: "IN", values: ["w1"] },
        { field: "sku", operator: "CONTAINS", value: "verde" },
      ],
    });

    expect(snapshot).toEqual({
      q: "arcilla",
      filters: [
        { field: "sku", operator: "CONTAINS", value: "verde" },
        { field: "warehouse", operator: "IN", mode: "include", values: ["w1"] },
        { field: "available", operator: "GTE", value: "5" },
      ],
    });
  });

  it("builds chips with dynamic item label", () => {
    const chips = buildInventorySearchChips(
      {
        filters: [
          { field: "sku", operator: "EQ", value: "MAT-001" },
          { field: "warehouse", operator: "IN", values: ["w1"] },
        ],
      },
      { warehouses: [{ id: "w1", label: "Principal" }] },
      { item: "Material" },
    );

    expect(chips.map((chip) => chip.label)).toEqual([
      "Material: = MAT-001",
      "Almacen: Principal",
    ]);
  });

  it("uses the configured item label in smart-search columns", () => {
    const columns = buildInventorySmartSearchColumns(undefined, { item: "Material" });

    expect(columns[0]?.label).toBe("Material");
    expect(columns[0]?.id).toBe("sku");
  });
});
