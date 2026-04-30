import axiosInstance from "@/shared/common/utils/axios";

export const addProductionExtraTime = async (
  productionId: string,
  values: { days: number; hours: number; minutes: number },
): Promise<{ type: string; message: string; manufactureDate?: string }> => {
  const response = await axiosInstance.patch(`/production-orders/${productionId}/extra-time`, values);
  return response.data;
};

export const uploadProductionImageProdution = async (
  productionId: string,
  file: File,
): Promise<{ type: string; message: string; imageProdution?: string[] }> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosInstance.patch(`/production-orders/${productionId}/image-prodution`, formData);
  return response.data;
};
