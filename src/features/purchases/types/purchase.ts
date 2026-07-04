import { z } from "zod";
import type {
  SmartSearchRangeValue,
  SmartSearchRuleMode,
} from "@/shared/components/table/search";
import {
  addPurchaseOrderItemSchema,
  createCreditQuotaSchema,
  createPaymentSchema,
  createPurchaseOrderSchema,
  listPurchaseOrdersQuerySchema,
  updatePurchaseOrderSchema,
} from "@/shared/schemas/purchaseSchemas";
import type {
  AfectTypeType,
  CurrencyType,
  PaymentFormType,
  PaymentType,
  PurchaseOrderStatus,
  VoucherDocType,
} from "@/features/purchases/types/purchaseEnums";
import type {
  PurchaseItemType,
  PurchasePaymentStatus,
  PurchaseType,
  ReceptionStatus,
} from "@/features/purchases/types/purchase-classification.types";

export type AddPurchaseOrderItemDto = z.infer<typeof addPurchaseOrderItemSchema>;
export type CreateCreditQuotaDto = z.infer<typeof createCreditQuotaSchema>;
export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
export type CreatePurchaseOrderDto = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderDto = z.infer<typeof updatePurchaseOrderSchema>;
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
    events?: PurchaseSearchOption[];
    users?: PurchaseSearchOption[];
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
  itemType?: PurchaseItemType;
  internalMaterialId?: string | null;
  assetCategoryId?: string | null;
  serviceName?: string | null;
  description?: string | null;
  warehouseId?: string | null;
  affectsStock?: boolean;
  generatesAsset?: boolean;
  isService?: boolean;
  isSubscription?: boolean;
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
  paymentForm?: PaymentFormType;
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
  purchaseType?: PurchaseType;
  receptionStatus?: ReceptionStatus;
  paymentStatus?: PurchasePaymentStatus;
  isRecurringSource?: boolean;
  recurringTemplateId?: string | null;
  requiresReceipt?: boolean;
  requiresStockEntry?: boolean;
  requiresAssetCreation?: boolean;
  expectedAt?: string | null;
  dateIssue?: string | null;
  dateExpiration?: string | null;
  isActive?: boolean;
  createdAt?: string;
  createdByUserId?: string;
  approvalStatus?: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
  processingApprovalStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  updatedAt?: string;
  imageProdution?: string[];
  items?: PurchaseOrderItem[];
  payments?: Payment[];
  quotas?: CreditQuota[];
};

export type Payment = {
  payDocId?: string;
  method: PaymentType | string;
  date: string;
  operationNumber?: string | null;
  currency: CurrencyType;
  amount: number | null;
  note?: string | null;
  quotaId?: string | null;
  poId?: string | null;
  accountPayableId?: string | null;
  status?: "SCHEDULED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  requestedByUserId?: string | null;
  approvedByUserId?: string | null;
  rejectedByUserId?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  companyPaymentAccountId?: string | null;
  paymentMethodId?: string | null;
  paidByUserId?: string | null;
  scheduledByUserId?: string | null;
  scheduledAt?: string | null;
  paidAt?: string | null;
  paymentEvidenceFileId?: string | null;
  bankName?: string | null;
  cardLastFour?: string | null;
  operationCode?: string | null;
  isPartial?: boolean;
  companyPaymentAccountMaskedLabel?: string | null;
  paymentEvidenceFile?: File | null;
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

export type PurchaseExportColumn = {
  key: string;
  label: string;
};

