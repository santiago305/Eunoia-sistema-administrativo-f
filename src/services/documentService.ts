import type { CreateOutOrder, OutOrderResponse } from "@/pages/out-orders/type/outOrder";
import { API_DOCUMENT_INVENTORY_GROUP } from "./APIs";
import axiosInstance from "@/common/utils/axios";
import type { AdjustmentResponse, CreateAdjustment } from "@/pages/catalog/types/adjustment";
import type { DocumentListResponse, GetDocuments } from "@/pages/catalog/types/documentInventory";


export const createOutOrder = async (payload: CreateOutOrder): Promise<OutOrderResponse> => {
  const response = await axiosInstance.post(API_DOCUMENT_INVENTORY_GROUP.outOrderCreated, payload);
  return response.data;
};

export const createAdjustment = async (payload: CreateAdjustment): Promise<AdjustmentResponse> => {
  const response = await axiosInstance.post(API_DOCUMENT_INVENTORY_GROUP.adjustmentCreated, payload);
  return response.data;
};

export const createTransfer = async (payload: CreateAdjustment): Promise<AdjustmentResponse> => {
  const response = await axiosInstance.post(API_DOCUMENT_INVENTORY_GROUP.transfertCreated, payload);
  return response.data;
};

export const getDocuments = async (payload: GetDocuments): Promise<DocumentListResponse> => {
  const response = await axiosInstance.get(API_DOCUMENT_INVENTORY_GROUP.listDocuments, { params: payload });
  return response.data;
};
