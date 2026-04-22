import type { CreateOutOrder, OutOrderResponse } from "@/pages/out-orders/type/outOrder";
import { API_DOCUMENT_INVENTORY_GROUP } from "./APIs";
import axiosInstance from "@/common/utils/axios";
import type { AdjustmentResponse, CreateAdjustment } from "@/pages/catalog/types/adjustment";
import type { GetInventoryDocumentsParams, InventoryDocumentListResponse, skuStock } from "@/pages/catalog/types/documentInventory";
import { CreateTransfer } from "@/pages/catalog/types/transfer";



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
