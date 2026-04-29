import { Boxes } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { ProductionStatus, type ProductionOrder } from "@/features/production/types/production";

type ProductionOrderDetailModalProps = {
  open: boolean;
  loading: boolean;
  order: ProductionOrder | null;
  onClose: () => void;
};

const statusLabels: Record<ProductionStatus, string> = {
  [ProductionStatus.DRAFT]: "Borrador",
  [ProductionStatus.IN_PROGRESS]: "En proceso",
  [ProductionStatus.PARTIAL]: "Parcial",
  [ProductionStatus.COMPLETED]: "Completado",
  [ProductionStatus.CANCELLED]: "Cancelado",
};

const statusStyles: Record<ProductionStatus, string> = {
  [ProductionStatus.DRAFT]: "bg-neutral-100 text-neutral-700",
  [ProductionStatus.IN_PROGRESS]: "bg-amber-100 text-amber-700",
  [ProductionStatus.PARTIAL]: "bg-sky-100 text-sky-700",
  [ProductionStatus.COMPLETED]: "bg-emerald-100 text-emerald-700",
  [ProductionStatus.CANCELLED]: "bg-rose-100 text-rose-700",
};

export function ProductionOrderDetailModal({
  open,
  loading,
  order,
  onClose,
}: ProductionOrderDetailModalProps) {
  const fromWarehouseLabel = order?.fromWarehouse?.name ?? order?.fromWarehouseId ?? "-";
  const toWarehouseLabel = order?.toWarehouse?.name ?? order?.toWarehouseId ?? "-";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de orden de producción"
      className="w-[min(36rem,calc(100vw-2rem))]"
      bodyClassName="p-0"
    >
      <div className="space-y-5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900">
              {order?.serie?.code ? `${order.serie.code} - ${order.correlative ?? ""}` : "-"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
              <span>
                <span className="text-neutral-400">Origen:</span> {fromWarehouseLabel}
              </span>
              <span>
                <span className="text-neutral-400">Destino:</span> {toWarehouseLabel}
              </span>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              order?.status ? statusStyles[order.status] ?? "bg-neutral-100 text-neutral-700" : "bg-neutral-100 text-neutral-700"
            }`}
          >
            {order?.status ? statusLabels[order.status] ?? order.status : "-"}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-neutral-500" />
            <div>
              <p className="text-sm font-medium text-neutral-900">Items producidos</p>
              <p className="text-xs text-neutral-500">
                {loading
                  ? "Cargando detalle..."
                  : `${order?.items?.length ?? 0} registrados en la orden`}
              </p>
            </div>
          </div>

          <div className="max-h-[18rem] divide-y divide-neutral-100 overflow-auto rounded-xl bg-neutral-50/70">
            {loading ? (
              <div className="px-4 py-3 text-sm text-neutral-500">Cargando items...</div>
            ) : order?.items?.length ? (
              order.items.map((item, index) => {
                const itemName =
                  item.finishedItem?.sku?.name ??
                  item.finishedItem?.variant?.productName ??
                  item.finishedItem?.product?.name ??
                  `Producto ${index + 1}`;

                return (
                  <div
                    key={item.id ?? item.itemId ?? `${item.finishedItemId}-${index}`}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{itemName}</p>
                    </div>

                    <div className="shrink-0 text-sm text-neutral-600">
                      <span className="font-medium text-neutral-900">{item.quantity}</span> unidades
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-3 text-sm text-neutral-500">
                Esta orden no tiene items para mostrar.
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}