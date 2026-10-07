import axiosInstance from "@/shared/common/utils/axios";
import { API_INCOME_GROUP } from "@/shared/services/APIs";
import { env } from "@/env";
import type { IncomeEvidenceSummary, IncomeListQuery, IncomeListResponse, IncomeSummary } from "@/features/income/types/income.types";

const serializeQuery = (query: IncomeListQuery = {}) => ({
  ...query,
  filters: query.filters?.length ? JSON.stringify(query.filters) : undefined,
});

export const listIncome = async (query: IncomeListQuery = {}): Promise<IncomeListResponse> => {
  const response = await axiosInstance.get<IncomeListResponse>(API_INCOME_GROUP.list, { params: serializeQuery(query) });
  return response.data;
};

export const getIncomeSummary = async (query: IncomeListQuery = {}): Promise<IncomeSummary> => {
  const response = await axiosInstance.get<IncomeSummary>(API_INCOME_GROUP.summary, { params: serializeQuery(query) });
  return response.data;
};

export const getIncomeEvidence = async (incomeId: string): Promise<IncomeEvidenceSummary & { incomeId: string; saleOrderId: string; saleOrderPaymentId: string }> => {
  const response = await axiosInstance.get(API_INCOME_GROUP.evidence(incomeId));
  return response.data?.url ? { ...response.data, url: `${env.apiBaseUrl}${API_INCOME_GROUP.evidenceContent(incomeId)}` } : response.data;
};

export const uploadIncomeEvidence = async (incomeId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosInstance.post(API_INCOME_GROUP.evidence(incomeId), formData);
  return response.data;
};
