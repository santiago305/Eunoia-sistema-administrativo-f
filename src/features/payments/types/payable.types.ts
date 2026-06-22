import type { CurrencyType } from "@/features/purchases/types/purchaseEnums";

export type AccountPayableStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";

export type AccountPayable = {
  accountPayableId: string;
  purchaseId: string;
  quotaId?: string | null;
  supplierId?: string | null;
  description?: string | null;
  currency: CurrencyType;
  amountTotal: number;
  amountPaid: number;
  amountPending: number;
  dueDate?: string | null;
  status: AccountPayableStatus;
  createdByUserId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ListAccountPayablesQuery = {
  status?: AccountPayableStatus;
  purchaseId?: string;
  page?: number;
  limit?: number;
};

export type ListAccountPayablesResponse = {
  items: AccountPayable[];
  total: number;
  page: number;
  limit: number;
};

