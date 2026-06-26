import axiosInstance from "@/shared/common/utils/axios";
import { API_PURCHASE_DASHBOARD_GROUP } from "@/shared/services/APIs";
import type {
  PurchaseDashboardData,
  PurchaseDashboardFilters,
  PurchaseDashboardMonthlyPoint,
  PurchaseDashboardPaymentRow,
  PurchaseDashboardSeriesPoint,
  PurchaseDashboardSummary,
  PurchaseDashboardTopItem,
  PurchaseDashboardTopSupplier,
} from "@/features/purchases/types/purchase-dashboard.types";

const get = async <T>(url: string, params: PurchaseDashboardFilters): Promise<T> => {
  const response = await axiosInstance.get(url, { params });
  return response.data;
};

export const getPurchaseDashboardData = async (
  params: PurchaseDashboardFilters = {},
): Promise<PurchaseDashboardData> => {
  const [
    summary,
    byType,
    byStatus,
    topItems,
    topSuppliers,
    monthlySpending,
    upcomingPayments,
    overduePayments,
    paymentMethodUsage,
    internalVsInventory,
  ] = await Promise.all([
    get<PurchaseDashboardSummary>(API_PURCHASE_DASHBOARD_GROUP.summary, params),
    get<PurchaseDashboardSeriesPoint[]>(API_PURCHASE_DASHBOARD_GROUP.byType, params),
    get<PurchaseDashboardSeriesPoint[]>(API_PURCHASE_DASHBOARD_GROUP.byStatus, params),
    get<PurchaseDashboardTopItem[]>(API_PURCHASE_DASHBOARD_GROUP.topItems, params),
    get<PurchaseDashboardTopSupplier[]>(API_PURCHASE_DASHBOARD_GROUP.topSuppliers, params),
    get<PurchaseDashboardMonthlyPoint[]>(API_PURCHASE_DASHBOARD_GROUP.monthlySpending, params),
    get<PurchaseDashboardPaymentRow[]>(API_PURCHASE_DASHBOARD_GROUP.upcomingPayments, params),
    get<PurchaseDashboardPaymentRow[]>(API_PURCHASE_DASHBOARD_GROUP.overduePayments, params),
    get<PurchaseDashboardSeriesPoint[]>(API_PURCHASE_DASHBOARD_GROUP.paymentMethodUsage, params),
    get<PurchaseDashboardSeriesPoint[]>(API_PURCHASE_DASHBOARD_GROUP.internalVsInventory, params),
  ]);

  return {
    summary,
    byType,
    byStatus,
    topItems,
    topSuppliers,
    monthlySpending,
    upcomingPayments,
    overduePayments,
    paymentMethodUsage,
    internalVsInventory,
  };
};
