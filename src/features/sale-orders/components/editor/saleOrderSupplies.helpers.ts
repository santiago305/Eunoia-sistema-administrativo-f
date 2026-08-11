import type { WorkflowSupplyRecipe } from "@/features/catalog/types/workflowSupplyRecipe";
import {
  formatRecipeQuantity,
  roundRecipeQuantity,
} from "@/features/catalog/components/recipeFormFields.helpers";
import type { SaleOrderEditorSupply } from "./saleOrderEditorForm";

export const mapRecipeToSaleOrderSupplies = (
  recipe: WorkflowSupplyRecipe | null,
): SaleOrderEditorSupply[] =>
  (recipe?.items ?? []).map((item) => ({
    id: undefined,
    supplySkuId: item.supplySkuId,
    quantity: formatRecipeQuantity(item.quantity),
    unitId: item.unitId,
    referenceRecipeItemId: item.id,
    supplyName: item.supplyName,
    skuName: item.skuName,
    backendSku: item.backendSku,
    customSku: null,
    unitName: item.unitName,
    unitCode: item.unitCode,
  }));

export const addOrIncreaseSaleOrderSupply = (
  supplies: SaleOrderEditorSupply[],
  incoming: SaleOrderEditorSupply,
): SaleOrderEditorSupply[] => {
  const existing = supplies.find(
    (supply) => supply.supplySkuId === incoming.supplySkuId,
  );
  if (!existing) return [...supplies, incoming];

  return supplies.map((supply) =>
    supply.supplySkuId === incoming.supplySkuId
      ? {
          ...supply,
          quantity: formatRecipeQuantity(
            roundRecipeQuantity(supply.quantity) +
              roundRecipeQuantity(incoming.quantity),
          ),
        }
      : supply,
  );
};
