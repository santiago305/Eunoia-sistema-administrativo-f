import axiosInstance from "@/shared/common/utils/axios";
import { API_COMPANY_PAYMENT_ACCOUNTS_GROUP } from "@/shared/services/APIs";
import type {
  CompanyPaymentAccount,
  CreateCompanyPaymentAccountDto,
  UpdateCompanyPaymentAccountDto,
} from "@/features/payments/types/payment-account.types";

type ApiEnvelope<T> = {
  type: string;
  message: string;
  data: T;
};

const unwrapApiData = <T>(payload: T | ApiEnvelope<T>): T => {
  if (payload && typeof payload === "object" && "data" in (payload as ApiEnvelope<T>)) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
};

export const createCompanyPaymentAccount = async (
  payload: CreateCompanyPaymentAccountDto,
): Promise<CompanyPaymentAccount> => {
  const response = await axiosInstance.post<ApiEnvelope<CompanyPaymentAccount>>(
    API_COMPANY_PAYMENT_ACCOUNTS_GROUP.create,
    payload,
  );
  return unwrapApiData(response.data);
};

type CompanyPaymentAccountListResponse =
  | CompanyPaymentAccount[]
  | { items?: CompanyPaymentAccount[] }
  | ApiEnvelope<CompanyPaymentAccount[] | { items?: CompanyPaymentAccount[] }>;

const unwrapCompanyPaymentAccountList = (payload: CompanyPaymentAccountListResponse): CompanyPaymentAccount[] => {
  const data = unwrapApiData(payload);

  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "items" in data) return data.items ?? [];
  return [];
};

export const listCompanyPaymentAccountsByCompany = async (
  companyId: string,
): Promise<CompanyPaymentAccount[]> => {
  const response = await axiosInstance.get<CompanyPaymentAccountListResponse>(
    API_COMPANY_PAYMENT_ACCOUNTS_GROUP.byCompany(companyId),
  );
  return unwrapCompanyPaymentAccountList(response.data);
};

export const updateCompanyPaymentAccount = async (
  id: string,
  payload: UpdateCompanyPaymentAccountDto,
): Promise<CompanyPaymentAccount> => {
  const response = await axiosInstance.patch<ApiEnvelope<CompanyPaymentAccount>>(
    API_COMPANY_PAYMENT_ACCOUNTS_GROUP.update(id),
    payload,
  );
  return unwrapApiData(response.data);
};

export const setCompanyPaymentAccountActive = async (
  id: string,
  isActive: boolean,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.patch(API_COMPANY_PAYMENT_ACCOUNTS_GROUP.setActive(id), { isActive });
  return response.data;
};
