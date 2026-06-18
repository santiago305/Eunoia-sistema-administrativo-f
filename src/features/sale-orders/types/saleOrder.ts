import { ClientDocType } from "@/features/clients/types/client";

export type SaleOrderItemComponentInput = {
  id?: string;
  skuId?: string;
  sku?:
    | {
        id?: string;
        name?: string | null;
        backendSku?: string | null;
        customSku?: string | null;
        image?: string | null;
        attributes?: Array<{ value?: string | null }> | null;
      }
    | null;
  quantity: number;
  unitPrice: number;
  total: number;
  referencePackItemId?: string;

  skuLabel?: string;
  skuCode?: string;
  skuImage?: string | null;
};

export type SaleOrderItemInput = {
  id?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  description: string;
  referencePackId?: string;
  components?: SaleOrderItemComponentInput[];
};

export type SaleOrderPaymentInput = {
  method: string;
  amount: number;
  bankAccountId?: string;
  date?: string;
  operationNumber?: string;
  note?: string;
};

export type CreateSaleOrderDto = {
  workflowId: string;
  warehouseId: string;
  clientId: string;
  agencyDetail?: string;
  sourceId?: string;
  scheduleDate: string;
  deliveryDate?: string;
  deliveryCost?: number;
  subTotal?: number;
  total?: number;
  note?: string;
  items: SaleOrderItemInput[];
  payments: SaleOrderPaymentInput[];
  currentState?:string | null;
};

export type CreateSaleOrderResponse = {
  orderId: string;
  serie: string;
  correlative: number;
  workflowId: string | null;
  currentStateId: string | null;
};

export type SaleOrderJsonImportRow = {
  workflowName?: string;
  productName?: string;
  orderDate?: string;
  deliveryDate?: string;
  departmentName: string;
  provinceName: string;
  districtName: string;
  recipientName: string;
  address?: string;
  deliveryNote?: string;
  phone: string;
  couponCode?: string;
  productCodes: string;
  quantity?: number;
  total: number;
  advance?: number;
  codAmount?: number;
  internalNote?: string;
  confirmedBy?: string;
};

export type SaleOrderJsonImportPreviewResponse = {
  totalRows: number;
  processedRows: number;
  importedRows: number;
  failedRows: number;
  rows: Array<{
    rowNumber: number;
    clientId: string;
    sourceId: string;
    saleOrderId: string;
    skus: Array<{
      productId: string;
      skuId: string;
      skuName: string;
      customSku: string;
      quantity: number;
    }>;
  }>;
  errors: Array<{
    rowNumber: number;
    message: string;
  }>;
};

export type SaleOrderPaymentStatus = "PAID" | "PENDING";

export type SaleOrderPayment = {
  id: string;
  bankAccount: { id: string; name: string; number?: string | null } | null;
  date: string;
  method: string;
  operationNumber: string | null;
  amount: number;
  note: string | null;
  createdAt: string;
};

export type SaleOrder = {
  id: string;
  serie: string | null;
  correlative: number | null;
  client: { 
    id: string;
    type: ClientType;
    docType: ClientDocType;
    fullName: string;
    docNumber: string;
    reference?: string,
    count?:number,
    mainPhone?: string | null; 
    departmentId: string;
    provinceId: string;
    districtId: string;
    department?: {
      id: string;
      name: string;
    } | null;
    province?: {
      id: string;
      name: string;
      departmentId: string;
    } | null;
    district?: {
      id: string;
      name: string;
      provinceId: string;
    } | null;
    isActive:boolean;
   } | null;
  warehouse: { id: string; name: string } | null;
  source: { id: string; name: string; detail?: string | null } | null;
  createdBy: { id: string; name: string; email: string } | null;
  scheduleDate: string | null;
  deliveryDate: string | null;
  workflowId: string | null;
  currentStateId: string | null;
  workflow: { id: string; name: string; description: string | null; isActive: boolean } | null;
  currentState: {
    id: string;
    name: string;
    code: string;
    color: string;
    isInitial: boolean;
    isFinal: boolean;
    isActive: boolean;
  } | null;
  invoiceSend: boolean;
  subTotal: number;
  deliveryCost: number;
  total: number;
  note: string | null;
  agencyDetail: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  totalPaid: number;
  pendingAmount: number;
  paymentStatus: SaleOrderPaymentStatus;
  payments: SaleOrderPayment[];
  items?: SaleOrderItemInput[];
};

export type SaleOrderListResponse = {
  items: SaleOrder[];
  total: number;
  page: number;
  limit: number;
};

export type SaleOrderSearchOption = {
  id?: string;
  saleOrderStateId?: string;
  workflowId?: string;
  value?: string;
  label: string;
  keywords?: string[];
};

export type SaleOrderSearchRuleMode = "include" | "exclude";

export type SaleOrderSearchRule = {
  field:
    | "number"
    | "clientId"
    | "warehouseId"
    | "paymentStatus"
    | "workflowId"
    | "saleOrderStateId"
    | "scheduleDate"
    | "deliveryDate";
  operator:
    | "in"
    | "contains"
    | "eq"
    | "on"
    | "before"
    | "after"
    | "between"
    | "onOrBefore"
    | "onOrAfter";
  mode?: SaleOrderSearchRuleMode;
  value?: string;
  values?: string[];
  range?: { start?: string; end?: string };
};

export type SaleOrderSearchField = SaleOrderSearchRule["field"];

export type SaleOrderSearchSnapshot = {
  q?: string;
  filters: SaleOrderSearchRule[];
};

export type SaleOrderRecentSearch = {
  recentId: string;
  label: string;
  snapshot: SaleOrderSearchSnapshot;
  lastUsedAt: string;
};

export type SaleOrderSavedMetric = {
  metricId: string;
  name: string;
  label: string;
  snapshot: SaleOrderSearchSnapshot;
  updatedAt: string;
};

export type SaleOrderSearchStateResponse = {
  recent: SaleOrderRecentSearch[];
  saved: SaleOrderSavedMetric[];
  catalogs: {
    clients: SaleOrderSearchOption[];
    warehouses: SaleOrderSearchOption[];
    paymentStatuses: SaleOrderSearchOption[];
    workflows: SaleOrderSearchOption[];
    states: SaleOrderSearchOption[];
  };
};

export type SaleOrderStatisticsParams = {
  q?: string;
  filters?: SaleOrderSearchRule[];
  includeCancelled?: boolean;
};

export type SaleOrderStatisticsResponse = {
  byWorkflow: Array<{
    id: string | null;
    label: string;
    count: number;
  }>;
  byState: Array<{
    id: string | null;
    label: string;
    color: string | null;
    count: number;
  }>;
  byClientType: Array<{
    type: "NEW" | "LAGGING" | "REPURCHASE" | "UNDEFINED";
    label: string;
    count: number;
  }>;
  totals: {
    orders: number;
    total: number;
    collected: number;
    pending: number;
    deliveryCostSum: number;
  };
};
export enum ClientType {
  NEW = "NEW",
  LAGGING = "LAGGING",
  REPURCHASE = "REPURCHASE",
  UNDEFINED = "UNDEFINED",
}


