import axiosInstance from "@/shared/common/utils/axios";
import { API_INCOME_GROUP } from "@/shared/services/APIs";
import type {
  IncomeEvidenceSummary,
  IncomeListQuery,
  IncomeListResponse,
  IncomeSearchSnapshot,
  IncomeSearchStateResponse,
  IncomeSummary,
} from "@/features/income/types/income.types";

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

export const getIncomeSearchState = async (): Promise<IncomeSearchStateResponse> => {
  const response = await axiosInstance.get<IncomeSearchStateResponse>(API_INCOME_GROUP.searchState);
  return response.data;
};

export const saveIncomeSearchMetric = async (
  name: string,
  snapshot: IncomeSearchSnapshot,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_INCOME_GROUP.saveSearchMetric, { name, snapshot });
  return response.data;
};

export const deleteIncomeSearchMetric = async (
  metricId: string,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(API_INCOME_GROUP.deleteSearchMetric(metricId));
  return response.data;
};

export const getIncomeEvidence = async (incomeId: string): Promise<IncomeEvidenceSummary & { incomeId: string; saleOrderId: string; saleOrderPaymentId: string }> => {
  const response = await axiosInstance.get(API_INCOME_GROUP.evidence(incomeId));
  return response.data;
};

/**
 * Evidence is private and requires the authenticated axios client. Returning
 * a blob URL avoids a direct browser request to the API, which is rejected by
 * the browser's cross-origin resource policy in production.
 */
export const getIncomeEvidenceContent = async (incomeId: string): Promise<string> => {
  const response = await axiosInstance.get<Blob>(API_INCOME_GROUP.evidenceContent(incomeId), {
    responseType: "blob",
  });
  return URL.createObjectURL(response.data);
};

export const uploadIncomeEvidence = async (incomeId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosInstance.post(API_INCOME_GROUP.evidence(incomeId), formData);
  return response.data;
};
