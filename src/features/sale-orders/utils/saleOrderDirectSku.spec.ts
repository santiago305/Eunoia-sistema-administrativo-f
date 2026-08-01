import { describe, expect, it } from "vitest";
import { buildSaleOrderItemFromSku } from "./saleOrderDirectSku";

describe("buildSaleOrderItemFromSku", () => {
  it("creates a pack-shaped sale order item from a product SKU without pack references", () => {
    const item = buildSaleOrderItemFromSku({
      sku: {
        id: "sku-1",
        productId: "product-1",
        backendSku: "10017",
        customSku: "EVA01893",
        name: "JABON AZUFRE",
        barcode: "775000000001",
        image: "/uploads/sku.webp",
        price: 12.5,
        cost: 6,
        isSellable: true,
        isPurchasable: false,
        isManufacturable: false,
        isStockTracked: true,
        isActive: true,
      },
      attributes: [
        { code: "presentation", name: "Presentacion", value: "AZUFRE" },
      ],
      unit: { id: "unit-1", name: "Unidad", code: "UND" },
      stockItemId: "stock-1",
    });

    expect(item).toEqual({
      quantity: 1,
      basePrice: 12.5,
      unitPrice: 12.5,
      total: 12.5,
      description: "JABON AZUFRE AZUFRE -10017 (EVA01893)",
      referencePackId: undefined,
      components: [
        {
          skuId: "sku-1",
          skuLabel: "JABON AZUFRE AZUFRE -10017 (EVA01893)",
          skuCode: "10017",
          skuImage: "/uploads/sku.webp",
          sku: {
            id: "sku-1",
            productId: "product-1",
            backendSku: "10017",
            customSku: "EVA01893",
            name: "JABON AZUFRE",
            barcode: "775000000001",
            image: "/uploads/sku.webp",
            price: 12.5,
            cost: 6,
            isSellable: true,
            isPurchasable: false,
            isManufacturable: false,
            isStockTracked: true,
            isActive: true,
            createdAt: undefined,
            updatedAt: null,
          },
          unit: { id: "unit-1", name: "Unidad", code: "UND" },
          attributes: [
            { code: "presentation", name: "Presentacion", value: "AZUFRE" },
          ],
          stockItemId: "stock-1",
          quantity: 1,
          basePrice: 12.5,
          unitPrice: 12.5,
          total: 12.5,
          referencePackItemId: undefined,
        },
      ],
    });
  });

  it("falls back to zero price and safe text when optional SKU fields are missing", () => {
    const item = buildSaleOrderItemFromSku({
      sku: {
        id: "sku-2",
        backendSku: "",
        customSku: null,
        name: "",
        image: null,
      },
      attributes: [],
    });

    expect(item.description).toBe("sku-2");
    expect(item.basePrice).toBe(0);
    expect(item.unitPrice).toBe(0);
    expect(item.total).toBe(0);
    expect(item.referencePackId).toBeUndefined();
    expect(item.components?.[0].referencePackItemId).toBeUndefined();
    expect(item.components?.[0].skuId).toBe("sku-2");
  });
});
