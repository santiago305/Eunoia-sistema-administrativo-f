export type AdminFinanceQuery = {
  q?: string;
  from?: string;
  to?: string;
  type?: "INCOME" | "EXPENSE";
  status?: string;
  page?: number;
  limit?: number;
};

export type AdminFinanceSummary = {
  income: {
    collected: number;
    pending: number;
  };
  expenses: {
    paid: number;
    pending: number;
    overdue: number;
    scheduled: number;
  };
  net: {
    collectedMinusPaid: number;
    projectedAfterPending: number;
  };
};

export type AdminFinanceMovement = {
  type: "INCOME" | "EXPENSE";
  source: "SALE_ORDER" | "PURCHASE" | "RECURRING_PURCHASE" | "LOGISTICS";
  sourceId: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  description: string;
};

export type AdminFinanceMovementResponse = {
  items: AdminFinanceMovement[];
  total: number;
};
