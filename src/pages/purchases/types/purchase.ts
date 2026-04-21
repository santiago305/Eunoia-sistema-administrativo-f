import { z } from "zod";
import type {
  SmartSearchRangeValue,
  SmartSearchRuleMode,
} from "@/components/table/search";
import {
  addPurchaseOrderItemSchema,
  createCreditQuotaSchema,
  createPaymentSchema,
  createPurchaseOrderSchema,
  listPurchaseOrdersQuerySchema,
  setPurchaseOrderActiveSchema,
  updatePurchaseOrderSchema,
} from "@/schemas/purchaseSchemas";
import type {
  AfectTypeType,
  CurrencyType,
  PaymentFormType,
  PaymentType,
  PurchaseOrderStatus,
  VoucherDocType,
} from "@/pages/purchases/types/purchaseEnums";

export type AddPurchaseOrderItemDto = z.infer<typeof addPurchaseOrderItemSchema>;
export type CreateCreditQuotaDto = z.infer<typeof createCreditQuotaSchema>;
export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
export type CreatePurchaseOrderDto = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderDto = z.infer<typeof updatePurchaseOrderSchema>;
export type UpdatePurchaseOrderActiveDto = z.infer<typeof setPurchaseOrderActiveSchema>;
export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersQuerySchema>;

export const PurchaseSearchFields = {
  SUPPLIER_ID: "supplierId",
  WAREHOUSE_ID: "warehouseId",
  STATUS: "status",
  DOCUMENT_TYPE: "documentType",
  PAYMENT_FORM: "paymentForm",
  NUMBER: "number",
  TOTAL: "total",
  TOTAL_PAID: "totalPaid",
  TOTAL_TO_PAY: "totalToPay",
  WAIT_TIME: "waitTime",
  DATE_ISSUE: "dateIssue",
  EXPECTED_AT: "expectedAt",
} as const;

export type PurchaseSearchField =
  typeof PurchaseSearchFields[keyof typeof PurchaseSearchFields];

export const PurchaseSearchOperators = {
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

export type PurchaseSearchOperator =
  typeof PurchaseSearchOperators[keyof typeof PurchaseSearchOperators];

export const PurchaseWaitTimeStates = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type PurchaseWaitTimeState =
  typeof PurchaseWaitTimeStates[keyof typeof PurchaseWaitTimeStates];

export type PurchaseSearchRule = {
  field: PurchaseSearchField;
  operator: PurchaseSearchOperator;
  mode?: SmartSearchRuleMode;
  value?: string;
  values?: string[];
  range?: SmartSearchRangeValue;
};

export type PurchaseSearchFilters = PurchaseSearchRule[];

export type PurchaseSearchSnapshot = {
  q?: string;
  filters: PurchaseSearchFilters;
};

export type PurchaseSearchOption = {
  id: string;
  label: string;
  keywords?: string[];
};

export type PurchaseRecentSearch = {
  recentId: string;
  label: string;
  snapshot: PurchaseSearchSnapshot;
  lastUsedAt: string;
};

export type PurchaseSavedMetric = {
  metricId: string;
  name: string;
  label: string;
  snapshot: PurchaseSearchSnapshot;
  updatedAt: string;
};

export type PurchaseSearchStateResponse = {
  recent: PurchaseRecentSearch[];
  saved: PurchaseSavedMetric[];
  catalogs: {
    suppliers: PurchaseSearchOption[];
    warehouses: PurchaseSearchOption[];
    statuses: PurchaseSearchOption[];
    documentTypes: PurchaseSearchOption[];
    paymentForms: PurchaseSearchOption[];
  };
};

export type PurchaseOrderItem = {
  skuId: string,
  sku?: {
    id: string,
    backendSku?: string | null,
    customSku?: string | null,
    name?: string | null,
  },
  unitBase: string,
  equivalence: string,
  factor: number,
  afectType: AfectTypeType,
  quantity: number,
  porcentageIgv: number,
  baseWithoutIgv: number,
  amountIgv: number,
  unitValue: number,
  unitPrice: number,
  purchaseValue: number,
  name?:string;
};

export type PurchaseOrder = {
  poId?: string;
  supplierId: string;
  supplierName?: string;
  supplierDocumentNumber?: string;
  warehouseId: string;
  warehouseName?: string;
  documentType: VoucherDocType;
  serie: string;
  correlative?: number;
  currency: CurrencyType;
  paymentForm: PaymentFormType;
  creditDays?: number | null;
  numQuotas?: number | null;
  totalTaxed: number;
  totalExempted: number;
  totalIgv: number;
  purchaseValue: number;
  total: number;
  totalPaid?: number;
  totalToPay?: number;
  note?: string | null;
  status: PurchaseOrderStatus;
  expectedAt?: string | null;
  dateIssue?: string | null;
  dateExpiration?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  items?: PurchaseOrderItem[];
  payments?: Payment[];
  quotas?: CreditQuota[];
};

export type Payment = {
  payDocId?: string;
  method: PaymentType;
  date: string;
  operationNumber?: string | null;
  currency: CurrencyType;
  amount: number | null;
  note?: string | null;
  quotaId?: string | null;
  poId?: string | null;
};

export type CreditQuota = {
  quotaId?: string;
  number: number;
  expirationDate: string;
  paymentDate?: string | null;
  totalToPay: number;
  totalPaid?: number | null;
  poId?: string | null;
};

export type PurchaseOrderListResponse = {
  items: PurchaseOrder[];
  total: number;
  page: number;
  limit: number;
};

export type PurchaseOrderItemsResponse = PurchaseOrderItem[];


