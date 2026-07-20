import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "@/shared/common/utils/axios";
import {
  getInventoryAlertSetting,
  listInventory,
  listInventoryAlertSettings,
  updateInventoryAlertSetting,
} from "./inventoryService";

vi.mock("@/shared/common/utils/axios", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("inventoryService alert settings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads list and detail endpoints for inventory alert settings", async () => {
    vi.mocked(axiosInstance.get)
      .mockResolvedValueOnce({
        data: [
          {
            id: "setting-1",
            stockItemId: "stock-1",
            warehouseId: null,
            minStockAlertQty: "8",
            alertThresholdDays: "3",
            alertEnabled: true,
            isDefault: false,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: {
          id: "setting-2",
          stockItemId: "stock-2",
          warehouseId: "warehouse-1",
          minStockAlertQty: null,
          alertThresholdDays: 5,
          alertEnabled: false,
          isDefault: true,
        },
      });

    const list = await listInventoryAlertSettings({ stockItemId: "stock-1" });
    const detail = await getInventoryAlertSetting("stock-2", { warehouseId: "warehouse-1" });

    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, "/inventory-alert-settings", {
      params: { stockItemId: "stock-1" },
    });
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, "/inventory-alert-settings/stock-2", {
      params: { warehouseId: "warehouse-1" },
    });
    expect(list[0]).toMatchObject({
      stockItemId: "stock-1",
      warehouseId: null,
      minStockAlertQty: 8,
      alertThresholdDays: 3,
      alertEnabled: true,
      isDefault: false,
    });
    expect(detail).toMatchObject({
      stockItemId: "stock-2",
      warehouseId: "warehouse-1",
      alertThresholdDays: 5,
      alertEnabled: false,
      isDefault: true,
    });
  });

  it("updates inventory alert settings through the stock item endpoint", async () => {
    vi.mocked(axiosInstance.patch).mockResolvedValueOnce({
      data: {
        id: "setting-3",
        stockItemId: "stock-3",
        warehouseId: null,
        minStockAlertQty: 4,
        alertThresholdDays: 2,
        alertEnabled: true,
        isDefault: false,
      },
    });

    const result = await updateInventoryAlertSetting("stock-3", {
      warehouseId: null,
      minStockAlertQty: 4,
      alertThresholdDays: 2,
      alertEnabled: true,
    });

    expect(axiosInstance.patch).toHaveBeenCalledWith("/inventory-alert-settings/stock-3", {
      warehouseId: null,
      minStockAlertQty: 4,
      alertThresholdDays: 2,
      alertEnabled: true,
    });
    expect(result).toMatchObject({
      stockItemId: "stock-3",
      minStockAlertQty: 4,
      alertThresholdDays: 2,
      alertEnabled: true,
    });
  });
});

describe("inventoryService snapshots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes repeated warehouse and sku filters before requesting inventory", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, limit: 25 } });

    await listInventory({
      warehouseId: "warehouse-a",
      warehouseIdsIn: ["warehouse-a", " warehouse-b "],
      skuId: "sku-a",
      skuIdsIn: "sku-a,sku-b",
      search: " harina ",
      page: 1,
      limit: 25,
    });

    expect(axiosInstance.get).toHaveBeenCalledWith("/inventory", {
      params: expect.objectContaining({
        warehouseIdsIn: "warehouse-a,warehouse-b",
        skuIdsIn: "sku-a,sku-b",
        q: "harina",
      }),
    });
  });
});
