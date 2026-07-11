import type { CurrencyType } from "./purchaseEnums";

export type RecurringFrequency = "MONTHLY" | "ANNUAL";
export type RecurringStatus = "ACTIVE" | "PAUSED" | "CANCELLED";
export type RecurringPurchaseType = "SERVICE" | "SUBSCRIPTION";

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
