import type { DataTableSearchOption, SmartSearchRule } from "@/shared/components/table/search";

export type IncomeStatus = "PENDING_CONFIRMATION" | "POSTED" | "CANCELLED" | "REVERSED" | "VOIDED";

export type Income = {
  incomeId: string;
  saleOrderId: string;
  saleOrderNumber: string;
  clientName: string;
  amount: number;
  currency?: string;
  method: string;
  paymentMethodId?: string | null;
  paymentMethodCode?: string | null;
  paymentMethodName?: string;
  companyPaymentAccountId: string | null;
  companyPaymentAccountLabel: string | null;
  operationNumber: string | null;
  detail: string | null;
  date: string;
  createdAt: string;
  evidenceUrl: string | null;
  evidence?: IncomeEvidenceSummary;
  status?: IncomeStatus;
  correctedFromPaymentId?: string | null;
  financialReason?: string | null;
  version: number;
  paymentDate?: string;
  accountingDate?: string | null;
  postedAt?: string | null;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
  postedByUserId?: string | null;
  reconciledAmount?: number;
  appliedAmount?: number;
  customerCreditBalance?: number;
  reconciliationStatus?: "UNRECONCILED" | "PARTIALLY_RECONCILED" | "RECONCILED";
  voidedAt?: string | null;
  voidedByUserId?: string | null;
  voidReason?: string | null;
};

export type IncomeEvidenceStatus = "AVAILABLE" | "MISSING_OPTIONAL" | "MISSING_REQUIRED" | "UNAVAILABLE";
export type IncomeEvidenceSummary = {
  available: boolean;
  status: IncomeEvidenceStatus;
  attachmentId: string | null;
  url: string | null;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string | null;
  canView: boolean;
  canUpload: boolean;
  inherited?: boolean;
};

export type IncomeSummary = {
  totalCollected: number | null;
  totalPending: number | null;
  ordersPaid: number;
  ordersPending: number;
  postedPaymentsCount?: number;
  averageCollectedPayment?: number | null;
  collectionEffectiveness?: number | null;
  observedPaymentsCount?: number;
  observedPaymentsAmount?: number | null;
  voidedPaymentsCount?: number;
  voidedPaymentsAmount?: number | null;
  currencyMetrics?: Array<{
    currency: string;
    totalCollected: number;
    totalPending: number;
    ordersPaid: number;
    ordersPending: number;
    postedPaymentsCount: number;
    averageCollectedPayment: number;
    collectionEffectiveness: number;
    observedPaymentsCount: number;
    observedPaymentsAmount: number;
    voidedPaymentsCount: number;
    voidedPaymentsAmount: number;
  }>;
  customerCreditByCurrency?: Array<{ currency: string; availableAmount: number; incomesCount: number }>;
  byMethod: Array<{ currency?: string; method: string; paymentMethodId?: string | null; paymentMethodCode?: string | null; amount: number; count: number }>;
  byAccount: Array<{ currency?: string; accountId: string | null; label: string; amount: number; count: number }>;
};

export type IncomeListQuery = {
  from?: string;
  to?: string;
  method?: string;
  companyPaymentAccountId?: string;
  saleOrderId?: string;
  client?: string;
  q?: string;
  hasEvidence?: boolean;
  status?: IncomeStatus | "ALL";
  filters?: IncomeSearchRule[];
  page?: number;
  limit?: number;
};

export type IncomeListResponse = {
  items: Income[];
  total: number;
};

export type IncomeSearchField =
  | "status"
  | "reconciliationStatus"
  | "paymentMethodId"
  | "detail"
  | "companyPaymentAccountId"
  | "hasEvidence"
  | "customerCreditStatus";

export type IncomeSearchOperator = "in" | "contains" | "eq";
export type IncomeSearchRule = SmartSearchRule<IncomeSearchField, IncomeSearchOperator>;

export type IncomeSearchCatalogs = {
  methods?: DataTableSearchOption[];
  accounts?: DataTableSearchOption[];
};

export type IncomeSearchSnapshot = {
  q: string;
  filters: IncomeSearchRule[];
};

export type IncomeRecentSearch = {
  recentId: string;
  label: string;
  snapshot: IncomeSearchSnapshot;
  lastUsedAt: string;
};

export type IncomeSavedMetric = {
  metricId: string;
  name: string;
  label: string;
  snapshot: IncomeSearchSnapshot;
  updatedAt: string;
};

export type IncomeSearchStateResponse = {
  recent: IncomeRecentSearch[];
  saved: IncomeSavedMetric[];
  catalogs: IncomeSearchCatalogs;
};
