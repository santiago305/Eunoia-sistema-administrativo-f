import { ClientType, type CreateSaleOrderDto, type SaleOrderItemInput } from "@/features/sale-orders/types/saleOrder";
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
  workflowId: "",
  warehouseId: "",
  clientId: "",
  agencyDetail: undefined,
  sourceId: undefined,
  scheduleDate: toLocalDateKey(new Date()),
  deliveryDate: undefined,
  note: "",
  items: [],
  payments: [],
});
export function getClientTypeBadge(
  type?: ClientType | null,
  count?: number | null,
) {
  const quantity = count ? ` (${count})` : "";

  if (type === ClientType.NEW) {
    return {
      label: `Nuevo${quantity}`,
      className:
        "bg-sky-50 text-sky-700 ring-sky-200 shadow-[inset_0_0_5px_rgba(14,165,233,0.22)]",
    };
  }

  if (type === ClientType.REPURCHASE) {
    return {
      label: `Recompra${quantity}`,
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 shadow-[inset_0_0_5px_rgba(16,185,129,0.22)]",
    };
  }

  if (type === ClientType.LAGGING) {
    return {
      label: `Rezagado${quantity}`,
      className:
        "bg-amber-50 text-amber-700 ring-amber-200 shadow-[inset_0_0_5px_rgba(245,158,11,0.24)]",
    };
  }

  return {
    label: `Sin definir${quantity}`,
    className:
      "bg-slate-50 text-slate-500 ring-slate-200 shadow-[inset_0_0_5px_rgba(100,116,139,0.18)]",
  };
}