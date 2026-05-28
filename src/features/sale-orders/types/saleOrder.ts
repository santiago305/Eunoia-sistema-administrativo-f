export type DeliveryType = "CONTRA_ENTREGA" | "ABONADO_ENVIO";

export type SaleOrderItemComponentInput = {
  skuId: string;
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
