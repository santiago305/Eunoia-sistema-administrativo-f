import axiosInstance from "@/shared/common/utils/axios";
import { API_PAYMENT_GROUP } from "@/shared/services/APIs";
import type {
  Payment,
} from "@/features/purchases/types/purchase";

export const createPayment = async (
  payload: Payment
): Promise<{type:string, message:string}> => {
  const response = await axiosInstance.post(API_PAYMENT_GROUP.create, payload);
  return response.data;
};

export const removePayment = async (id:string): Promise<{type:String, message:string}> => {
  const response = await axiosInstance.delete(API_PAYMENT_GROUP.remove(id));
  return response.data;
}




