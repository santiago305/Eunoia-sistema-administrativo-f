import type { DataTableSearchOption, SmartSearchRule } from "@/shared/components/table/search";

export type Income = {
  incomeId: string;
  saleOrderId: string;
  saleOrderNumber: string;
  clientName: string;
  amount: number;
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
  status?: "POSTED" | "VOIDED";
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
};

export type IncomeSummary = {
  totalCollected: number;
  totalPending: number;
  ordersPaid: number;
  ordersPending: number;
  postedPaymentsCount?: number;
  averageCollectedPayment?: number;
  collectionEffectiveness?: number;
  observedPaymentsCount?: number;
  observedPaymentsAmount?: number;
  voidedPaymentsCount?: number;
  voidedPaymentsAmount?: number;
  byMethod: Array<{ method: string; paymentMethodId?: string | null; paymentMethodCode?: string | null; amount: number; count: number }>;
  byAccount: Array<{ accountId: string | null; label: string; amount: number; count: number }>;
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
  status?: "POSTED" | "VOIDED" | "ALL";
  page?: number;
  limit?: number;
};

export type IncomeListResponse = {
  items: Income[];
  total: number;
};

export type IncomeSearchField =
  | "client"
  | "saleOrderId"
  | "method"
  | "account"
  | "date"
  | "amount"
  | "hasEvidence";

export type IncomeSearchOperator = "contains" | "eq" | "range" | "gte" | "lte";
export type IncomeSearchRule = SmartSearchRule<IncomeSearchField, IncomeSearchOperator>;

export type IncomeSearchCatalogs = {
  methods?: DataTableSearchOption[];
  accounts?: DataTableSearchOption[];
};
