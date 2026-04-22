import axiosInstance from "@/common/utils/axios";
import { API_KARDEX_GROUP } from "@/services/APIs";
import type {
  InventoryLedgerListItem,
  KardexDailyTotal,
  KardexListQuery,
  KardexTotalsQuery,
} from "@/pages/catalog/types/kardex";
import type {
} from "@/pages/catalog/types/inventory";

export const getInventoryLedgerBySku = async (
  params: KardexListQuery,
): Promise<InventoryLedgerListItem[]> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.list, { params });
  return response.data;
};

export const getDailyTotals = async (params: KardexTotalsQuery): Promise<KardexDailyTotal[]> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.totals, { params });
  return response.data;
};
