import axiosInstance from "@/shared/common/utils/axios";
import { API_COMPANY_GROUP } from "@/shared/services/APIs";
import type { Company, CreateCompanyDto, UpdateCompanyDto } from "@/features/company/types/company";

export const createCompany = async (payload: CreateCompanyDto): Promise<Company> => {
  const response = await axiosInstance.post(API_COMPANY_GROUP.create, payload);
  return response.data;
};

export const updateCompany = async (payload: UpdateCompanyDto): Promise<Company> => {
  const response = await axiosInstance.patch(API_COMPANY_GROUP.update, payload);
  return response.data;
};

export const getCompany = async (): Promise<Company> => {
  const response = await axiosInstance.get(API_COMPANY_GROUP.get);
  return response.data;
};

export const uploadCompanyLogo = async (file: File): Promise<Company> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosInstance.patch(API_COMPANY_GROUP.uploadLogo, formData);
  return response.data;
};

export const uploadCompanyCert = async (file: File): Promise<Company> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosInstance.patch(API_COMPANY_GROUP.uploadCert, formData);
  return response.data;
};
