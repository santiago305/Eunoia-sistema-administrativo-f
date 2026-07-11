import { ClientDocType } from "@/features/clients/types/client";
import type {
  CreateClientBody,
  UpdateClientBody,
} from "@/features/clients/types/clientApi";

export enum SaleOrderAutomaticWorkflowTriggerEnum {
  SALE_ORDER_CREATED = "sale-order-created",
  SALE_ORDER_IMPORTED = "sale-order-imported",
  SALE_ORDER_UPDATED = "sale-order-updated",
  WORKFLOW_STATE_CHANGED = "workflow-state-changed",
  WORKFLOW_ASSIGNED = "workflow-assigned",
  SALE_ORDER_CANCELLED = "sale-order-cancelled",
  DELIVERY_CONFIRMED = "delivery-confirmed",
  PAYMENT_CREATED = "payment-created",
  PAYMENT_DELETED = "payment-deleted",
  CLIENT_UPDATED = "client-updated",
  INVENTORY_UPDATED = "inventory-updated",
}

export enum SaleOrderRealtimeSourceEnum {
  SALE_ORDER_CREATED = "sale-order-created",
  SALE_ORDER_IMPORTED = "sale-order-imported",
  SALE_ORDER_UPDATED = "sale-order-updated",
  WORKFLOW_STATE_CHANGED = "workflow-state-changed",
  WORKFLOW_ASSIGNED = "workflow-assigned",
  SALE_ORDER_CANCELLED = "sale-order-cancelled",
  DELIVERY_CONFIRMED = "delivery-confirmed",
  PAYMENT_CREATED = "payment-created",
  PAYMENT_DELETED = "payment-deleted",
  AUTOMATIC_WORKFLOW = "automatic-workflow",
}

export type SaleOrderRealtimeSource =
  | "sale-order-created"
  | "sale-order-imported"
  | "sale-order-updated"
  | "workflow-state-changed"
  | "workflow-assigned"
  | "sale-order-cancelled"
  | "delivery-confirmed"
  | "payment-created"
  | "payment-deleted"
  | "automatic-workflow";

export type SaleOrderAutomaticWorkflowTrigger =
  | "sale-order-created"
  | "sale-order-imported"
  | "sale-order-updated"
  | "workflow-state-changed"
  | "workflow-assigned"
  | "sale-order-cancelled"
  | "delivery-confirmed"
  | "payment-created"
  | "payment-deleted"
  | "client-updated"
  | "inventory-updated";

export type SaleOrdersUpdatedPayload = {
  updated: number;
  saleOrderIds: string[];
  source: SaleOrderRealtimeSource;
  trigger?: SaleOrderAutomaticWorkflowTrigger;
  saleOrders?: SaleOrder[];
  statistics?: SaleOrderStatisticsResponse;
};

export type SaleOrderSkuSnapshot = {
  id: string;
  productId?: string | null;
  backendSku: string;
  customSku: string | null;
  name: string;
  barcode: string | null;
  image: string | null;
  price?: number;
  cost?: number;
  isSellable?: boolean;
  isPurchasable?: boolean;
  isManufacturable?: boolean;
  isStockTracked?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
};

export type SaleOrderSkuUnit = {
  id: string;
  name: string;
  code: string;
};

export type SaleOrderSkuAttribute = {
  code: string;
  name: string | null;
  value: string;
};

export type SaleOrderItemComponentInput = {
  id?: string;
  saleOrderItemId?: string;
  skuId?: string;
  skuLabel?: string;
  skuCode?: string;
  skuImage?: string | null;
  sku?: SaleOrderSkuSnapshot;
  unit?: SaleOrderSkuUnit | null;
  attributes?: SaleOrderSkuAttribute[];
  stockItemId?: string | null;
  quantity: number;
  basePrice?: number;
  unitPrice: number;
  total: number;
  referencePackItemId?: string;
};

export type SaleOrderItemInput = {
  id?: string;
  quantity: number;
  basePrice?: number;
  unitPrice: number;
  total: number;
  description: string;
  referencePackId?: string;
  components?: SaleOrderItemComponentInput[];
};

export type SaleOrderItemComponentCommand = {
  skuId: string;
  quantity: number;
  basePrice?: number;
  unitPrice: number;
  total: number;
  referencePackItemId?: string;
};

export type SaleOrderItemCommand = Omit<SaleOrderItemInput, "components"> & {
  components?: SaleOrderItemComponentCommand[];
};

export type SaleOrderPaymentInput = {
  id?: string;
  clientKey?: string;
  method: string;
  amount: number;
  bankAccountId?: string;
  date?: string;
  operationNumber?: string;
  note?: string;
};

export type SaleOrderClientCommand =
  | { mode: "existing"; id: string }
  | { mode: "create"; data: CreateClientBody }
  | { mode: "update"; id: string; data: UpdateClientBody };

export type SaleOrderAttachmentType =
  | "SHIPPING_PHOTO"
  | "PAYMENT_PROOF";

export type SaleOrderAttachment = {
  id: string;
  saleOrderPaymentId: string | null;
  type: SaleOrderAttachmentType;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  note: string | null;
  createdAt: string;
};

export type SaleOrderEditPolicy = {
  stockStatus: "NONE" | "RESERVED" | "REVERTED" | "CONSUMED";
  productsEditable: boolean;
  warehouseEditable: boolean;
  isFinal?: boolean;
  reason: string | null;
};

export type UnifiedSaleOrderPaymentInput = {
  id?: string;
  clientKey: string;
  bankAccountId?: string | null;
  method: string;
  amount: number;
  date?: string;
  operationNumber?: string | null;
  note?: string | null;
};

export type SaveSaleOrderWithClientDto = {
  client: SaleOrderClientCommand;
  workflowId: string;
  warehouseId?: string;
  agencyDetail?: string;
  sourceId?: string;
  scheduleDate?: string;
  deliveryDate?: string;
  deliveryCost?: number;
  discount?: number;
  note?: string;
  advertisingCode?: string | null;
  observation?: string | null;
  sendDate?: string | null;
  sendCode?: string | null;
  sendAddress?: string | null;
  assignedBy?: string | null;
  items: SaleOrderItemCommand[];
  payments?: UnifiedSaleOrderPaymentInput[];
  removedAttachmentIds?: string[];
};

export type SaveSaleOrderWithClientFiles = {
  shippingPhoto?: File | null;
  paymentPhotos?: Map<string, File> | Record<string, File>;
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
  discount?: number;
  subTotal?: number;
  total?: number;
  note?: string;
  advertisingCode?: string | null;
  observation?: string | null;
  items: SaleOrderItemInput[];
  payments: SaleOrderPaymentInput[];
  currentState?:string | null;
};

export type CreateSaleOrderCommandDto = Omit<CreateSaleOrderDto, "items"> & {
  items: SaleOrderItemCommand[];
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
  clientKey?: string;
  bankAccount: { id: string; name: string; number?: string | null } | null;
  date: string;
  method: string;
  operationNumber: string | null;
  amount: number;
  note: string | null;
  paymentPhoto?: string | null;
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
    address?: string | null;
    reference?: string,
    count?:number,
    mainPhone?: string | null; 
    telephones?: Array<{
      id: string;
      number: string;
      isMain: boolean;
      isActive: boolean;
    }>;
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
  discount?: number;
  total: number;
  note: string | null;
  advertisingCode?: string | null;
  observation?: string | null;
  agencySubsidiaryId?: string | null;
  sendDate?: string | null;
  sendPhoto?: string | null;
  sendCode?: string | null;
  sendAddress?: string | null;
  assignedBy?: { id: string; name: string; email: string } | null;
  agencyDetail?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  totalPaid: number;
  reserveBool?:boolean | null;
  pendingAmount: number;
  paymentStatus: SaleOrderPaymentStatus;
  payments: SaleOrderPayment[];
  attachments?: SaleOrderAttachment[];
  editPolicy?: SaleOrderEditPolicy;
  items?: SaleOrderItemInput[];
};

export type SaleOrderListResponse = {
  items: SaleOrder[];
  total: number;
  page: number;
  limit: number;
};

export type SaleOrderExportColumn = {
  key: string;
  label: string;
};

export type SaleOrderExportPreset = {
  metricId: string;
  name: string;
  snapshot?: {
    columns?: SaleOrderExportColumn[];
    useDateRange?: boolean;
  };
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
    | "deliveryDate"
    | "createdAt"
    | "advertisingCode"
    | "observation"
    | "bankAccountId"
    | "clientType"
    | "clientDepartmentId"
    | "clientProvinceId"
    | "clientDistrictId"
    | "clientPhone"
    | "agencyDetail"
    | "sourceId"
    | "invoiceStatus"
    | "createdBy"
    | "assignedBy";
  operator:
    | "in"
    | "contains"
    | "eq"
    | "on"
    | "before"
    | "after"
    | "between"
    | "onOrBefore"
    | "onOrAfter"
    | "inMonth"
    | "inWeek";
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
    bankAccounts: SaleOrderSearchOption[];
    clientTypes: SaleOrderSearchOption[];
    departments?: SaleOrderSearchOption[];
    provinces?: SaleOrderSearchOption[];
    districts?: SaleOrderSearchOption[];
    sources?: SaleOrderSearchOption[];
    invoiceStatuses?: SaleOrderSearchOption[];
    creators?: SaleOrderSearchOption[];
    assignees?: SaleOrderSearchOption[];
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
  byBankAccount: Array<{
    id: string | null;
    label: string;
    number: string | null;
    payments: number;
    collected: number;
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


