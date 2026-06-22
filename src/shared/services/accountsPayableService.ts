import axiosInstance from "@/shared/common/utils/axios";
import { API_ACCOUNTS_PAYABLE_GROUP } from "@/shared/services/APIs";
import type {
  ListAccountPayablesQuery,
  ListAccountPayablesResponse,
} from "@/features/payments/types/payable.types";

export const listAccountPayables = async (
  query: ListAccountPayablesQuery = {},
): Promise<ListAccountPayablesResponse> => {
  const response = await axiosInstance.get<ListAccountPayablesResponse>(
    API_ACCOUNTS_PAYABLE_GROUP.list,
    { params: query },
  );
  return response.data;
};

export const markOverdueAccountPayables = async (): Promise<{ updated: number }> => {
  const response = await axiosInstance.post(API_ACCOUNTS_PAYABLE_GROUP.markOverdue);
  return response.data;
};

