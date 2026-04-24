import { describe, expect, it } from "vitest";
import {
  buildWarehouseSmartSearchColumns,
  sanitizeWarehouseSearchSnapshot,
} from "@/pages/warehouse/utils/warehouseSmartSearch";

describe("warehouseSmartSearch", () => {
  it("normalizes legacy status to isActive and drops createdAt", () => {
    const snapshot = sanitizeWarehouseSearchSnapshot({
      q: "  central  ",
      filters: [
        { field: "status", operator: "in", values: ["true"] },
        { field: "createdAt", operator: "between", range: { start: "2026-04-01", end: "2026-04-02" } },
        { field: "name", operator: "contains", value: " Lima " },
      ],
    });

    expect(snapshot).toEqual({
      q: "central",
      filters: [
        { field: "name", operator: "contains", value: "Lima" },
        { field: "isActive", operator: "in", mode: "include", values: ["true"] },
      ],
    });
  });

  it("builds smart-search columns from activeStates and excludes createdAt", () => {
    const columns = buildWarehouseSmartSearchColumns({
      departments: [],
      provinces: [],
      districts: [],
      activeStates: [{ id: "true", label: "Activos" }],
    });

    expect(columns.some((column) => column.id === "isActive")).toBe(true);
    expect(columns.some((column) => column.id === "createdAt")).toBe(false);
    expect(columns.find((column) => column.id === "isActive")?.options).toEqual([
      { id: "true", label: "Activos" },
    ]);
  });
});
