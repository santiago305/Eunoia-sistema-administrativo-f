import axiosInstance from "@/shared/common/utils/axios";
import { API_SALE_ORDERS_GROUP } from "@/shared/services/APIs";
import type {
  CreateSaleOrderCommandDto,
  CreateSaleOrderResponse,
  SaleOrder,
  SaleOrderExportColumn,
  SaleOrderExportPreset,
  SaleOrderEditorCatalogsResponse,
  SaleOrderImportLote,
  SaleOrderImportLoteAudit,
  SaleOrderAudit,
  SaleOrderSkuAttribute,
  SaleOrderSkuSnapshot,
  SaleOrderSkuUnit,
  SaleOrderJsonImportPreviewResponse,
  SaleOrderJsonImportRow,
  SaleOrderListResponse,
  SaleOrderPayment,
  SaleOrderPackMatchComponentInput,
  SaleOrderPackMatchResponse,
  SaleOrderSearchSnapshot,
  SaleOrderSearchStateResponse,
  SaleOrderStatisticsParams,
  SaleOrderStatisticsResponse,
  SaveSaleOrderWithClientDto,
  SaveSaleOrderWithClientFiles,
  SaleOrderSkuRecognitionCode,
  SaleOrderSkuRecognitionCodesResponse,
  SaveSaleOrderSkuRecognitionCodeInput,
  SaleOrderAdviserImportAlias,
  SaleOrderAdviserImportAliasesResponse,
  SaleOrderImportAdviserResolution,
  SaveSaleOrderAdviserImportAliasInput,
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

export type CorrectSaleOrderTotalResponse = {
  saleOrderId: string;
  previousTotal: number;
  total: number;
  totalPaid: number;
  pendingAmount: number;
  paymentStatus: "PAID" | "PENDING";
  previousState: { id: string; code: string; name: string };
  currentState: { id: string; code: string; name: string };
  stateChanged: boolean;
  stockRestoredAndReserved: boolean;
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
    mode?: "state" | "global_action";
    targetStateId?: string;
    transitionId?: string;
    globalActionName?: string;
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

export type BulkExecuteSaleOrderWorkflowPayload =
  | {
      saleOrderIds: string[];
      mode: "state";
      targetStateId: string;
    }
  | {
      saleOrderIds: string[];
      mode: "global_action";
      globalActionName: string;
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
    | "GLOBAL_ACTION_NOT_AVAILABLE"
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

export const createSaleOrder = async (
  payload: CreateSaleOrderCommandDto,
): Promise<CreateSaleOrderResponse> => {
  const response = await axiosInstance.post<CreateSaleOrderResponse>(
    API_SALE_ORDERS_GROUP.create,
    payload,
  );
  return response.data;
};

export const matchSaleOrderProductPack = async (
  components: SaleOrderPackMatchComponentInput[],
): Promise<SaleOrderPackMatchResponse> => {
  const response = await axiosInstance.post<SaleOrderPackMatchResponse>(
    API_SALE_ORDERS_GROUP.matchProductPack,
    { components },
  );
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

export const listSaleOrderSkuRecognitionCodes = async (params: {
  page: number;
  limit?: number;
  q?: string;
}): Promise<SaleOrderSkuRecognitionCodesResponse> => {
  const response = await axiosInstance.get<SaleOrderSkuRecognitionCodesResponse>(
    API_SALE_ORDERS_GROUP.skuRecognitionCodes,
    { params },
  );
  return response.data;
};

export const createSaleOrderSkuRecognitionCode = async (
  input: SaveSaleOrderSkuRecognitionCodeInput,
): Promise<SaleOrderSkuRecognitionCode> => {
  const response = await axiosInstance.post<SaleOrderSkuRecognitionCode>(
    API_SALE_ORDERS_GROUP.skuRecognitionCodes,
    input,
  );
  return response.data;
};

export const updateSaleOrderSkuRecognitionCode = async (
  id: string,
  input: SaveSaleOrderSkuRecognitionCodeInput,
): Promise<SaleOrderSkuRecognitionCode> => {
  const response = await axiosInstance.patch<SaleOrderSkuRecognitionCode>(
    API_SALE_ORDERS_GROUP.skuRecognitionCode(id),
    input,
  );
  return response.data;
};

export const deleteSaleOrderSkuRecognitionCode = async (id: string) => {
  const response = await axiosInstance.delete<{ id: string; deleted: true }>(
    API_SALE_ORDERS_GROUP.skuRecognitionCode(id),
  );
  return response.data;
};

export const listSaleOrderImportLotes = async (): Promise<
  SaleOrderImportLote[]
> => {
  const response = await axiosInstance.get<SaleOrderImportLote[]>(
    API_SALE_ORDERS_GROUP.importLotes,
  );
  return response.data;
};

export const setSaleOrderImportLoteActive = async (
  id: string,
  isActive: boolean,
): Promise<SaleOrderImportLote> => {
  const response = await axiosInstance.patch<SaleOrderImportLote>(
    API_SALE_ORDERS_GROUP.importLoteActive(id),
    { isActive },
  );
  return response.data;
};

export const listSaleOrderImportLoteAudit = async (
  id: string,
): Promise<SaleOrderImportLoteAudit[]> => {
  const response = await axiosInstance.get<SaleOrderImportLoteAudit[]>(
    API_SALE_ORDERS_GROUP.importLoteAudit(id),
  );
  return response.data;
};

export const setSaleOrderActive = async (
  id: string,
  isActive: boolean,
): Promise<SaleOrderBulkActionResponse> => {
  const response = await axiosInstance.patch<SaleOrderBulkActionResponse>(
    API_SALE_ORDERS_GROUP.active(id),
    { isActive },
  );
  return response.data;
};

export const bulkSetSaleOrdersActive = async (payload: {
  saleOrderIds: string[];
  isActive: boolean;
}): Promise<SaleOrderBulkActionResponse> => {
  const response = await axiosInstance.patch<SaleOrderBulkActionResponse>(
    API_SALE_ORDERS_GROUP.bulkActive,
    payload,
  );
  return response.data;
};

export const listSaleOrderAudit = async (
  id: string,
): Promise<SaleOrderAudit[]> => {
  const response = await axiosInstance.get<SaleOrderAudit[]>(
    API_SALE_ORDERS_GROUP.audit(id),
  );
  return response.data;
};

export const listSaleOrders = async (params: {
  q?: string;
  page?: number;
  limit?: number;
  filters?: unknown[] | string;
  isActive?: boolean;
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

  const response = await axiosInstance.get<SaleOrderListResponse>(
    API_SALE_ORDERS_GROUP.list,
    { params: requestParams },
  );
  return response.data;
};

export const fetchSaleOrders = listSaleOrders;

export const fetchSaleOrderById = async (id: string): Promise<SaleOrder> => {
  const response = await axiosInstance.get<SaleOrder>(
    API_SALE_ORDERS_GROUP.detail(id),
  );
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

export const updateSaleOrder = async (
  id: string,
  payload: CreateSaleOrderCommandDto,
): Promise<CreateSaleOrderResponse> => {
  const response = await axiosInstance.patch<CreateSaleOrderResponse>(
    API_SALE_ORDERS_GROUP.update(id),
    payload,
  );
  return response.data;
};

export const deleteSaleOrder = async (
  id: string,
): Promise<{ type?: string; message?: string }> => {
  const response = await axiosInstance.delete<{
    type?: string;
    message?: string;
  }>(API_SALE_ORDERS_GROUP.detail(id));
  return response.data;
};

export const saveSaleOrderWithClient = async (
  payload: SaveSaleOrderWithClientDto,
  files: SaveSaleOrderWithClientFiles = {},
  saleOrderId?: string | null,
): Promise<CreateSaleOrderResponse & { clientId: string }> => {
  const body = buildSaleOrderUnifiedRequest({ data: payload, ...files });
  const response = saleOrderId
    ? await axiosInstance.patch<CreateSaleOrderResponse & { clientId: string }>(
        API_SALE_ORDERS_GROUP.updateWithClient(saleOrderId),
        body,
      )
    : await axiosInstance.post<CreateSaleOrderResponse & { clientId: string }>(
        API_SALE_ORDERS_GROUP.createWithClient,
        body,
      );
  return response.data;
};

export const listSaleOrderAdviserImportAliases = async (params: {
  page: number;
  limit?: number;
  q?: string;
  adviserUserId?: string;
}): Promise<SaleOrderAdviserImportAliasesResponse> => {
  const response = await axiosInstance.get<SaleOrderAdviserImportAliasesResponse>(
    API_SALE_ORDERS_GROUP.adviserImportAliases,
    { params },
  );
  return response.data;
};

export const createSaleOrderAdviserImportAlias = async (
  input: SaveSaleOrderAdviserImportAliasInput,
): Promise<SaleOrderAdviserImportAlias> => {
  const response = await axiosInstance.post<SaleOrderAdviserImportAlias>(
    API_SALE_ORDERS_GROUP.adviserImportAliases,
    input,
  );
  return response.data;
};

export const updateSaleOrderAdviserImportAlias = async (
  id: string,
  input: SaveSaleOrderAdviserImportAliasInput,
): Promise<SaleOrderAdviserImportAlias> => {
  const response = await axiosInstance.patch<SaleOrderAdviserImportAlias>(
    API_SALE_ORDERS_GROUP.adviserImportAlias(id),
    input,
  );
  return response.data;
};

export const deleteSaleOrderAdviserImportAlias = async (id: string) => {
  const response = await axiosInstance.delete<{ id: string; deleted: true }>(
    API_SALE_ORDERS_GROUP.adviserImportAlias(id),
  );
  return response.data;
};

export const resolveSaleOrderImportAdvisers = async (
  values: string[],
): Promise<SaleOrderImportAdviserResolution[]> => {
  const response = await axiosInstance.post<SaleOrderImportAdviserResolution[]>(
    API_SALE_ORDERS_GROUP.resolveImportAdvisers,
    { values },
  );
  return response.data;
};

export const correctSaleOrderTotal = async (
  saleOrderId: string,
  total: number,
): Promise<CorrectSaleOrderTotalResponse> => {
  const response = await axiosInstance.patch<CorrectSaleOrderTotalResponse>(
    API_SALE_ORDERS_GROUP.correctTotal(saleOrderId),
    { total },
  );
  return response.data;
};

export const assignSaleOrderWorkflow = async (
  saleOrderId: string,
  workflowId: string,
) => {
  const response = await axiosInstance.post(
    API_SALE_ORDERS_GROUP.assignWorkflow(saleOrderId),
    { workflowId },
  );
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
  const response = await axiosInstance.post<ChangeSaleOrderStateResponse>(
    API_SALE_ORDERS_GROUP.changeState(saleOrderId),
    {
      transitionId,
      metadata,
    },
  );
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

export const bulkExecuteSaleOrderWorkflow = async (
  payload: BulkExecuteSaleOrderWorkflowPayload,
): Promise<SaleOrderBulkActionResponse> => {
  const response = await axiosInstance.post<SaleOrderBulkActionResponse>(
    API_SALE_ORDERS_GROUP.bulkExecuteWorkflow,
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

export const listSaleOrderPayments = async (
  saleOrderId: string,
): Promise<SaleOrderPayment[]> => {
  const response = await axiosInstance.get<SaleOrderPayment[]>(
    API_SALE_ORDERS_GROUP.payments(saleOrderId),
  );
  return response.data;
};

export const createSaleOrderPayment = async (
  saleOrderId: string,
  payload: CreateSaleOrderPaymentDto,
): Promise<{ paymentId: string }> => {
  const response = await axiosInstance.post<{ paymentId: string }>(
    API_SALE_ORDERS_GROUP.payments(saleOrderId),
    payload,
  );
  return response.data;
};

export const deleteSaleOrderPayment = async (
  saleOrderId: string,
  paymentId: string,
): Promise<{ deleted: true }> => {
  const response = await axiosInstance.delete<{ deleted: true }>(
    API_SALE_ORDERS_GROUP.paymentById(saleOrderId, paymentId),
  );
  return response.data;
};

export const getSaleOrderSearchState =
  async (): Promise<SaleOrderSearchStateResponse> => {
    const response = await axiosInstance.get<SaleOrderSearchStateResponse>(
      API_SALE_ORDERS_GROUP.searchState,
    );
    return response.data;
  };

export const getSaleOrderExportColumns = async (): Promise<
  SaleOrderExportColumn[]
> => {
  const response = await axiosInstance.get<SaleOrderExportColumn[]>(
    API_SALE_ORDERS_GROUP.exportColumns,
  );
  return response.data;
};

export const getSaleOrderExportPresets = async (): Promise<
  SaleOrderExportPreset[]
> => {
  const response = await axiosInstance.get<SaleOrderExportPreset[]>(
    API_SALE_ORDERS_GROUP.exportPresets,
  );
  return response.data;
};

export const saveSaleOrderExportPreset = async (payload: {
  name: string;
  columns: SaleOrderExportColumn[];
  useDateRange?: boolean;
}): Promise<{ metricId: string }> => {
  const response = await axiosInstance.post(
    API_SALE_ORDERS_GROUP.exportPresets,
    payload,
  );
  return response.data;
};

export const deleteSaleOrderExportPreset = async (
  metricId: string,
): Promise<boolean> => {
  const response = await axiosInstance.delete(
    API_SALE_ORDERS_GROUP.deleteExportPreset(metricId),
  );
  return response.data;
};

export const exportSaleOrdersExcel = async (payload: {
  columns: SaleOrderExportColumn[];
  q?: string;
  filters?: Record<string, unknown>[];
  useDateRange?: boolean;
}): Promise<{ blob: Blob; filename: string }> => {
  const response = await axiosInstance.post(
    API_SALE_ORDERS_GROUP.exportExcel,
    payload,
    {
      responseType: "blob",
    },
  );
  const disposition = response.headers["content-disposition"] as
    | string
    | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  const filename =
    match?.[1] ?? `pedidos-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
        isActive: params.isActive ?? true,
      },
    },
  );
  return response.data;
};

export const saveSaleOrderSearchMetric = async (
  name: string,
  snapshot: SaleOrderSearchSnapshot,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(
    API_SALE_ORDERS_GROUP.saveSearchMetric,
    { name, snapshot },
  );
  return response.data;
};

export const deleteSaleOrderSearchMetric = async (
  metricId: string,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(
    API_SALE_ORDERS_GROUP.deleteSearchMetric(metricId),
  );
  return response.data;
};
export const getSaleOrderPdf = async (id: string): Promise<Blob> => {
  const response = await axiosInstance.get(
    API_SALE_ORDERS_GROUP.saleOrderPdf(id),
    {
      responseType: "blob",
    },
  );
  return response.data;
};
