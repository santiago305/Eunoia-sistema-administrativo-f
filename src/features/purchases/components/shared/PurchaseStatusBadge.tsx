import { PurchaseOrderStatuses, type PurchaseOrderStatus } from "@/features/purchases/types/purchaseEnums";

const statusLabels: Record<string, string> = {
  [PurchaseOrderStatuses.DRAFT]: "Borrador",
  [PurchaseOrderStatuses.SENT]: "Enviado",
  [PurchaseOrderStatuses.PARTIAL]: "Parcial",
  [PurchaseOrderStatuses.PENDING_RECEIPT_CONFIRMATION]: "Pendiente confirmacion",
  [PurchaseOrderStatuses.RECEIVED]: "Recibido",
  [PurchaseOrderStatuses.CANCELLED]: "Cancelado",
};

const statusClasses: Record<string, string> = {
  [PurchaseOrderStatuses.DRAFT]: "bg-zinc-50 text-zinc-700 ring-zinc-200",
  [PurchaseOrderStatuses.SENT]: "bg-sky-50 text-sky-700 ring-sky-200",
  [PurchaseOrderStatuses.PARTIAL]: "bg-amber-50 text-amber-700 ring-amber-200",
  [PurchaseOrderStatuses.PENDING_RECEIPT_CONFIRMATION]: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  [PurchaseOrderStatuses.RECEIVED]: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  [PurchaseOrderStatuses.CANCELLED]: "bg-rose-50 text-rose-700 ring-rose-200",
};

type Props = {
  status?: PurchaseOrderStatus | string | null;
};

export function PurchaseStatusBadge({ status }: Props) {
  const key = status ?? "";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${statusClasses[key] ?? "bg-zinc-50 text-zinc-700 ring-zinc-200"}`}>
      {statusLabels[key] ?? (key || "-")}
    </span>
  );
}
