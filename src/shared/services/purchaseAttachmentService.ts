import axiosInstance from "@/shared/common/utils/axios";
import { API_PURCHASE_ATTACHMENTS_GROUP } from "@/shared/services/APIs";
import type {
  PurchaseAttachment,
  PurchaseAttachmentType,
  UploadPurchaseAttachmentPayload,
} from "@/features/purchases/types/purchase-attachment.types";

export const listPurchaseAttachments = async (params: {
  purchaseId?: string;
  paymentId?: string;
  receptionId?: string;
  type?: PurchaseAttachmentType;
}): Promise<PurchaseAttachment[]> => {
  const response = await axiosInstance.get<PurchaseAttachment[]>(API_PURCHASE_ATTACHMENTS_GROUP.list, { params });
  return response.data;
};

export const uploadPurchaseAttachment = async (
  payload: UploadPurchaseAttachmentPayload,
): Promise<{ type: string; message: string; attachment?: PurchaseAttachment }> => {
  const formData = new FormData();
  formData.append("purchaseId", payload.purchaseId);
  formData.append("type", payload.type);
  formData.append("file", payload.file);
  if (payload.paymentId) formData.append("paymentId", payload.paymentId);
  if (payload.receptionId) formData.append("receptionId", payload.receptionId);
  if (payload.note) formData.append("note", payload.note);

  const response = await axiosInstance.post(API_PURCHASE_ATTACHMENTS_GROUP.create, formData);
  return response.data;
};

export const deletePurchaseAttachment = async (
  attachmentId: string,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(API_PURCHASE_ATTACHMENTS_GROUP.remove(attachmentId));
  return response.data;
};

