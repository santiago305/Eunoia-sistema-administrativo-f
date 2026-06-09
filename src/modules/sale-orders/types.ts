export type RuleMode = "include" | "exclude";
export type DateOperator = "on" | "before" | "after" | "between" | "onOrBefore" | "onOrAfter";

export type PaymentStatus = "PAID" | "PENDING";

export type NumberRule = { field: "number"; operator: "contains" | "eq"; value: string };

export type ClientRule = { field: "clientId"; operator: "in"; mode?: RuleMode; values: string[] };
export type WarehouseRule = { field: "warehouseId"; operator: "in"; mode?: RuleMode; values: string[] };

export type PaymentStatusRule = { field: "paymentStatus"; operator: "in"; mode?: RuleMode; values: PaymentStatus[] };

export type DateRule = {
  field: "scheduleDate" | "deliveryDate";
  operator: DateOperator;
  value?: string;
  range?: { start?: string; end?: string };
};

export type Rule =
  | NumberRule
  | ClientRule
  | WarehouseRule
  | PaymentStatusRule
  | DateRule;

export type Payment = {
  id: string;
  bankAccount: { id: string; name: string; number?: string | null } | null;
  date: string;
  method: string;
  operationNumber: string | null;
  amount: number;
  note: string | null;
  createdAt: string;
};

export type SaleOrderRow = {
  id: string;
  serie: string | null;
  correlative: number | null;
  client: { id: string; fullName: string; docNumber?: string | null; reference?: string | null } | null;
  warehouse: { id: string; name: string } | null;
  source: { id: string; name: string; detail?: string | null } | null;
  createdBy: { id: string; name: string; email: string } | null;
  scheduleDate: string | null;
  deliveryDate: string | null;
  workflowId: string | null;
  currentStateId: string | null;
  subTotal: number;
  deliveryCost: number;
  total: number;
  note: string | null;
  agencyDetail: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  payments: Payment[];
  totalPaid: number;
  pendingAmount: number;
  paymentStatus: PaymentStatus;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type SearchSnapshot = { q?: string; filters: Rule[] };

export type SearchOption = { id: string; label: string; keywords?: string[] };

export type SearchState = {
  recent: Array<{ recentId: string; label: string; snapshot: SearchSnapshot; lastUsedAt: string }>;
  saved: Array<{ metricId: string; name: string; label: string; snapshot: SearchSnapshot; updatedAt: string }>;
  catalogs: {
    clients: Array<{ id: string; label: string }>;
    warehouses: Array<{ id: string; label: string }>;
    paymentStatuses: SearchOption[];
  };
};

