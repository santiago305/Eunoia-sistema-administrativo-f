import { describe, expect, it } from "vitest";
import {
  normalizeSaleOrderItemComponent,
  toSaleOrderItemComponentCommand,
} from "./saleOrderItemComponents";

describe("saleOrderItemComponents", () => {
  it("keeps the canonical nested SKU structure", () => {
    const component = normalizeSaleOrderItemComponent({
      id: "component-1",
      sku: {
        id: "sku-1",
        productId: "product-1",
        backendSku: "10018",
        customSku: "EVA01894",
        name: "MASCARILLA VERDE",
        barcode: null,
        image: null,
        price: 25,
      },
      unit: { id: "unit-1", name: "UNIDADES", code: "NIU" },
      attributes: [{ code: "variant", name: "variant", value: "VERDE" }],
      stockItemId: "stock-1",
      quantity: 2,
      unitPrice: 10,
      total: 20,
    });

    expect(component.sku?.image).toBeNull();
    expect(component.sku?.id).toBe("sku-1");
    expect(component.unit?.code).toBe("NIU");
    expect(component.attributes?.[0]?.value).toBe("VERDE");
    expect(component.stockItemId).toBe("stock-1");
    expect(component).not.toHaveProperty("skuLabel");
    expect(component).not.toHaveProperty("skuCode");
    expect(component).not.toHaveProperty("skuImage");
  });

  it("normalizes the previous flat editor structure once at the boundary", () => {
    const component = normalizeSaleOrderItemComponent({
      skuId: "sku-1",
      skuLabel: "MASCARILLA VERDE VERDE -10018 (EVA01894)",
      skuCode: "10018",
      skuImage: null,
      quantity: 1,
      unitPrice: 22,
      total: 22,
    });

    expect(component.sku).toEqual(
      expect.objectContaining({
        id: "sku-1",
        backendSku: "10018",
        name: "MASCARILLA VERDE VERDE -10018 (EVA01894)",
        image: null,
      }),
    );
    expect(component.attributes).toEqual([]);
    expect(component.stockItemId).toBeNull();
  });

  it("serializes the canonical component to the backend command", () => {
    const component = normalizeSaleOrderItemComponent({
      sku: {
        id: "sku-1",
        backendSku: "10018",
        customSku: "EVA01894",
        name: "MASCARILLA VERDE",
        barcode: null,
        image: null,
      },
      attributes: [],
      quantity: 1,
      unitPrice: 22,
      total: 22,
    });

    expect(toSaleOrderItemComponentCommand(component)).toEqual({
      skuId: "sku-1",
      quantity: 1,
      unitPrice: 22,
      total: 22,
    });
  });
});
