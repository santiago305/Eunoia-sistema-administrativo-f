import axiosInstance from "@/shared/common/utils/axios";
import {
  API_COMPANY_METHODS_GROUP,
  API_PAYMENT_METHODS_GROUP,
} from "@/shared/services/APIs";
import type {
  CompanyMethod,
  CreateCompanyMethodDto,
  CreatePaymentMethodDto,
  ListPaymentMethodsQuery,
  PaymentMethod,
  PaymentMethodGetByIdResponse,
  PaymentMethodListResponse,
  PaymentMethodPivot,
  SetPaymentMethodActiveDto,
  UpdatePaymentMethodDto,
} from "@/features/payment-methods/types/paymentMethod";

export const createPaymentMethod = async (payload: CreatePaymentMethodDto): Promise<PaymentMethod> => {
  const response = await axiosInstance.post(API_PAYMENT_METHODS_GROUP.create, payload);
  return response.data;
};

export const updatePaymentMethod = async (
  id: string,
  payload: UpdatePaymentMethodDto
): Promise<PaymentMethod> => {
  const response = await axiosInstance.patch(API_PAYMENT_METHODS_GROUP.update(id), payload);
  return response.data;
};

export const setPaymentMethodActive = async (
  id: string,
  payload: SetPaymentMethodActiveDto
): Promise<PaymentMethod> => {
  const response = await axiosInstance.patch(API_PAYMENT_METHODS_GROUP.setActive(id), payload);
  return response.data;
};

export const getPaymentMethodById = async (id: string): Promise<PaymentMethod> => {
  const response = await axiosInstance.get<PaymentMethodGetByIdResponse>(API_PAYMENT_METHODS_GROUP.byId(id));
  return response.data.data as PaymentMethod;
};

export const listPaymentMethods = async (
  params: ListPaymentMethodsQuery
): Promise<PaymentMethodListResponse> => {
  const response = await axiosInstance.get(API_PAYMENT_METHODS_GROUP.list, { params });
  return response.data;
};

export const getAllPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const response = await axiosInstance.get(API_PAYMENT_METHODS_GROUP.listAll);
  return response.data;
};

export const getPaymentMethodsByCompany = async (
  companyId: string,
): Promise<PaymentMethodPivot[]> => {
  const response = await axiosInstance.get(API_COMPANY_METHODS_GROUP.byCompany(companyId));
  return response.data.data as PaymentMethodPivot[];
};

export const createCompanyMethod = async (
  payload: CreateCompanyMethodDto
): Promise<CompanyMethod> => {
  const response = await axiosInstance.post(API_COMPANY_METHODS_GROUP.create, payload);
  return response.data;
};

export const deleteCompanyMethod = async (
  companyMethodId: string
): Promise<CompanyMethod> => {
  const response = await axiosInstance.delete(API_COMPANY_METHODS_GROUP.remove(companyMethodId));
  return response.data;
};

