export type PurchaseDashboardFilters = {
  from?: string;
  to?: string;
  supplierId?: string;
  purchaseType?: string;
  status?: string;
  paymentStatus?: string;
  userId?: string;
  warehouseId?: string;
  paymentMethodId?: string;
  companyPaymentAccountId?: string;
  limit?: number;
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
