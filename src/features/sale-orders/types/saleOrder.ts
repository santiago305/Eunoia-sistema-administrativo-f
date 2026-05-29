export type DeliveryType = "CONTRA_ENTREGA" | "ABONADO_ENVIO";

export type SaleOrderAgendaStatus = "COORDINATED" | "PROGRAMMED" | "CANCELED";

export type SaleOrderDeliveryStatus = "WAITING" | "IN_PROGRESS" | "DELIVERED" | "CANCELED";

export type SaleOrderItemComponentInput = {
  skuId?: string;
  sku?: {
    id?: string;
  };
  quantity: number;
  unitPrice: number;
  total: number;
  referencePackItemId?: string;
};

export type SaleOrderItemInput = {
  quantity: number;
  unitPrice: number;
  total: number;
  description: string;
  referencePackId?: string;
  components?: SaleOrderItemComponentInput[];
};

export enum SaleOrderDeliveryType {
  CONTRA_ENTREGA = "CONTRA_ENTREGA",
  ABONADO_ENVIO = "ABONADO_ENVIO",
}

export type SaleOrderPaymentInput = {
  method: string;
  amount: number;
  bankAccountId?: string;
  date?: string;
  operationNumber?: string;
  note?: string;
};

export type CreateSaleOrderDto = {
  warehouseId: string;
  clientId: string;
  agencyDetail?: string;
  sourceId?: string;
  scheduleDate: string;
  deliveryDate?: string;
  deliveryType?: DeliveryType;
  deliveryCost?: number;
  subTotal?: number;
  total?: number;
  note?: string;
  items: SaleOrderItemInput[];
  payments: SaleOrderPaymentInput[];
};

export type CreateSaleOrderResponse = {
  orderId: string;
  serie: string;
  correlative: number;
  agendaStatus: string;
  deliveryStatus: string | null;
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
  client: { id: string; type: ClientType; fullName: string; docNumber?: string | null; reference?: string | null, count?:number } | null;
  warehouse: { id: string; name: string } | null;
  source: { id: string; name: string; detail?: string | null } | null;
  createdBy: { id: string; name: string; email: string } | null;
  scheduleDate: string | null;
  deliveryDate: string | null;
  deliveryType: DeliveryType | null;
  agendaStatus: SaleOrderAgendaStatus;
  deliveryStatus: SaleOrderDeliveryStatus | null;
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
  id: string;
  label: string;
  keywords?: string[];
};

export type SaleOrderSearchRuleMode = "include" | "exclude";

export type SaleOrderSearchRule = {
  field:
    | "number"
    | "clientId"
    | "warehouseId"
    | "agendaStatus"
    | "deliveryStatus"
    | "deliveryType"
    | "paymentStatus"
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
    agendaStatuses: SaleOrderSearchOption[];
    deliveryStatuses: SaleOrderSearchOption[];
    deliveryTypes: SaleOrderSearchOption[];
    paymentStatuses: SaleOrderSearchOption[];
  };
};
export enum DeliveryTypeEnum {
  CONTRA_ENTREGA = "CONTRA_ENTREGA",
  ABONADO_ENVIO = "ABONADO_ENVIO",
}
export enum ClientType {
  NEW = "NEW",
  LAGGING = "LAGGING",
  REPURCHASE = "REPURCHASE",
  UNDEFINED = "UNDEFINED",
}

export enum DeliveryStatus {
  IN_PROGRESS = "IN_PROGRESS",
  DELIVERED = "DELIVERED",
  CANCELED = "CANCELED",
  WAITING = "WAITING",
}

export enum AgendaStatus {
  COORDINATED = "COORDINATED",
  PROGRAMMED = "PROGRAMMED",
  CANCELED = "CANCELED",
}

