import axiosInstance from "@/common/utils/axios";
import { API_UNITS_GROUP } from "@/services/APIs";
import type { ListUnitResponse } from "@/pages/catalog/types/unit";

export const listUnits = async (params?: { q?: string }): Promise<ListUnitResponse> => {
  const response = await axiosInstance.get(API_UNITS_GROUP.list, { params });
  return response.data;
};

