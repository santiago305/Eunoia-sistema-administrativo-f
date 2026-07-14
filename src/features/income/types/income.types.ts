import type { DataTableSearchOption, SmartSearchRule } from "@/shared/components/table/search";

export type Income = {
  incomeId: string;
  saleOrderId: string;
  clientName: string;
  amount: number;
  method: string;
  companyPaymentAccountId: string | null;
  companyPaymentAccountLabel: string | null;
  operationNumber: string | null;
  date: string;
  createdAt: string;
  evidenceUrl: string | null;
};

export type IncomeSummary = {
  totalCollected: number;
  totalPending: number;
  ordersPaid: number;
  ordersPending: number;
  byMethod: Array<{ method: string; amount: number; count: number }>;
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
