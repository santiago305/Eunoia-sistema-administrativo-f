import axiosInstance from "@/common/utils/axios";
import { API_PDF_GENERATED_GROUP } from "@/services/APIs";

export type GenerateInvoicePdfPayload = Record<string, unknown>;

export const generateInvoicePdf = async (payload: GenerateInvoicePdfPayload): Promise<Blob> => {
  const response = await axiosInstance.post<Blob>(API_PDF_GENERATED_GROUP.invoice, payload, {
    responseType: "blob",
  });
  return response.data;
};

export const getPurchaseOrderPdf = async (id: string): Promise<Blob> => {
  const requestUrl = API_PDF_GENERATED_GROUP.purchaseOrderPdf(id);

  try {
    const response = await axiosInstance.get<Blob>(requestUrl, {
      responseType: "blob",
    });
    return response.data;
  } catch (error: any) {
    let responseData = error?.response?.data;

    if (responseData instanceof Blob) {
      try {
        const text = await responseData.text();
        responseData = text;
      } catch {
        responseData = "[blob unreadable]";
      }
    }

    console.error("[getPurchaseOrderPdf] request failed", {
      purchaseOrderId: id,
      requestUrl,
      status: error?.response?.status ?? null,
      statusText: error?.response?.statusText ?? null,
      data: responseData ?? null,
    });

    throw error;
  }
};
export const getProductionOrderPdf = async (id: string): Promise<Blob> => {
  const response = await axiosInstance.get<Blob>(API_PDF_GENERATED_GROUP.productionOrderPdf(id), {
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

