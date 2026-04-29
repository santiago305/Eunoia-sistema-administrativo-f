import type { PrimaVariant } from "@/pages/catalog/types/variant";

export type RecipeDraftItem = {
  id: string;
  materialSkuId: string;
  quantity: string;
  unitId: string;
};

export type RecipeDraft = {
  yieldQuantity: string;
  notes: string;
  items: RecipeDraftItem[];
};

export const createEmptyRecipeDraft = (): RecipeDraft => ({
  yieldQuantity: "1",
  notes: "",
  items: [],
});

export const buildRecipeRowId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `recipe-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getPrimaUnitId = (prima?: PrimaVariant) => prima?.unit?.id ?? prima?.baseUnitId ?? "";

export const getPrimaUnitName = (prima?: PrimaVariant) => prima?.unit?.name ?? prima?.unitName ?? "SIN UNIDAD DE MEDIDA";
