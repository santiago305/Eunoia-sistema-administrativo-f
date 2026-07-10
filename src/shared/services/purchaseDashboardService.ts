import axiosInstance from "@/shared/common/utils/axios";
import { API_PURCHASE_DASHBOARD_GROUP } from "@/shared/services/APIs";
import type {
  PurchaseDashboardData,
  PurchaseDashboardFilters,
  PurchaseDashboardMonthlyPoint,
  PurchaseDashboardPaymentRow,
  PurchaseDashboardSavedFilterSnapshot,
  PurchaseDashboardSearchStateResponse,
  PurchaseDashboardSeriesPoint,
  PurchaseDashboardSummary,
  PurchaseDashboardTopItem,
  PurchaseDashboardTopSupplier,
} from "@/features/purchases/types/purchase-dashboard.types";

type PurchaseDashboardRequestParams = Omit<PurchaseDashboardFilters,
  | "supplierIds"
  | "purchaseTypes"
  | "paymentStatuses"
  | "userIds"
  | "warehouseIds"
  | "paymentMethodIds"
  | "companyPaymentAccountIds"
> & {
  supplierIds?: string;
  purchaseTypes?: string;
  paymentStatuses?: string;
  userIds?: string;
  warehouseIds?: string;
  paymentMethodIds?: string;
  companyPaymentAccountIds?: string;
};

const ARRAY_FILTER_KEYS = [
  "supplierIds",
  "purchaseTypes",
  "paymentStatuses",
  "userIds",
  "warehouseIds",
  "paymentMethodIds",
  "companyPaymentAccountIds",
] satisfies Array<keyof PurchaseDashboardFilters>;

const toCommaList = (value: string[] | undefined) => {
  const normalized = Array.from(new Set((value ?? []).map((item) => item.trim()).filter(Boolean)));
  return normalized.length ? normalized.join(",") : undefined;
};

const normalizeDashboardRequestParams = (
  params: PurchaseDashboardFilters,
): PurchaseDashboardRequestParams => {
  const normalized = { ...params } as PurchaseDashboardRequestParams;

  ARRAY_FILTER_KEYS.forEach((key) => {
    const value = params[key];
    if (Array.isArray(value)) {
      normalized[key] = toCommaList(value) as never;
    }
  });

  Object.keys(normalized).forEach((key) => {
    const value = normalized[key as keyof PurchaseDashboardRequestParams];
    if (value === undefined || value === "") {
      delete normalized[key as keyof PurchaseDashboardRequestParams];
    }
  });

  return normalized;
};

const get = async <T>(url: string, params: PurchaseDashboardFilters): Promise<T> => {
  const response = await axiosInstance.get(url, { params: normalizeDashboardRequestParams(params) });
  return response.data;
};

const can = (permissions: string[], permission: string) => permissions.includes(permission);

export const getPurchaseDashboardData = async (
  params: PurchaseDashboardFilters = {},
  permissions: string[] = [],
): Promise<PurchaseDashboardData> => {
  const [summary, byType, byStatus] = await Promise.all([
    get<PurchaseDashboardSummary>(API_PURCHASE_DASHBOARD_GROUP.summary, params),
    get<PurchaseDashboardSeriesPoint[]>(API_PURCHASE_DASHBOARD_GROUP.byType, params),
    get<PurchaseDashboardSeriesPoint[]>(API_PURCHASE_DASHBOARD_GROUP.byStatus, params),
  ]);

  const data: PurchaseDashboardData = {
    summary,
    byType,
    byStatus,
  };

  if (can(permissions, "purchases_dashboard.view_costs")) {
    data.monthlySpending = await get<PurchaseDashboardMonthlyPoint[]>(
      API_PURCHASE_DASHBOARD_GROUP.monthlySpending,
      params,
    );
  }

  if (can(permissions, "purchases_dashboard.view_payments")) {
    const [upcomingPayments, overduePayments, paymentMethodUsage] = await Promise.all([
      get<PurchaseDashboardPaymentRow[]>(API_PURCHASE_DASHBOARD_GROUP.upcomingPayments, params),
      get<PurchaseDashboardPaymentRow[]>(API_PURCHASE_DASHBOARD_GROUP.overduePayments, params),
      get<PurchaseDashboardSeriesPoint[]>(API_PURCHASE_DASHBOARD_GROUP.paymentMethodUsage, params),
    ]);
    data.upcomingPayments = upcomingPayments;
    data.overduePayments = overduePayments;
    data.paymentMethodUsage = paymentMethodUsage;
  }

  if (can(permissions, "purchases_dashboard.view_suppliers")) {
    data.topSuppliers = await get<PurchaseDashboardTopSupplier[]>(
      API_PURCHASE_DASHBOARD_GROUP.topSuppliers,
      params,
    );
  }

  if (can(permissions, "purchases_dashboard.view_items")) {
    data.topItems = await get<PurchaseDashboardTopItem[]>(API_PURCHASE_DASHBOARD_GROUP.topItems, params);
  }

  if (can(permissions, "purchases_dashboard.view_operations")) {
    data.internalVsInventory = await get<PurchaseDashboardSeriesPoint[]>(
      API_PURCHASE_DASHBOARD_GROUP.internalVsInventory,
      params,
    );
  }

  return data;
};

export const getPurchaseDashboardSearchState = async (): Promise<PurchaseDashboardSearchStateResponse> => {
  const response = await axiosInstance.get(API_PURCHASE_DASHBOARD_GROUP.searchState);
  return response.data;
};

export const savePurchaseDashboardSearchMetric = async (
  name: string,
  snapshot: PurchaseDashboardSavedFilterSnapshot,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_PURCHASE_DASHBOARD_GROUP.saveSearchMetric, {
    name,
    snapshot,
  });
  return response.data;
};

export const deletePurchaseDashboardSearchMetric = async (
  metricId: string,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(API_PURCHASE_DASHBOARD_GROUP.deleteSearchMetric(metricId));
  return response.data;
};
