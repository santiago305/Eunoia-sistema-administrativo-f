import { describe, expect, it } from "vitest";
import type { PrimaVariant } from "@/features/catalog/types/variant";
import { mergePrimaVariants } from "./recipeFormFields.helpers";

const variant = (id: string, productName: string): PrimaVariant => ({
  id,
  productName,
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
