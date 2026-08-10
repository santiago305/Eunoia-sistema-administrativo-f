import axiosInstance from '@/shared/common/utils/axios';
import { API_WORKFLOW_SUPPLY_RECIPES_GROUP } from '@/shared/services/APIs';
import type {
  SaveWorkflowSupplyRecipe,
  WorkflowSupplyRecipe,
} from '@/features/catalog/types/workflowSupplyRecipe';

export const getWorkflowSupplyRecipe = async (
  workflowId: string,
): Promise<WorkflowSupplyRecipe | null> => {
  const response = await axiosInstance.get<WorkflowSupplyRecipe | null>(
    API_WORKFLOW_SUPPLY_RECIPES_GROUP.byWorkflow(workflowId),
  );
  return response.data;
};

export const saveWorkflowSupplyRecipe = async (
  workflowId: string,
  payload: SaveWorkflowSupplyRecipe,
): Promise<WorkflowSupplyRecipe> => {
  const response = await axiosInstance.put<WorkflowSupplyRecipe>(
    API_WORKFLOW_SUPPLY_RECIPES_GROUP.byWorkflow(workflowId),
    payload,
  );
  return response.data;
};
