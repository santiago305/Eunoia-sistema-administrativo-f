import { describe, expect, it } from "vitest";
import {
  buildProviderSmartSearchColumns,
  sanitizeProviderSearchSnapshot,
} from "@/features/providers/utils/providerSmartSearch";

describe("providerSmartSearch", () => {
  it("normalizes legacy status to isActive and drops leadTimeDays", () => {
    const snapshot = sanitizeProviderSearchSnapshot({
      q: "  ana  ",
      filters: [
        { field: "status", operator: "in", values: ["false"] },
        { field: "leadTimeDays", operator: "gte", value: "7" },
        { field: "documentNumber", operator: "contains", value: " 20123 " },
      ],
    });

    expect(snapshot).toEqual({
      q: "ana",
      filters: [
        { field: "isActive", operator: "in", mode: "include", values: ["false"] },
        { field: "documentNumber", operator: "contains", value: "20123" },
      ],
    });
  });

  it("builds smart-search columns from activeStates and excludes leadTimeDays", () => {
    const columns = buildProviderSmartSearchColumns({
      recent: [],
      saved: [],
      catalogs: {
        documentTypes: [{ id: "RUC", label: "RUC" }],
        activeStates: [{ id: "true", label: "Activos" }],
      },
    } as any);

    expect(columns.some((column) => column.id === "isActive")).toBe(true);
    expect(columns.some((column) => column.id === "leadTimeDays")).toBe(false);
    expect(columns.find((column) => column.id === "isActive")?.options).toEqual([
      { id: "true", label: "Activos" },
    ]);
  });
});
