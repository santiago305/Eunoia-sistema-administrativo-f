export type WorkflowSupplyRecipeItem = {
  id: string;
  supplySkuId: string;
  quantity: number;
  unitId: string;
  supplyName: string;
  skuName: string;
  backendSku: string;
  unitName: string;
  unitCode: string;
};

export type WorkflowSupplyRecipe = {
  id: string;
  workflowId: string;
  version: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: WorkflowSupplyRecipeItem[];
};

export type SaveWorkflowSupplyRecipe = {
  notes?: string | null;
  items: Array<{
    supplySkuId: string;
    quantity: number;
    unitId: string;
  }>;
};
