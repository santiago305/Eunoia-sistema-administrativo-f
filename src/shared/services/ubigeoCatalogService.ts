import axiosInstance from "@/shared/common/utils/axios";
import { API_UBIGEO_GROUP } from "./APIs";

type SuccessResponse<T> = { type: string; message: string; data: T };

export type UbigeoCatalog = {
  departments: { id: string; name: string }[];
  provinces: { id: string; name: string; departmentId: string }[];
  districts: { id: string; name: string; provinceId: string; departmentId: string }[];
};

let cachedCatalog: UbigeoCatalog | null = null;

export const getUbigeoCatalog = async (): Promise<UbigeoCatalog> => {
  if (cachedCatalog) return cachedCatalog;
  const response = await axiosInstance.get<SuccessResponse<UbigeoCatalog>>(API_UBIGEO_GROUP.ubigueo);
  cachedCatalog = response.data.data;
  return cachedCatalog;
};

