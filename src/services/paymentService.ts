import axiosInstance from "@/common/utils/axios";
import { API_PAYMENT_GROUP } from "@/services/APIs";
import type {
  Payment,
} from "@/types/purchase";

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


