import { describe, expect, it } from "vitest";
import type { PrimaVariant } from "@/features/catalog/types/variant";
import { getRecipeMaterialVariants, mergePrimaVariants } from "./recipeFormFields.helpers";

const variant = (id: string, productName: string): PrimaVariant => ({
  id,
  productName,
});

describe("getRecipeMaterialVariants", () => {
  it("hydrates active and inactive materials returned with a recipe", () => {
    const result = getRecipeMaterialVariants({
      recipe: { id: "recipe", skuId: "product", version: 1, yieldQuantity: 1, notes: null, isActive: true },
      items: [{
        id: "item",
        recipeId: "recipe",
        materialSkuId: "material",
        quantity: 80,
        unitId: "unit",
        materialSku: {
          sku: { id: "material", name: "Arcilla", backendSku: "00021", customSku: null, isActive: false },
          unit: { id: "unit", name: "GRAMOS", code: "GRM" },
          attributes: [{ code: "color", name: "Color", value: "Rosada" }],
        },
      }],
    });

    expect(result).toEqual([expect.objectContaining({
      id: "material",
      productName: "Arcilla",
      sku: "00021",
      isActive: false,
      attributes: { color: "Rosada" },
    })]);
  });
});

describe("mergePrimaVariants", () => {
  it("keeps previously selected materials when new search results arrive", () => {
    const clay = variant("clay", "Arcilla");
    const bag = variant("bag", "Bolsa Doypack");

    expect(mergePrimaVariants([clay], [bag])).toEqual([clay, bag]);
  });

  it("deduplicates materials by SKU id and uses the latest data", () => {
    const previous = variant("clay", "Arcilla");
    const refreshed = variant("clay", "Arcilla rosada");

    expect(mergePrimaVariants([previous], [refreshed])).toEqual([refreshed]);
  });
});
