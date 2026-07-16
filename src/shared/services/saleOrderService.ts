import axiosInstance from "@/shared/common/utils/axios";
import { API_SALE_ORDERS_GROUP } from "@/shared/services/APIs";
import type {
  CreateSaleOrderCommandDto,
  CreateSaleOrderResponse,
  SaleOrder,
  SaleOrderExportColumn,
  SaleOrderExportPreset,
  SaleOrderEditorCatalogsResponse,
  SaleOrderSkuAttribute,
  SaleOrderSkuSnapshot,
  SaleOrderSkuUnit,
  SaleOrderJsonImportPreviewResponse,
  SaleOrderJsonImportRow,
  SaleOrderListResponse,
  SaleOrderPayment,
  SaleOrderSearchSnapshot,
  SaleOrderSearchStateResponse,
  SaleOrderStatisticsParams,
  SaleOrderStatisticsResponse,
  SaveSaleOrderWithClientDto,
  SaveSaleOrderWithClientFiles,
} from "@/features/sale-orders/types/saleOrder";
import { buildSaleOrderUnifiedRequest } from "@/features/sale-orders/utils/saleOrderUnifiedRequest";
import type {
  AvailableTransition,
  SaleOrderWorkflowHistoryItem,
} from "@/features/workflows/types/workflow";

export type CreateSaleOrderPaymentDto = {
  bankAccountId: string;
  method: string;
  amount: number;
  date?: string;
  operationNumber?: string;
  note?: string;
};

export type ChangeSaleOrderStateResponse = {
  type: "success";
  message: string;
  data: SaleOrder;
  warnings: string[];
};

export type SaleOrderBulkActionSuccessRow = {
  saleOrderId: string;
  status: "success";
  targetStateId?: string;
  initialState?: SaleOrderWorkflowStateReference | null;
  finalState?: SaleOrderWorkflowStateReference | null;
  completedTransitions?: CompletedSaleOrderWorkflowTransition[];
  warnings?: string[];
};

export type SaleOrderBulkActionFailedRow = {
  saleOrderId: string;
  status: "failed";
  targetStateId?: string;
  message: string;
  initialState?: SaleOrderWorkflowStateReference | null;
  finalState?: SaleOrderWorkflowStateReference | null;
  completedTransitions?: CompletedSaleOrderWorkflowTransition[];
  warnings?: string[];
  failure?: SaleOrderWorkflowRouteFailure;
};

export type SaleOrderBulkActionResultRow =
  | SaleOrderBulkActionSuccessRow
  | SaleOrderBulkActionFailedRow;

export type SaleOrderBulkActionResponse = {
  type: "success" | string;
  message: string;
  data: {
    targetStateId?: string;
    requested: number;
    succeeded: number;
    failed: number;
    partiallyCompleted?: number;
    results: SaleOrderBulkActionResultRow[];
  };
};

export type BulkAssignSaleOrdersPayload = {
  saleOrderIds: string[];
  assignedBy: string | null;
};

export type BulkChangeSaleOrderStatePayload = {
  saleOrderIds: string[];
  targetStateId: string;
};

export type SaleOrderWorkflowStateReference = {
  workflowStateId: string;
  saleOrderStateId: string;
  code: string;
  name: string;
};

export type CompletedSaleOrderWorkflowTransition = {
  transitionId: string;
  code: string;
  name: string;
  fromState: SaleOrderWorkflowStateReference;
  toState: SaleOrderWorkflowStateReference;
  warnings: string[];
  actionOutcomes: Array<{
    actionType: string;
    status: string;
    message?: string;
  }>;
};

export type SaleOrderWorkflowRouteFailure = {
  code:
    | "SALE_ORDER_NOT_FOUND"
    | "WORKFLOW_NOT_ASSIGNED"
    | "WORKFLOW_NOT_FOUND"
    | "WORKFLOW_INACTIVE"
    | "CURRENT_STATE_INVALID"
    | "CURRENT_STATE_INACTIVE"
    | "TARGET_STATE_NOT_IN_WORKFLOW"
    | "TARGET_STATE_INACTIVE"
    | "ROUTE_NOT_FOUND"
    | "AMBIGUOUS_ROUTE"
    | "CONDITION_FAILED"
    | "ACTION_FAILED"
    | "ROUTE_INVALIDATED"
    | "UNEXPECTED_ERROR";
  message: string;
  details?: Record<string, unknown>;
};

export type SaleOrderItemComponentOutput = {
  id: string;
  saleOrderItemId: string;
  sku: SaleOrderSkuSnapshot;
  unit: SaleOrderSkuUnit | null;
  attributes: SaleOrderSkuAttribute[];
  stockItemId: string | null;
  referencePackItemId: string | null;
  quantity: number;
  basePrice?: number;
  unitPrice: number;
  total: number;
  createdAt: string;
};

export type SaleOrderComponentsOutput = {
  saleOrderId: string;
  items: Array<{
    saleOrderItemId: string;
    components: SaleOrderItemComponentOutput[];
  }>;
};

export const getSaleOrderItemComponents = async (
  itemId: string,
): Promise<SaleOrderComponentsOutput> => {
  const response = await axiosInstance.get(
    API_SALE_ORDERS_GROUP.itemComponents(itemId),
  );
  return response.data;
};

export const createSaleOrder = async (payload: CreateSaleOrderCommandDto): Promise<CreateSaleOrderResponse> => {
  const response = await axiosInstance.post<CreateSaleOrderResponse>(API_SALE_ORDERS_GROUP.create, payload);
  return response.data;
};

export const previewSaleOrdersJsonImport = async (
  rows: SaleOrderJsonImportRow[],
): Promise<SaleOrderJsonImportPreviewResponse> => {
  const response = await axiosInstance.post<SaleOrderJsonImportPreviewResponse>(
    API_SALE_ORDERS_GROUP.importPreview,
    rows,
  );
  return response.data;
};

export const listSaleOrders = async (params: {
  q?: string;
  page?: number;
  limit?: number;
  filters?: unknown[] | string;
}): Promise<SaleOrderListResponse> => {
  const requestParams = {
    ...params,
    filters:
      Array.isArray(params.filters) && params.filters.length
        ? JSON.stringify(params.filters)
        : typeof params.filters === "string"
          ? params.filters
          : undefined,
  };

  const response = await axiosInstance.get<SaleOrderListResponse>(API_SALE_ORDERS_GROUP.list, { params: requestParams });
  return response.data;
};

export const fetchSaleOrders = listSaleOrders;

export const fetchSaleOrderById = async (id: string): Promise<SaleOrder> => {
  const response = await axiosInstance.get<SaleOrder>(API_SALE_ORDERS_GROUP.detail(id));
  return response.data;
};

export const getSaleOrderEditorCatalogs = async (
  companyId?: string,
): Promise<SaleOrderEditorCatalogsResponse> => {
  const response = await axiosInstance.get<SaleOrderEditorCatalogsResponse>(
    API_SALE_ORDERS_GROUP.editorCatalogs,
    { params: companyId ? { companyId } : undefined },
  );
  return response.data;
};

export const updateSaleOrder = async (id: string, payload: CreateSaleOrderCommandDto): Promise<CreateSaleOrderResponse> => {
  const response = await axiosInstance.patch<CreateSaleOrderResponse>(API_SALE_ORDERS_GROUP.update(id), payload);
  return response.data;
};

export const deleteSaleOrder = async (id: string): Promise<{ type?: string; message?: string }> => {
  const response = await axiosInstance.delete<{ type?: string; message?: string }>(API_SALE_ORDERS_GROUP.detail(id));
  return response.data;
};

export const saveSaleOrderWithClient = async (
  payload: SaveSaleOrderWithClientDto,
  files: SaveSaleOrderWithClientFiles = {},
  saleOrderId?: string | null,
): Promise<CreateSaleOrderResponse & { clientId: string }> => {
  const body = buildSaleOrderUnifiedRequest({ data: payload, ...files });
  const response = saleOrderId
    ? await axiosInstance.patch<
        CreateSaleOrderResponse & { clientId: string }
      >(API_SALE_ORDERS_GROUP.updateWithClient(saleOrderId), body)
    : await axiosInstance.post<
        CreateSaleOrderResponse & { clientId: string }
      >(API_SALE_ORDERS_GROUP.createWithClient, body);
  return response.data;
};

export const assignSaleOrderWorkflow = async (saleOrderId: string, workflowId: string) => {
  const response = await axiosInstance.post(API_SALE_ORDERS_GROUP.assignWorkflow(saleOrderId), { workflowId });
  return response.data;
};

export const getAvailableSaleOrderTransitions = async (
  saleOrderId: string,
): Promise<AvailableTransition[]> => {
  const response = await axiosInstance.get<AvailableTransition[]>(
    API_SALE_ORDERS_GROUP.availableTransitions(saleOrderId),
  );
  return response.data;
};

export const changeSaleOrderState = async (
  saleOrderId: string,
  transitionId: string,
  metadata: Record<string, unknown> = {},
): Promise<ChangeSaleOrderStateResponse> => {
  const response = await axiosInstance.post<ChangeSaleOrderStateResponse>(API_SALE_ORDERS_GROUP.changeState(saleOrderId), {
    transitionId,
    metadata,
  });
  return response.data;
};

export const bulkAssignSaleOrders = async (
  payload: BulkAssignSaleOrdersPayload,
): Promise<SaleOrderBulkActionResponse> => {
  const response = await axiosInstance.patch<SaleOrderBulkActionResponse>(
    API_SALE_ORDERS_GROUP.bulkAssignedBy,
    payload,
  );
  return response.data;
};

export const bulkChangeSaleOrderState = async (
  payload: BulkChangeSaleOrderStatePayload,
): Promise<SaleOrderBulkActionResponse> => {
  const response = await axiosInstance.post<SaleOrderBulkActionResponse>(
    API_SALE_ORDERS_GROUP.bulkChangeState,
    payload,
  );
  return response.data;
};

export const getSaleOrderWorkflowHistory = async (
  saleOrderId: string,
): Promise<SaleOrderWorkflowHistoryItem[]> => {
  const response = await axiosInstance.get<SaleOrderWorkflowHistoryItem[]>(
    API_SALE_ORDERS_GROUP.history(saleOrderId),
  );
  return response.data;
};

export const listSaleOrderPayments = async (saleOrderId: string): Promise<SaleOrderPayment[]> => {
  const response = await axiosInstance.get<SaleOrderPayment[]>(API_SALE_ORDERS_GROUP.payments(saleOrderId));
  return response.data;
};

export const createSaleOrderPayment = async (
  saleOrderId: string,
  payload: CreateSaleOrderPaymentDto,
): Promise<{ paymentId: string }> => {
  const response = await axiosInstance.post<{ paymentId: string }>(API_SALE_ORDERS_GROUP.payments(saleOrderId), payload);
  return response.data;
};

export const deleteSaleOrderPayment = async (saleOrderId: string, paymentId: string): Promise<{ deleted: true }> => {
  const response = await axiosInstance.delete<{ deleted: true }>(API_SALE_ORDERS_GROUP.paymentById(saleOrderId, paymentId));
  return response.data;
};

export const getSaleOrderSearchState = async (): Promise<SaleOrderSearchStateResponse> => {
  const response = await axiosInstance.get<SaleOrderSearchStateResponse>(API_SALE_ORDERS_GROUP.searchState);
  return response.data;
};

export const getSaleOrderExportColumns = async (): Promise<SaleOrderExportColumn[]> => {
  const response = await axiosInstance.get<SaleOrderExportColumn[]>(API_SALE_ORDERS_GROUP.exportColumns);
  return response.data;
};

export const getSaleOrderExportPresets = async (): Promise<SaleOrderExportPreset[]> => {
  const response = await axiosInstance.get<SaleOrderExportPreset[]>(API_SALE_ORDERS_GROUP.exportPresets);
  return response.data;
};

export const saveSaleOrderExportPreset = async (payload: {
  name: string;
  columns: SaleOrderExportColumn[];
  useDateRange?: boolean;
}): Promise<{ metricId: string }> => {
  const response = await axiosInstance.post(API_SALE_ORDERS_GROUP.exportPresets, payload);
  return response.data;
};

export const deleteSaleOrderExportPreset = async (metricId: string): Promise<boolean> => {
  const response = await axiosInstance.delete(API_SALE_ORDERS_GROUP.deleteExportPreset(metricId));
  return response.data;
};

export const exportSaleOrdersExcel = async (payload: {
  columns: SaleOrderExportColumn[];
  q?: string;
  filters?: Record<string, unknown>[];
  useDateRange?: boolean;
}): Promise<{ blob: Blob; filename: string }> => {
  const response = await axiosInstance.post(API_SALE_ORDERS_GROUP.exportExcel, payload, {
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? `pedidos-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { blob: response.data as Blob, filename };
};

export const getSaleOrderStatistics = async (
  params: SaleOrderStatisticsParams,
): Promise<SaleOrderStatisticsResponse> => {
  const q = params.q?.trim() || undefined;
  const filters = params.filters?.length
    ? JSON.stringify(params.filters)
    : undefined;
  const response = await axiosInstance.get<SaleOrderStatisticsResponse>(
    API_SALE_ORDERS_GROUP.statistics,
    {
      params: {
        q,
        filters,
        includeCancelled: params.includeCancelled ?? false,
      },
    },
  );
  return response.data;
};

export const saveSaleOrderSearchMetric = async (
  name: string,
  snapshot: SaleOrderSearchSnapshot,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_SALE_ORDERS_GROUP.saveSearchMetric, { name, snapshot });
  return response.data;
};

export const deleteSaleOrderSearchMetric = async (metricId: string): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(API_SALE_ORDERS_GROUP.deleteSearchMetric(metricId));
  return response.data;
};
export const getSaleOrderPdf = async (id: string): Promise<Blob> => {
  const response = await axiosInstance.get(API_SALE_ORDERS_GROUP.saleOrderPdf(id), {
    responseType: "blob",
  });
  return response.data;
};
