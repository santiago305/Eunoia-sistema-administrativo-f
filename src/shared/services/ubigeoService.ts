import axiosInstance from "@/shared/common/utils/axios";
import { API_UBIGEO_GROUP } from "@/shared/services/APIs";
import type {
  UbigeoDepartment,
  UbigeoDistrict,
  UbigeoProvince,
} from "@/shared/types/ubigeo";

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
};

let cachedDepartments: UbigeoDepartment[] | null = null;
const provinceCache = new Map<string, UbigeoProvince[]>();
const districtCache = new Map<string, UbigeoDistrict[]>();

function normalizeIds(values?: string[]) {
  const uniqueValues = Array.from(
    new Set((values ?? []).map((value) => value?.trim()).filter(Boolean)),
  );

  return uniqueValues.length ? uniqueValues.join(",") : undefined;
}

export const listUbigeoDepartments = async (): Promise<UbigeoDepartment[]> => {
  if (cachedDepartments) {
    return cachedDepartments;
  }

  const response = await axiosInstance.get<ApiSuccessResponse<UbigeoDepartment[]>>(
    API_UBIGEO_GROUP.departments,
  );

  cachedDepartments = response.data.data ?? [];
  return cachedDepartments;
};

export const listUbigeoProvinces = async (
  params: ListUbigeoProvincesParams = {},
): Promise<UbigeoProvince[]> => {
  const cacheKey = params.departmentId ?? normalizeIds(params.departmentIds) ?? "__all__";
  const cached = provinceCache.get(cacheKey);
  if (cached) {
    return cached;
  }

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

  const provinces = response.data.data ?? [];
  provinceCache.set(cacheKey, provinces);
  return provinces;
};

export const listUbigeoDistricts = async (
  params: ListUbigeoDistrictsParams = {},
): Promise<UbigeoDistrict[]> => {
  const cacheKey = params.provinceId ?? normalizeIds(params.provinceIds) ?? "__all__";
  const cached = districtCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await axiosInstance.get<ApiSuccessResponse<UbigeoDistrict[]>>(
    API_UBIGEO_GROUP.districts,
    {
      params: {
        ...(params.provinceId ? { provinceId: params.provinceId } : {}),
        ...(normalizeIds(params.provinceIds)
          ? { provinceIds: normalizeIds(params.provinceIds) }
          : {}),
      },
    },
  );

  const districts = response.data.data ?? [];
  districtCache.set(cacheKey, districts);
  return districts;
};
