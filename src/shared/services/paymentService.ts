import axiosInstance from "@/shared/common/utils/axios";
import { API_PAYMENT_GROUP } from "@/shared/services/APIs";
import type {
  Payment,
} from "@/features/purchases/types/purchase";

export type ListPaymentsQuery = {
  poId?: string;
  quotaId?: string;
  page?: number;
  limit?: number;
};

export type ListPaymentsResponse = {
  items: Payment[];
  total: number;
  page: number;
  limit: number;
};

export const createPayment = async (
  payload: Payment
): Promise<{type:string, message:string}> => {
  const response = await axiosInstance.post(API_PAYMENT_GROUP.create, payload);
  return response.data;
};

export const listPayments = async (query: ListPaymentsQuery = {}): Promise<ListPaymentsResponse> => {
  const response = await axiosInstance.get<ListPaymentsResponse>(API_PAYMENT_GROUP.list, {
    params: query,
  });
  return response.data;
};

export const getPaymentById = async (id: string): Promise<Payment> => {
  const response = await axiosInstance.get<Payment>(API_PAYMENT_GROUP.byId(id));
  return response.data;
};

export const removePayment = async (id:string): Promise<{type:String, message:string}> => {
  const response = await axiosInstance.delete(API_PAYMENT_GROUP.remove(id));
  return response.data;
}




