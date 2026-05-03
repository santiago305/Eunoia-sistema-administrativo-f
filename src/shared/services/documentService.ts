import type { CreateOutOrder, OutOrderResponse } from "@/features/out-orders/type/outOrder";
import { API_DOCUMENT_INVENTORY_GROUP } from "./APIs";
import axiosInstance from "@/shared/common/utils/axios";
import type { AdjustmentResponse, CreateAdjustment } from "@/features/catalog/types/adjustment";
import type { GetInventoryDocumentsParams, InventoryDocumentListResponse, skuStock } from "@/features/catalog/types/documentInventory";
import { CreateTransfer } from "@/features/catalog/types/transfer";
import type {
  InventoryDocumentsSearchSnapshot,
  InventoryDocumentsSearchStateResponse,
} from "@/features/catalog/types/inventoryDocumentsSearch";
import type { DocType } from "@/features/warehouse/types/warehouse";
import type { InventoryDocumentProductType } from "@/features/catalog/types/documentInventory";



const serializeInventoryDocumentsParam = (value: string | Date) =>
  typeof value === "string" ? value : value.toISOString();

export const getDocuments = async (
  params: GetInventoryDocumentsParams,
): Promise<InventoryDocumentListResponse> => {
  const unique = (values: Array<string | undefined> | undefined) =>
    Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

  const mergeList = (value?: string[] | string) => {
    if (!value) return [];
    if (Array.isArray(value)) return unique(value);
    return unique(value.split(","));
  };

  const warehouseIdsIn = unique([
    ...mergeList((params as any).warehouseIdsIn),
    ...mergeList(params.warehouseIds),
    ...(params.warehouseId ? [params.warehouseId] : []),
  ]);

  const warehouseIdsNotIn = mergeList((params as any).warehouseIdsNotIn);

  const createdByIdsIn = unique([
    ...mergeList((params as any).createdByIdsIn),
    ...(params.createdById ? [params.createdById] : []),
  ]);

  const createdByIdsNotIn = mergeList((params as any).createdByIdsNotIn);

  const requestParams: Record<string, unknown> = {
    ...params,
    from: params.from ? serializeInventoryDocumentsParam(params.from) : undefined,
    to: params.to ? serializeInventoryDocumentsParam(params.to) : undefined,
    warehouseIds:
      params.warehouseIds && params.warehouseIds.length > 0
        ? params.warehouseIds.join(",")
        : undefined,
    warehouseIdsIn: warehouseIdsIn.length ? warehouseIdsIn.join(",") : undefined,
    warehouseIdsNotIn: warehouseIdsNotIn.length ? warehouseIdsNotIn.join(",") : undefined,
    createdByIdsIn: createdByIdsIn.length ? createdByIdsIn.join(",") : undefined,
    createdByIdsNotIn: createdByIdsNotIn.length ? createdByIdsNotIn.join(",") : undefined,
    q: params.q?.trim() || undefined,
  };

  const response = await axiosInstance.get(API_DOCUMENT_INVENTORY_GROUP.listDocuments, {
    params: requestParams,
  });
  return response.data;
};

export const getInventoryDocumentsSearchState = async (params: {
  docType: DocType;
  productType?: InventoryDocumentProductType;
}): Promise<InventoryDocumentsSearchStateResponse> => {
  const response = await axiosInstance.get(API_DOCUMENT_INVENTORY_GROUP.searchState, {
    params,
  });
  return response.data;
};

export const saveInventoryDocumentsSearchMetric = async (payload: {
  name: string;
  docType: DocType;
  productType?: InventoryDocumentProductType;
  snapshot: InventoryDocumentsSearchSnapshot;
}): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_DOCUMENT_INVENTORY_GROUP.saveSearchMetric, payload);
  return response.data;
};

export const deleteInventoryDocumentsSearchMetric = async (params: {
  metricId: string;
  docType: DocType;
  productType?: InventoryDocumentProductType;
}): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(API_DOCUMENT_INVENTORY_GROUP.deleteSearchMetric(params.metricId), {
    params: {
      docType: params.docType,
      ...(params.productType ? { productType: params.productType } : {}),
    },
  });
  return response.data;
};


export const getStockSku = async (
  params: {
    warehouseId:string;
    skuId:string;
    locationId?: string;
  }
): Promise<skuStock> => {
  const response = await axiosInstance.get(API_DOCUMENT_INVENTORY_GROUP.getStock, {
    params
  });
  return response.data;
};

export const createOutOrder = async (payload: CreateOutOrder): Promise<OutOrderResponse> => {
  const response = await axiosInstance.post(API_DOCUMENT_INVENTORY_GROUP.outOrderCreated, payload);
  return response.data;
};

export const createAdjustment = async (payload: CreateAdjustment): Promise<AdjustmentResponse> => {
  const response = await axiosInstance.post(API_DOCUMENT_INVENTORY_GROUP.adjustmentCreated, payload);
  return response.data;
};

export const createTransfer = async (payload: CreateTransfer): Promise<AdjustmentResponse> => {
  const response = await axiosInstance.post(API_DOCUMENT_INVENTORY_GROUP.transfertCreated, payload);
  return response.data;
};

export const getInventoryDocumentsExportColumns = async (params: {
  docType: DocType;
  productType?: InventoryDocumentProductType;
}): Promise<Array<{ key: string; label: string }>> => {
  const response = await axiosInstance.get(API_DOCUMENT_INVENTORY_GROUP.exportColumns, { params });
  return response.data;
};

export const exportInventoryDocumentsExcel = async (payload: GetInventoryDocumentsParams & {
  columns: Array<{ key: string; label: string }>;
}): Promise<{ blob: Blob; filename: string }> => {
  const response = await axiosInstance.post(API_DOCUMENT_INVENTORY_GROUP.exportExcel, payload, {
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? `transferencias-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { blob: response.data as Blob, filename };
};

export const getInventoryDocumentsExportPresets = async (params: {
  docType: DocType;
  productType?: InventoryDocumentProductType;
}): Promise<Array<{ metricId: string; name: string; snapshot: any }>> => {
  const response = await axiosInstance.get(API_DOCUMENT_INVENTORY_GROUP.exportPresets, { params });
  return response.data;
};

export const saveInventoryDocumentsExportPreset = async (payload: {
  name: string;
  docType: DocType;
  productType?: InventoryDocumentProductType;
  columns: Array<{ key: string; label: string }>;
  useDateRange?: boolean;
}) => {
  const response = await axiosInstance.post(API_DOCUMENT_INVENTORY_GROUP.exportPresets, payload);
  return response.data;
};

export const deleteInventoryDocumentsExportPreset = async (params: {
  metricId: string;
  docType: DocType;
  productType?: InventoryDocumentProductType;
}) => {
  const response = await axiosInstance.delete(API_DOCUMENT_INVENTORY_GROUP.deleteExportPreset(params.metricId), {
    params: {
      docType: params.docType,
      ...(params.productType ? { productType: params.productType } : {}),
    },
  });
  return response.data;
};

export const processInventoryDocument = async (docId: string): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_DOCUMENT_INVENTORY_GROUP.processDocument(docId));
  return response.data;
};
