import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InventorySnapshotOutput } from "@/features/catalog/types/inventory";
import { listInventory } from "@/shared/services/inventoryService";
import { getSaleOrderStocksBySkuIds } from "./saleOrderStockService";

vi.mock("@/shared/services/inventoryService", () => ({
  listInventory: vi.fn(),
}));

describe("getSaleOrderStocksBySkuIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads several SKU stocks with one inventory request and reuses the short cache", async () => {
    vi.mocked(listInventory).mockResolvedValueOnce({
      items: [
        {
          warehouseId: "warehouse-batch-test",
          stockItemId: "stock-1",
          stockItem: {
            id: "stock-1",
            type: "VARIANT",
            variantId: "sku-batch-1",
            variant: {
              variant: {
                id: "sku-batch-1",
                productId: "product-1",
              },
              productName: "Producto 1",
              productDescription: null,
            },
          },
          onHand: 8,
          reserved: 3,
          available: 5,
        },
        {
          warehouseId: "warehouse-batch-test",
          stockItemId: "stock-2",
          stockItem: {
            id: "stock-2",
            type: "VARIANT",
            variantId: "sku-batch-2",
            variant: {
              id: "sku-batch-2",
              productId: "product-2",
            },
          },
          onHand: 4,
          reserved: 1,
          available: 3,
        },
      ],
      total: 2,
      page: 1,
      limit: 2,
    });

    const request = {
      warehouseId: "warehouse-batch-test",
      skuIds: ["sku-batch-2", "sku-batch-1", "sku-batch-1"],
    };

    const first = await getSaleOrderStocksBySkuIds(request);
    const second = await getSaleOrderStocksBySkuIds(request);

    expect(listInventory).toHaveBeenCalledTimes(1);
    expect(listInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        warehouseId: "warehouse-batch-test",
        skuIdsIn: ["sku-batch-1", "sku-batch-2"],
        limit: 2,
      }),
    );
    expect(first["sku-batch-1"]?.available).toBe(5);
    expect(first["sku-batch-2"]?.available).toBe(3);
    expect(second).toBe(first);
  });

  it("bypasses the short cache when a quantity change requests a refresh", async () => {
    vi.mocked(listInventory).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 1,
    });

    const request = {
      warehouseId: "warehouse-force-refresh-test",
      skuIds: ["sku-force-1"],
    };

    await getSaleOrderStocksBySkuIds(request);
    await getSaleOrderStocksBySkuIds(request);
    await getSaleOrderStocksBySkuIds({
      ...request,
      forceRefresh: true,
      requestKey: "sku-force-1:2",
    });

    expect(listInventory).toHaveBeenCalledTimes(2);
  });

  it("maps normalized inventory rows by sku.sku.id", async () => {
    vi.mocked(listInventory).mockResolvedValueOnce({
      items: [
        {
          sku: {
            sku: {
              id: "sku-normalized-1",
              productId: "product-1",
              backendSku: "10014",
              customSku: "EVA01863",
              name: "AMPOLLA",
            },
            unit: {
              id: "unit-1",
              name: "BALDE",
              code: "BJ",
            },
            attributes: [],
          },
          warehouseId: "warehouse-normalized-test",
          warehouseName: "Almacen Sur",
          onHand: 11101,
          reserved: 34,
          available: 11067,
        } as unknown as InventorySnapshotOutput,
      ],
      total: 1,
      page: 1,
      limit: 1,
    });

    const result = await getSaleOrderStocksBySkuIds({
      warehouseId: "warehouse-normalized-test",
      skuIds: ["sku-normalized-1"],
      forceRefresh: true,
      requestKey: "normalized-contract",
    });

    expect(result["sku-normalized-1"]).toEqual(
      expect.objectContaining({
        warehouseId: "warehouse-normalized-test",
        onHand: 11101,
        reserved: 34,
        available: 11067,
      }),
    );
  });

});
