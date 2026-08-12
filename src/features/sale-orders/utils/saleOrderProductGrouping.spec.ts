import { describe, expect, it } from "vitest";
import type {
  SaleOrderItemInput,
  SaleOrderPackMatchResponse,
} from "@/features/sale-orders/types/saleOrder";
import {
  getIndependentProductMatchCandidate,
  groupIndependentProductsAsMatchedPack,
} from "./saleOrderProductGrouping";

const independentItem = (
  skuId: string,
  quantity: number,
  unitPrice: number,
): SaleOrderItemInput => ({
  id: `item-${skuId}`,
  quantity,
  basePrice: unitPrice,
  unitPrice,
  total: Math.round(quantity * unitPrice * 100) / 100,
  description: skuId,
  components: [
    {
      id: `component-${skuId}`,
      saleOrderItemId: `item-${skuId}`,
      skuId,
      quantity,
      basePrice: unitPrice,
      unitPrice,
      total: Math.round(quantity * unitPrice * 100) / 100,
    },
  ],
});

const uniqueMatch: SaleOrderPackMatchResponse = {
  status: "UNIQUE",
  composition: [
    { skuId: "sku-a", quantity: 1 },
    { skuId: "sku-b", quantity: 2 },
  ],
  matches: [{ id: "pack-1", description: "Pack Dúo", total: 99 }],
  pack: {
    id: "pack-1",
    description: "Pack Dúo",
    total: 99,
    components: [
      {
        id: "pack-item-a",
        skuId: "sku-a",
        quantity: 1,
        price: 40,
        lineTotal: 40,
      },
      {
        id: "pack-item-b",
        skuId: "sku-b",
        quantity: 2,
        price: 29.5,
        lineTotal: 59,
      },
    ],
  },
};

describe("saleOrderProductGrouping", () => {
  it("builds a sorted two-decimal composition from every independent line", () => {
    const candidate = getIndependentProductMatchCandidate([
      independentItem("sku-b", 1.004, 10),
      independentItem("sku-a", 1, 20),
      independentItem("sku-b", 1.006, 10),
    ]);

    expect(candidate).toEqual({
      itemIndexes: [0, 1, 2],
      composition: [
        { skuId: "sku-a", quantity: 1 },
        { skuId: "sku-b", quantity: 2.01 },
      ],
    });
  });

  it("replaces only independent products and preserves their commercial value", () => {
    const existingPack: SaleOrderItemInput = {
      quantity: 1,
      unitPrice: 80,
      total: 80,
      description: "Pack existente",
      referencePackId: "pack-existing",
      components: [],
    };
    const unknownPack: SaleOrderItemInput = {
      quantity: 1,
      unitPrice: 30,
      total: 30,
      description: "Importado",
      components: [
        { skuId: "sku-x", quantity: 1, unitPrice: 10, total: 10 },
        { skuId: "sku-y", quantity: 1, unitPrice: 20, total: 20 },
      ],
    };
    const items = [
      existingPack,
      independentItem("sku-a", 1, 12.5),
      unknownPack,
      independentItem("sku-b", 2, 7.25),
    ];

    const result = groupIndependentProductsAsMatchedPack(items, uniqueMatch);

    expect(result).toHaveLength(3);
    expect(result[0]).toBe(existingPack);
    expect(result[2]).toBe(unknownPack);
    expect(result[1]).toEqual(
      expect.objectContaining({
        description: "Pack Dúo",
        referencePackId: "pack-1",
        quantity: 1,
        basePrice: 99,
        unitPrice: 27,
        total: 27,
      }),
    );
    expect(result[1].components).toEqual([
      expect.objectContaining({
        skuId: "sku-a",
        quantity: 1,
        unitPrice: 12.5,
        total: 12.5,
        referencePackItemId: "pack-item-a",
        id: undefined,
        saleOrderItemId: undefined,
      }),
      expect.objectContaining({
        skuId: "sku-b",
        quantity: 2,
        unitPrice: 7.25,
        total: 14.5,
        referencePackItemId: "pack-item-b",
        id: undefined,
        saleOrderItemId: undefined,
      }),
    ]);
  });

  it.each([
    {
      status: "NONE" as const,
      composition: uniqueMatch.composition,
      matches: [] as [],
    },
    {
      status: "AMBIGUOUS" as const,
      composition: uniqueMatch.composition,
      matches: [
        { id: "pack-1", description: "Pack 1", total: 10 },
        { id: "pack-2", description: "Pack 2", total: 10 },
      ],
    },
  ])("keeps independent products for $status", (match) => {
    const items = [
      independentItem("sku-a", 1, 10),
      independentItem("sku-b", 2, 20),
    ];

    expect(groupIndependentProductsAsMatchedPack(items, match)).toBe(items);
  });

  it("does not apply a response when quantities changed while matching", () => {
    const items = [
      independentItem("sku-a", 1, 10),
      independentItem("sku-b", 3, 20),
    ];

    expect(groupIndependentProductsAsMatchedPack(items, uniqueMatch)).toBe(
      items,
    );
  });

  it("does not query compositions containing only one distinct SKU", () => {
    expect(
      getIndependentProductMatchCandidate([
        independentItem("sku-a", 1, 10),
        independentItem("sku-a", 2, 10),
      ]),
    ).toBeNull();
  });
});
