import axiosInstance from "@/shared/common/utils/axios";
import { API_PDF_GENERATED_GROUP } from "@/shared/services/APIs";

export type GenerateInvoicePdfPayload = Record<string, unknown>;

export const generateInvoicePdf = async (payload: GenerateInvoicePdfPayload): Promise<Blob> => {
  const response = await axiosInstance.post<Blob>(API_PDF_GENERATED_GROUP.invoice, payload, {
    responseType: "blob",
  });
  return response.data;
};

export const getPurchaseOrderPdf = async (id: string): Promise<Blob> => {
  const requestUrl = API_PDF_GENERATED_GROUP.purchaseOrderPdf(id);
  const response = await axiosInstance.get<Blob>(requestUrl, {
    responseType: "blob",
  });
  return response.data;
};
export const getProductionOrderPdf = async (id: string): Promise<Blob> => {
  const requestUrl = API_PDF_GENERATED_GROUP.productionOrderPdf(id);
  const response = await axiosInstance.get<Blob>(requestUrl, {
    responseType: "blob",
  });
  return response.data;
};
export const getDocumentInventoryPdf = async (id: string): Promise<Blob> => {
  const response = await axiosInstance.get<Blob>(API_PDF_GENERATED_GROUP.documentInventoryPdf(id), {
    responseType: "blob",
  });
  return response.data;
};

