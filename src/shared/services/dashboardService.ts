import axiosInstance from "@/shared/common/utils/axios";
import type {
  DashboardSaleOrdersUbigeoQuery,
  DashboardSaleOrdersUbigeoResponse,
} from "@/features/dashboard/types";
import { API_DASHBOARD_GROUP } from "./APIs";

function buildDashboardUbigeoParams(
  params?: DashboardSaleOrdersUbigeoQuery,
) {
  return {
    month: params?.month || undefined,
    cancelBool:
      typeof params?.cancelBool === "boolean"
        ? params.cancelBool
        : undefined,
  };
}

export async function getDashboardSaleOrdersByDepartment(
  params?: DashboardSaleOrdersUbigeoQuery,
): Promise<DashboardSaleOrdersUbigeoResponse> {
  const response = await axiosInstance.get<DashboardSaleOrdersUbigeoResponse>(
    API_DASHBOARD_GROUP.saleOrdersUbigeoDepartments,
    { params: buildDashboardUbigeoParams(params) },
  );
  return response.data;
}

export async function getDashboardSaleOrdersByProvince(
  departmentId: string,
  params?: DashboardSaleOrdersUbigeoQuery,
): Promise<DashboardSaleOrdersUbigeoResponse> {
  const response = await axiosInstance.get<DashboardSaleOrdersUbigeoResponse>(
    API_DASHBOARD_GROUP.saleOrdersUbigeoProvinces(departmentId),
    { params: buildDashboardUbigeoParams(params) },
  );
  return response.data;
}

export async function getDashboardSaleOrdersByDistrict(
  provinceId: string,
  params?: DashboardSaleOrdersUbigeoQuery,
): Promise<DashboardSaleOrdersUbigeoResponse> {
  const response = await axiosInstance.get<DashboardSaleOrdersUbigeoResponse>(
    API_DASHBOARD_GROUP.saleOrdersUbigeoDistricts(provinceId),
    { params: buildDashboardUbigeoParams(params) },
  );
  return response.data;
}
