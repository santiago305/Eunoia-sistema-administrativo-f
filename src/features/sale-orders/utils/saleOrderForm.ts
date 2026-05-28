import type { CreateSaleOrderDto, SaleOrderItemInput } from "@/features/sale-orders/types/saleOrder";
import { toLocalDateKey } from "@/shared/utils/functionPurchases";

export const buildEmptySaleOrderItem = (): SaleOrderItemInput => ({
  quantity: 1,
  unitPrice: 0,
  total: 0,
  description: "",
  referencePackId: undefined,
  components: [],
});

export const buildEmptySaleOrderForm = (): CreateSaleOrderDto => ({
  warehouseId: "",
  clientId: "",
  agencyDetail: undefined,
  sourceId: undefined,
  scheduleDate: toLocalDateKey(new Date()),
  deliveryDate: undefined,
  deliveryType: undefined,
  note: "",
  items: [],
  payments: [],
});
