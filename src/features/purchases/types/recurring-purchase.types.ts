import type { CurrencyType } from "./purchaseEnums";
import type { DataTableSearchOption, SmartSearchRangeValue, SmartSearchRuleMode } from "@/shared/components/table/search";

export type RecurringFrequency = "MONTHLY" | "ANNUAL";
export type RecurringStatus = "ACTIVE" | "PAUSED" | "CANCELLED";
export type RecurringPurchaseType = "SERVICE" | "SUBSCRIPTION";

export const RecurringPurchaseSearchFields = {
  SUPPLIER_ID: "supplierId",
  STATUS: "status",
  FREQUENCY: "frequency",
  PURCHASE_TYPE: "purchaseType",
  CURRENCY: "currency",
  START_DATE: "startDate",
  NEXT_DUE_DATE: "nextDueDate",
  AMOUNT: "amount",
  PAYMENT_STATUS: "paymentStatus",
} as const;

export type RecurringPurchaseSearchField =
  typeof RecurringPurchaseSearchFields[keyof typeof RecurringPurchaseSearchFields];

export const RecurringPurchaseSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
  GT: "gt",
  GTE: "gte",
  LT: "lt",
  LTE: "lte",
  ON: "on",
  BEFORE: "before",
  AFTER: "after",
  BETWEEN: "between",
  ON_OR_BEFORE: "onOrBefore",
  ON_OR_AFTER: "onOrAfter",
} as const;

export type RecurringPurchaseSearchOperator =
  typeof RecurringPurchaseSearchOperators[keyof typeof RecurringPurchaseSearchOperators];

export type RecurringPurchaseSearchRule = {
  field: RecurringPurchaseSearchField;
  operator: RecurringPurchaseSearchOperator;
  mode?: SmartSearchRuleMode;
  value?: string;
  values?: string[];
  range?: SmartSearchRangeValue;
};

export type RecurringPurchaseSearchFilters = RecurringPurchaseSearchRule[];

export type RecurringPurchaseSearchSnapshot = {
  q?: string;
  filters: RecurringPurchaseSearchFilters;
};

export type RecurringPurchaseSearchCatalogs = {
  suppliers: DataTableSearchOption[];
  statuses?: DataTableSearchOption[];
  frequencies?: DataTableSearchOption[];
  purchaseTypes?: DataTableSearchOption[];
  currencies?: DataTableSearchOption[];
  paymentStatuses?: DataTableSearchOption[];
};

export type RecurringPurchaseRecentSearch = {
  recentId: string;
  label: string;
  snapshot: RecurringPurchaseSearchSnapshot;
  lastUsedAt: string;
};

export type RecurringPurchaseSavedMetric = {
  metricId: string;
  name: string;
  label: string;
  snapshot: RecurringPurchaseSearchSnapshot;
  updatedAt: string;
};

export type RecurringPurchaseSearchStateResponse = {
  recent: RecurringPurchaseRecentSearch[];
  saved: RecurringPurchaseSavedMetric[];
  catalogs: RecurringPurchaseSearchCatalogs;
};

export type RecurringPurchase = {
  recurringPurchaseTemplateId: string;
  supplierId: string;
  name: string;
  description?: string | null;
  frequency: RecurringFrequency;
  purchaseType: RecurringPurchaseType;
  currency: CurrencyType;
  amount: number;
  startDate: string;
  nextDueDate: string;
  status: RecurringStatus;
  reminderDaysBefore: number[];
  createdByUserId?: string | null;
  lastGeneratedAt?: string | null;
  lastGeneratedPeriodKey?: string | null;
  lastGeneratedPurchaseId?: string | null;
  lastGeneratedAccountPayableId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateRecurringPurchasePayload = {
  supplierId: string;
  name: string;
  description?: string;
  frequency: RecurringFrequency;
  purchaseType?: RecurringPurchaseType;
  currency: CurrencyType;
  amount: number;
  startDate: string;
  nextDueDate?: string;
  reminderDaysBefore?: number[];
};

export type ListRecurringPurchasesQuery = {
  status?: RecurringStatus;
  statuses?: RecurringStatus[];
  supplierId?: string;
  supplierIds?: string[];
  frequency?: RecurringFrequency;
  frequencies?: RecurringFrequency[];
  currency?: CurrencyType;
  currencies?: CurrencyType[];
  purchaseType?: RecurringPurchaseType;
  purchaseTypes?: RecurringPurchaseType[];
  q?: string;
  filters?: RecurringPurchaseSearchFilters | string;
  page?: number;
  limit?: number;
};

export type ListRecurringPurchasesResponse = {
  items: RecurringPurchase[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  hasPrev?: boolean;
  hasNext?: boolean;
};

export type RegisterRecurringPurchasePaymentPayload = {
  method: string;
  date: string;
  operationNumber?: string;
  currency: CurrencyType;
  amount: number;
  note?: string;
  companyPaymentAccountId?: string;
  paymentMethodId?: string;
  scheduledAt?: string;
  paidAt?: string;
  paymentEvidenceFileId?: string;
  bankName?: string;
  cardLastFour?: string;
  operationCode?: string;
  isPartial?: boolean;
};

export type RegisterRecurringPurchasePaymentResponse = {
  type: string;
  message: string;
  paymentId?: string;
  purchaseId?: string;
  accountPayableId?: string;
};
