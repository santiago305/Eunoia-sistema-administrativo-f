import axiosInstance from "@/shared/common/utils/axios";
import { API_INCOME_GROUP } from "@/shared/services/APIs";
import type { IncomeListQuery, IncomeListResponse, IncomeSummary } from "@/features/income/types/income.types";

export const listIncome = async (query: IncomeListQuery = {}): Promise<IncomeListResponse> => {
  const response = await axiosInstance.get<IncomeListResponse>(API_INCOME_GROUP.list, { params: query });
  return response.data;
};

export const getIncomeSummary = async (query: IncomeListQuery = {}): Promise<IncomeSummary> => {
  const response = await axiosInstance.get<IncomeSummary>(API_INCOME_GROUP.summary, { params: query });
  return response.data;
};
