import axiosInstance from "@/shared/common/utils/axios";
import { API_COMPANY_GROUP } from "@/shared/services/APIs";
import type {
  Company,
  CompanyBranding,
  CreateCompanyDto,
  UpdateCompanyDto,
} from "@/features/company/types/company";

type ApiWrapped<T> = {
  data?: T;
};

const unwrapApiData = <T>(payload: T | ApiWrapped<T>): T => {
  const maybeWrapped = payload as ApiWrapped<T>;
  return (maybeWrapped?.data ?? payload) as T;
};

export const createCompany = async (payload: CreateCompanyDto): Promise<Company> => {
  const response = await axiosInstance.post(API_COMPANY_GROUP.create, payload);
  return unwrapApiData<Company>(response.data);
};

export const updateCompany = async (payload: UpdateCompanyDto): Promise<Company> => {
  const response = await axiosInstance.patch(API_COMPANY_GROUP.update, payload);
  return unwrapApiData<Company>(response.data);
};

export const getCompany = async (): Promise<Company> => {
  const response = await axiosInstance.get(API_COMPANY_GROUP.get);
  return unwrapApiData<Company>(response.data);
};

export const getCompanyBranding = async (): Promise<CompanyBranding> => {
  const response = await axiosInstance.get(API_COMPANY_GROUP.branding, {
    skipAuthRefresh: true,
  } as { skipAuthRefresh: boolean });
  return unwrapApiData<CompanyBranding>(response.data);
};

export const uploadCompanyLogo = async (file: File): Promise<Company> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosInstance.patch(API_COMPANY_GROUP.uploadLogo, formData);
  return unwrapApiData<Company>(response.data);
};

export const uploadCompanyIsotype = async (file: File): Promise<Company> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosInstance.patch(API_COMPANY_GROUP.uploadIsotype, formData);
  return unwrapApiData<Company>(response.data);
};

export const uploadCompanyCert = async (file: File): Promise<Company> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosInstance.patch(API_COMPANY_GROUP.uploadCert, formData);
  return unwrapApiData<Company>(response.data);
};
