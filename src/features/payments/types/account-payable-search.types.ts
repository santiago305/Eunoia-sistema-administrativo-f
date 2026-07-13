import type { DataTableSearchOption } from "@/shared/components/table/search";

export const AccountPayableSearchFields = {
  STATUS: "status",
  PURCHASE_ID: "purchaseId",
  SUPPLIER_ID: "supplierId",
  CURRENCY: "currency",
  AMOUNT_PENDING: "amountPending",
  DUE_DATE: "dueDate",
} as const;

export type AccountPayableSearchField =
  typeof AccountPayableSearchFields[keyof typeof AccountPayableSearchFields];

export const AccountPayableSearchOperators = {
  IN: "in",
  EQ: "eq",
  GT: "gt",
  GTE: "gte",
  LT: "lt",
  LTE: "lte",
  ON: "on",
  BEFORE: "before",
  AFTER: "after",
  BETWEEN: "between",
} as const;

export type AccountPayableSearchOperator =
  typeof AccountPayableSearchOperators[keyof typeof AccountPayableSearchOperators];

export type AccountPayableSearchRuleMode = "include" | "exclude";

export interface AccountPayableSearchRangeValue {
  start?: string;
  end?: string;
}

export interface AccountPayableSearchRule {
  field: AccountPayableSearchField;
  operator: AccountPayableSearchOperator;
  mode?: AccountPayableSearchRuleMode;
  value?: string;
  values?: string[];
  range?: AccountPayableSearchRangeValue;
}

export type AccountPayableSearchFilters = AccountPayableSearchRule[];

export interface AccountPayableSearchSnapshot {
  q?: string;
  filters: AccountPayableSearchFilters;
}

export interface AccountPayableSearchStateResponse {
  recent: [];
  saved: [];
  catalogs: {
    statuses: DataTableSearchOption[];
    currencies: DataTableSearchOption[];
  };
}
