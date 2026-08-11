import { describe, expect, it } from "vitest";
import {
  addOrIncreaseSaleOrderSupply,
  mapRecipeToSaleOrderSupplies,
} from "./saleOrderSupplies.helpers";

const supply = {
  supplySkuId: "sku-1",
  quantity: "1.25",
  unitId: "unit-1",
  supplyName: "Bolsa",
  skuName: "Bolsa grande",
  backendSku: "SUP-001",
  unitName: "Unidad",
  unitCode: "UND",
};

describe("saleOrderSupplies helpers", () => {
  it("increases quantity instead of duplicating the same supply", () => {
    const result = addOrIncreaseSaleOrderSupply(
      [supply],
      { ...supply, quantity: "0.5" },
    );

    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe("1.75");
  });

  it("maps a workflow recipe preserving its reference item", () => {
    const result = mapRecipeToSaleOrderSupplies({
      id: "recipe-1",
      workflowId: "workflow-1",
      version: 1,
      notes: null,
      createdAt: "2026-08-11",
      updatedAt: "2026-08-11",
      items: [
        {
          id: "recipe-item-1",
          supplySkuId: "sku-1",
          quantity: 2.345,
          unitId: "unit-1",
          supplyName: "Bolsa",
          skuName: "Bolsa grande",
          backendSku: "SUP-001",
          unitName: "Unidad",
          unitCode: "UND",
        },
      ],
    });

    expect(result[0]).toMatchObject({
      quantity: "2.35",
      referenceRecipeItemId: "recipe-item-1",
    });
  });
});
