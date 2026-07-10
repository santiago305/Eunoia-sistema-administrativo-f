import type { DataTableSearchOption, SmartSearchRule } from "@/shared/components/table/search";

export const DEFAULT_PURCHASE_DASHBOARD_LIMIT = 10;

export type PurchaseDashboardFilters = {
  from?: string;
  to?: string;
  supplierId?: string;
  supplierIds?: string[];
  purchaseType?: string;
  purchaseTypes?: string[];
  status?: string;
  paymentStatus?: string;
  paymentStatuses?: string[];
  userId?: string;
  userIds?: string[];
  warehouseId?: string;
  warehouseIds?: string[];
  paymentMethodId?: string;
  paymentMethodIds?: string[];
  companyPaymentAccountId?: string;
  companyPaymentAccountIds?: string[];
  limit?: number;
};

export type PurchaseDashboardFilterField =
  | "purchaseType"
  | "paymentStatus"
  | "supplierId"
  | "userId"
  | "warehouseId"
  | "paymentMethodId"
  | "companyPaymentAccountId";

export type PurchaseDashboardFilterOperator = "in";

export type PurchaseDashboardSavedFilterRule = SmartSearchRule<
  PurchaseDashboardFilterField,
  PurchaseDashboardFilterOperator
>;

export type PurchaseDashboardDateRangeSnapshot = {
  mode: "absolute";
  from?: string;
  to?: string;
};

export type PurchaseDashboardSavedFilterSnapshot = {
  filters: PurchaseDashboardSavedFilterRule[];
  dateRange?: PurchaseDashboardDateRangeSnapshot;
};

export type PurchaseDashboardRecentSearch = {
  recentId: string;
  snapshot: PurchaseDashboardSavedFilterSnapshot;
  lastUsedAt: string;
};

export type PurchaseDashboardSavedMetric = {
  metricId: string;
  name: string;
  snapshot: PurchaseDashboardSavedFilterSnapshot;
  updatedAt: string;
};

export type PurchaseDashboardSearchStateResponse = {
  recent: PurchaseDashboardRecentSearch[];
  saved: PurchaseDashboardSavedMetric[];
};

export type PurchaseDashboardSavedFilterCatalogs = Partial<
  Record<`${PurchaseDashboardFilterField}s`, DataTableSearchOption[]>
> & {
  purchaseTypes?: DataTableSearchOption[];
  paymentStatuses?: DataTableSearchOption[];
  suppliers?: DataTableSearchOption[];
  users?: DataTableSearchOption[];
  warehouses?: DataTableSearchOption[];
  paymentMethods?: DataTableSearchOption[];
  companyPaymentAccounts?: DataTableSearchOption[];
};

export type PurchaseDashboardSummary = {
  totalPurchased: number;
  totalPaid: number;
  pending: number;
  overdue: number;
  drafts: number;
  toApprove: number;
  paymentsToApprove: number;
  received: number;
};

export type PurchaseDashboardSeriesPoint = {
  label: string;
  value: number;
  count?: number;
};

export type PurchaseDashboardMonthlyPoint = {
  month: string;
  purchased: number;
  paid: number;
};

export type PurchaseDashboardPaymentRow = {
  accountPayableId: string;
  purchaseId: string;
  supplierId: string | null;
  supplierName: string | null;
  dueDate: string | null;
  amountPending: number;
  currency: string;
  status: string;
};

export type PurchaseDashboardTopItem = {
  itemId: string | null;
  label: string;
  itemType: string;
  total: number;
  quantity: number;
};

export type PurchaseDashboardTopSupplier = {
  supplierId: string | null;
  supplierName: string;
  total: number;
  count: number;
};

export type PurchaseDashboardData = {
  summary: PurchaseDashboardSummary;
  byType: PurchaseDashboardSeriesPoint[];
  byStatus: PurchaseDashboardSeriesPoint[];
  topItems?: PurchaseDashboardTopItem[];
  topSuppliers?: PurchaseDashboardTopSupplier[];
  monthlySpending?: PurchaseDashboardMonthlyPoint[];
  upcomingPayments?: PurchaseDashboardPaymentRow[];
  overduePayments?: PurchaseDashboardPaymentRow[];
  paymentMethodUsage?: PurchaseDashboardSeriesPoint[];
  internalVsInventory?: PurchaseDashboardSeriesPoint[];
};
