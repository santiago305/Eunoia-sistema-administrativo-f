import axiosInstance from "@/shared/common/utils/axios";
import { API_PURCHASE_ATTACHMENTS_GROUP } from "@/shared/services/APIs";
import { PurchaseAttachmentTypes } from "@/features/purchases/types/purchase-attachment.types";

export const addPurchaseExtraTime = async (
  poId: string,
  values: { days: number; hours: number; minutes: number },
): Promise<{ type: string; message: string; expectedAt?: string }> => {
  const response = await axiosInstance.patch(`/purchases/orders/${poId}/extra-time`, values);
  return response.data;
};

export const uploadPurchaseImageProdution = async (
  poId: string,
  file: File,
): Promise<{ type: string; message: string; imageProdution?: string[] }> => {
  const formData = new FormData();
  formData.append("purchaseId", poId);
  formData.append("type", PurchaseAttachmentTypes.PRODUCT_PHOTO);
  formData.append("file", file);
  formData.append("note", "Foto de compra registrada desde cierre de recepcion.");
  const response = await axiosInstance.post(API_PURCHASE_ATTACHMENTS_GROUP.create, formData);
  return {
    type: response.data?.type,
    message: response.data?.message,
    imageProdution: response.data?.attachment?.url ? [response.data.attachment.url] : [],
  };
};
