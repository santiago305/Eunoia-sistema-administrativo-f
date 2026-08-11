import { describe, expect, it } from "vitest";
import type { PrimaVariant } from "@/features/catalog/types/variant";
import {
  formatRecipeQuantity,
  getRecipeMaterialVariants,
  isValidRecipeQuantity,
  mergePrimaVariants,
  normalizeRecipeQuantityInput,
} from "./recipeFormFields.helpers";

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

describe("recipe quantities", () => {
  it("accepts at most two decimal places while the user types", () => {
    expect(normalizeRecipeQuantityInput("1,25")).toBe("1.25");
    expect(normalizeRecipeQuantityInput("1.234")).toBeNull();
    expect(normalizeRecipeQuantityInput("")).toBe("");
  });

  it("validates the minimum and decimal precision", () => {
    expect(isValidRecipeQuantity("0.01")).toBe(true);
    expect(isValidRecipeQuantity("12.34")).toBe(true);
    expect(isValidRecipeQuantity("0.001")).toBe(false);
    expect(isValidRecipeQuantity("12.345")).toBe(false);
  });

  it("formats persisted quantities with no more than two decimals", () => {
    expect(formatRecipeQuantity(1.236)).toBe("1.24");
    expect(formatRecipeQuantity(2)).toBe("2");
  });
});
