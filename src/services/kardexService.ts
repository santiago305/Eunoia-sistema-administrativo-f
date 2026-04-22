import axiosInstance from "@/common/utils/axios";
import { API_KARDEX_GROUP } from "@/services/APIs";
import type {
  InventoryLedgerListItem,
  KardexDailyTotal,
  KardexListQuery,
  KardexTotalsQuery,
} from "@/pages/catalog/types/kardex";
import type {
  DemandSummaryOutput,
  DemandSummaryQuery,
  MonthlyProjectionOutput,
  SalesDailyTotal,
  SalesMonthlyTotal,
  SalesTotalsQuery,
  SalesWeekdayTotal,
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

export const getDailySalesTotals = async (params: SalesTotalsQuery): Promise<SalesDailyTotal[]> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.totalsDailySales, { params });
  return response.data;
};

export const getSalesWeekdayTotals = async (params: SalesTotalsQuery): Promise<SalesWeekdayTotal[]> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.totalsWeekday, { params });
  return response.data;
};

export const getSalesMonthlyTotals = async (params: SalesTotalsQuery): Promise<SalesMonthlyTotal[]> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.totalsMonthly, { params });
  return response.data;
};

export const getDemandSummary = async (params: DemandSummaryQuery): Promise<DemandSummaryOutput> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.demand, { params });
  return response.data;
};

export const getMonthlyProjection = async (
  params: SalesTotalsQuery & { months?: number },
): Promise<MonthlyProjectionOutput> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.monthlyProjection, { params });
  return response.data;
};
