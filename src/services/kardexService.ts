import axiosInstance from "@/common/utils/axios";
import { API_KARDEX_GROUP } from "@/services/APIs";
import type { KardexDailyTotal, KardexListQuery, KardexListResponse, KardexTotalsQuery } from "@/pages/catalog/types/kardex";

export const listKardex = async (params: KardexListQuery): Promise<KardexListResponse> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.list, { params });
  return response.data;
};

export const getDailyTotals = async (params: KardexTotalsQuery): Promise<KardexDailyTotal[]> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.totals, { params });
  return response.data;
};
