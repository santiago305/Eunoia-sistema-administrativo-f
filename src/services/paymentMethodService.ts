import axiosInstance from "@/common/utils/axios";
import {
  API_COMPANY_METHODS_GROUP,
  API_PAYMENT_METHODS_GROUP,
  API_SUPPLIER_METHODS_GROUP,
} from "@/services/APIs";
import type {
  CompanyMethod,
  CreateCompanyMethodDto,
  CreatePaymentMethodDto,
  CreateSupplierMethodDto,
  ListPaymentMethodsQuery,
  PaymentMethod,
  PaymentMethodGetByIdResponse,
  PaymentMethodListResponse,
  SetPaymentMethodActiveDto,
  SupplierMethod,
  UpdatePaymentMethodDto,
} from "@/pages/payment-methods/types/paymentMethod";

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

export const getPaymentMethodsByCompany = async (companyId: string): 
Promise<PaymentMethod[]> => {
  const response = await axiosInstance.get(API_PAYMENT_METHODS_GROUP.byCompany(companyId));
  return response.data.data as PaymentMethod[];
};

export const getPaymentMethodsBySupplier = async (supplierId: string): 
Promise<PaymentMethod[]> => {
  const response = await axiosInstance.get(API_PAYMENT_METHODS_GROUP.bySupplier(supplierId));
  return response.data.data as PaymentMethod[];
};

export const createCompanyMethod = async (
  payload: CreateCompanyMethodDto
): Promise<CompanyMethod> => {
  const response = await axiosInstance.post(API_COMPANY_METHODS_GROUP.create, payload);
  return response.data;
};

export const getCompanyMethodById = async (
  companyId: string,
  methodId: string
): Promise<CompanyMethod> => {
  const response = await axiosInstance.get(API_COMPANY_METHODS_GROUP.byId(companyId, methodId));
  return response.data;
};

export const deleteCompanyMethod = async (
  companyId: string,
  methodId: string
): Promise<CompanyMethod> => {
  const response = await axiosInstance.delete(API_COMPANY_METHODS_GROUP.remove(companyId, methodId));
  return response.data;
};

export const createSupplierMethod = async (
  payload: CreateSupplierMethodDto
): Promise<SupplierMethod> => {
  const response = await axiosInstance.post(API_SUPPLIER_METHODS_GROUP.create, payload);
  return response.data;
};

export const getSupplierMethodById = async (
  supplierId: string,
  methodId: string
): Promise<SupplierMethod> => {
  const response = await axiosInstance.get(API_SUPPLIER_METHODS_GROUP.byId(supplierId, methodId));
  return response.data;
};

export const deleteSupplierMethod = async (
  supplierId: string,
  methodId: string
): Promise<SupplierMethod> => {
  const response = await axiosInstance.delete(API_SUPPLIER_METHODS_GROUP.remove(supplierId, methodId));
  return response.data;
};
