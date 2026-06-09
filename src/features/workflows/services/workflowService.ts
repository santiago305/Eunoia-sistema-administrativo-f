import axiosInstance from "@/shared/common/utils/axios";
import { API_WORKFLOWS_GROUP } from "@/shared/services/APIs";
import type {
  ActionCatalogItem,
  ConditionCatalogItem,
  SaleOrderState,
  SaveFullWorkflowRequest,
  SaveFullWorkflowResponse,
  Workflow,
} from "@/features/workflows/types/workflow";

export async function listWorkflows(): Promise<Workflow[]> {
  const response = await axiosInstance.get<Workflow[]>(API_WORKFLOWS_GROUP.list);
  return response.data;
}

export async function getWorkflow(id: string): Promise<SaveFullWorkflowResponse> {
  const response = await axiosInstance.get<SaveFullWorkflowResponse>(
    API_WORKFLOWS_GROUP.detail(id),
  );
  return response.data;
}

export async function listWorkflowConditions(): Promise<ConditionCatalogItem[]> {
  const response = await axiosInstance.get<ConditionCatalogItem[]>(API_WORKFLOWS_GROUP.conditions);
  return response.data;
}

export async function listWorkflowActions(): Promise<ActionCatalogItem[]> {
  const response = await axiosInstance.get<ActionCatalogItem[]>(API_WORKFLOWS_GROUP.actions);
  return response.data;
}

export async function createFullWorkflow(input: SaveFullWorkflowRequest): Promise<SaveFullWorkflowResponse> {
  const response = await axiosInstance.post<SaveFullWorkflowResponse>(API_WORKFLOWS_GROUP.createFull, input);
  return response.data;
}

export async function updateFullWorkflow(
  id: string,
  input: SaveFullWorkflowRequest,
): Promise<SaveFullWorkflowResponse> {
  const response = await axiosInstance.patch<SaveFullWorkflowResponse>(API_WORKFLOWS_GROUP.updateFull(id), input);
  return response.data;
}

export async function listSaleOrderStates(): Promise<SaleOrderState[]> {
  const response = await axiosInstance.get<SaleOrderState[]>(
    API_WORKFLOWS_GROUP.saleOrderStates,
  );
  return response.data;
}

export async function getSaleOrderState(id: string): Promise<SaleOrderState> {
  const response = await axiosInstance.get<SaleOrderState>(
    API_WORKFLOWS_GROUP.saleOrderStateDetail(id),
  );
  return response.data;
}

export async function createSaleOrderState(input: {
  name: string;
  color: string;
}): Promise<SaleOrderState> {
  const response = await axiosInstance.post<SaleOrderState>(
    API_WORKFLOWS_GROUP.saleOrderStates,
    input,
  );
  return response.data;
}

export async function updateSaleOrderState(
  id: string,
  input: { name: string; color: string },
): Promise<SaleOrderState> {
  const response = await axiosInstance.patch<SaleOrderState>(
    API_WORKFLOWS_GROUP.saleOrderStateDetail(id),
    input,
  );
  return response.data;
}
