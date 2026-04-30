import axiosInstance from "@/shared/common/utils/axios";

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
  formData.append("file", file);
  const response = await axiosInstance.patch(`/purchases/orders/${poId}/image-prodution`, formData);
  return response.data;
};
