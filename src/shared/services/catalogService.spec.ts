import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";
import { listSkus } from "@/shared/services/skuService";
import { searchProductAndVariant } from "./catalogService";

vi.mock("@/shared/services/skuService", () => ({
  listSkus: vi.fn(),
}));

describe("catalogService production candidates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests stock-backed SKUs and keeps the stock item as the selectable id", async () => {
    vi.mocked(listSkus).mockResolvedValueOnce({
      items: [
        {
          sku: {
            id: "sku-1",
            productId: "product-1",
            backendSku: "00001",
            customSku: "CUSTOM-1",
            name: "Producto terminado",
            isActive: true,
          },
          attributes: [{ code: "presentation", value: "Caja" }],
          stockItemId: "stock-item-1",
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    });

    const result = await searchProductAndVariant({
      q: "producto",
      productType: ProductTypes.PRODUCT,
      isActive: true,
      hasStockItem: true,
      page: 1,
      limit: 10,
    });

    expect(listSkus).toHaveBeenCalledWith({
      q: "producto",
      productType: ProductTypes.PRODUCT,
      productId: undefined,
      isActive: true,
      hasStockItem: true,
      page: 1,
      limit: 10,
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: "stock-item-1",
        itemId: "stock-item-1",
        stockItemId: "stock-item-1",
        sku: "00001",
        productName: "Producto terminado",
        attributes: { presentation: "Caja" },
      }),
    ]);
  });
});
