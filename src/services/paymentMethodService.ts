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
  PaymentMethodPivot,
  SetPaymentMethodActiveDto,
  SupplierMethod,
  SupplierMethodRelation,
  UpdatePaymentMethodDto,
} from "@/pages/payment-methods/types/paymentMethod";

type ApiEnvelope<T> = {
  type: string;
  message: string;
  data: T;
};

const unwrapApiData = <T>(payload: T | ApiEnvelope<T>): T => {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in (payload as ApiEnvelope<T>) &&
    "message" in (payload as ApiEnvelope<T>)
  ) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
};

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
  const response = await axiosInstance.get(API_PAYMENT_METHODS_GROUP.byCompany(companyId));
  return response.data.data as PaymentMethodPivot[];
};

export const getPaymentMethodsBySupplier = async (
  supplierId: string,
): Promise<PaymentMethodPivot[]> => {
  const response = await axiosInstance.get(API_PAYMENT_METHODS_GROUP.bySupplier(supplierId));
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

export const createSupplierMethod = async (
  payload: CreateSupplierMethodDto
): Promise<SupplierMethod> => {
  const response = await axiosInstance.post<ApiEnvelope<SupplierMethod>>(API_SUPPLIER_METHODS_GROUP.create, payload);
  return unwrapApiData(response.data);
};

export const listSupplierMethodsBySupplier = async (
  supplierId: string
): Promise<SupplierMethodRelation[]> => {
  const response = await axiosInstance.get<ApiEnvelope<SupplierMethodRelation[]>>(
    API_SUPPLIER_METHODS_GROUP.listBySupplier(supplierId)
  );
  return unwrapApiData(response.data);
};

export const deleteSupplierMethod = async (
  supplierMethodId: string
): Promise<{ supplierMethodId: string }> => {
  const response = await axiosInstance.delete<ApiEnvelope<{ supplierMethodId: string }>>(
    API_SUPPLIER_METHODS_GROUP.remove(supplierMethodId)
  );
  return unwrapApiData(response.data);
};
