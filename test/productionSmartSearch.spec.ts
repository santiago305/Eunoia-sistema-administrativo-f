import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildProductionSmartSearchColumns,
  sanitizeProductionSearchSnapshot,
} from "@/features/production/utils/productionSmartSearch";

const mockAxiosGet = vi.fn();

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: mockAxiosGet,
  },
}));

describe("productionSmartSearch", () => {
  beforeEach(() => {
    mockAxiosGet.mockReset();
  });

  it("normalizes legacy productId to skuId and serie to number", () => {
    const snapshot = sanitizeProductionSearchSnapshot({
      q: "  orden  ",
      filters: [
        { field: "productId", operator: "in", values: ["sku-1"] },
        { field: "serie", operator: "contains", value: " OP-001 " },
      ],
    });

    expect(snapshot).toEqual({
      q: "orden",
      filters: [
        { field: "number", operator: "contains", value: "OP-001" },
        { field: "skuId", operator: "in", mode: "include", values: ["sku-1"] },
      ],
    });
  });

  it("reuses warehouses catalog for origin and destination columns", () => {
    const columns = buildProductionSmartSearchColumns({
      recent: [],
      saved: [],
      catalogs: {
        warehouses: [{ id: "wh-1", label: "Planta Central" }],
        statuses: [{ id: "DRAFT", label: "Borrador" }],
        products: [{ id: "sku-1", label: "SKU-1 - Producto" }],
      },
    } as any);

    expect(columns.find((column) => column.id === "fromWarehouseId")?.options).toEqual([
      { id: "wh-1", label: "Planta Central" },
    ]);
    expect(columns.find((column) => column.id === "toWarehouseId")?.options).toEqual([
      { id: "wh-1", label: "Planta Central" },
    ]);
    expect(columns.some((column) => column.id === "skuId")).toBe(true);
    expect(columns.some((column) => column.id === "productId")).toBe(false);
    expect(columns.some((column) => column.id === "number")).toBe(true);
    expect(columns.some((column) => column.id === "serie")).toBe(false);
  });
});

describe("productionService", () => {
  it("normalizes search-state catalog options from value to id", async () => {
    mockAxiosGet.mockResolvedValue({
      data: {
        recent: [],
        saved: [],
        catalogs: {
          statuses: [{ value: "DRAFT", label: "Borrador" }],
          warehouses: [{ value: "wh-1", label: "Planta Central" }],
          products: [{ value: "sku-1", label: "SKU-1 - Producto" }],
        },
      },
    });

    const { getProductionSearchState } = await import("@/shared/services/productionService");
    const state = await getProductionSearchState();

    expect(state.catalogs.statuses).toEqual([{ id: "DRAFT", label: "Borrador", keywords: undefined }]);
    expect(state.catalogs.warehouses).toEqual([{ id: "wh-1", label: "Planta Central", keywords: undefined }]);
    expect(state.catalogs.products).toEqual([{ id: "sku-1", label: "SKU-1 - Producto", keywords: undefined }]);
  });
});
