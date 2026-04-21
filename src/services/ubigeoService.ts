import axiosInstance from "@/common/utils/axios";
import { API_UBIGEO_GROUP } from "@/services/APIs";
import type {
  UbigeoDepartment,
  UbigeoDistrict,
  UbigeoProvince,
} from "@/types/ubigeo";

type ApiSuccessResponse<T> = {
  type: string;
  message: string;
  data: T;
};

type ListUbigeoProvincesParams = {
  departmentId?: string;
  departmentIds?: string[];
};

type ListUbigeoDistrictsParams = {
  provinceId?: string;
  provinceIds?: string[];
  departmentIds?: string[];
};

function normalizeIds(values?: string[]) {
  const uniqueValues = Array.from(
    new Set((values ?? []).map((value) => value?.trim()).filter(Boolean)),
  );

  return uniqueValues.length ? uniqueValues.join(",") : undefined;
}

export const listUbigeoDepartments = async (): Promise<UbigeoDepartment[]> => {
  const response = await axiosInstance.get<ApiSuccessResponse<UbigeoDepartment[]>>(
    API_UBIGEO_GROUP.departments,
  );

  return response.data.data ?? [];
};

export const listUbigeoProvinces = async (
  params: ListUbigeoProvincesParams = {},
): Promise<UbigeoProvince[]> => {
  const response = await axiosInstance.get<ApiSuccessResponse<UbigeoProvince[]>>(
    API_UBIGEO_GROUP.provinces,
    {
      params: {
        ...(params.departmentId ? { departmentId: params.departmentId } : {}),
        ...(normalizeIds(params.departmentIds)
          ? { departmentIds: normalizeIds(params.departmentIds) }
          : {}),
      },
    },
  );

  return response.data.data ?? [];
};

export const listUbigeoDistricts = async (
  params: ListUbigeoDistrictsParams = {},
): Promise<UbigeoDistrict[]> => {
  const response = await axiosInstance.get<ApiSuccessResponse<UbigeoDistrict[]>>(
    API_UBIGEO_GROUP.districts,
    {
      params: {
        ...(params.provinceId ? { provinceId: params.provinceId } : {}),
        ...(normalizeIds(params.provinceIds)
          ? { provinceIds: normalizeIds(params.provinceIds) }
          : {}),
        ...(normalizeIds(params.departmentIds)
          ? { departmentIds: normalizeIds(params.departmentIds) }
          : {}),
      },
    },
  );

  return response.data.data ?? [];
};
