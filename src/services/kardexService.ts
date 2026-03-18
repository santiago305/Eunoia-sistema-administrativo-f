import axiosInstance from "@/common/utils/axios";
import { API_KARDEX_GROUP } from "@/services/APIs";
import type { KardexListQuery, KardexListResponse } from "@/pages/production/types/kardex";

export const listKardex = async (params: KardexListQuery): Promise<KardexListResponse> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.list, { params });
  return response.data;
};
