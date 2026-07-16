import type { PurchaseOrderItemEditOutput } from "@/features/purchases/types/itemPurchaseEdit";
import { purchaseItemTypeLabels } from "@/features/purchases/types/purchase-classification.types";

export type ReceptionLineState = {
  purchaseItemId: string;
  pendingQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  note: string;
};

type Props = {
  items: PurchaseOrderItemEditOutput[];
  lines: ReceptionLineState[];
  onLineChange: (purchaseItemId: string, patch: Partial<ReceptionLineState>) => void;
};

const itemLabel = (item: PurchaseOrderItemEditOutput) => {
  const sku = item.sku as { sku?: { name?: string | null }; name?: string | null } | null | undefined;
  const skuName = sku?.sku?.name ?? sku?.name;
  return item.serviceName || item.name || skuName || item.description || "Item de compra";
};

export function PurchaseReceptionTable({ items, lines, onLineChange }: Props) {
  const lineByItem = new Map(lines.map((line) => [line.purchaseItemId, line]));

  return (
    <div className="overflow-hidden rounded-sm border border-black/10 bg-white">
      <div className="grid grid-cols-[minmax(220px,1.7fr)_110px_110px_110px_110px_minmax(160px,1fr)] border-b border-black/10 bg-black/[0.02] px-3 py-2 text-[11px] font-semibold text-black/70 max-xl:hidden">
        <span>Item</span>
        <span>Pedido</span>
        <span>Pendiente</span>
        <span>Recibido</span>
        <span>Aceptado</span>
        <span>Nota</span>
      </div>
      <div className="divide-y divide-black/10">
        {items.map((item) => {
          const purchaseItemId = item.poItemId ?? "";
          const line = lineByItem.get(purchaseItemId);
          if (!line) return null;
          const affectsStock = item.affectsStock !== false;
          return (
            <div
              key={purchaseItemId}
              className="grid gap-3 px-3 py-3 text-xs xl:grid-cols-[minmax(220px,1.7fr)_110px_110px_110px_110px_minmax(160px,1fr)] xl:items-center"
            >
              <div>
                <p className="font-semibold text-black">{itemLabel(item)}</p>
                <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-black/55">
                  <span>{purchaseItemTypeLabels[item.itemType ?? "PRODUCT"]}</span>
                  <span>{affectsStock ? "Con stock" : "Sin stock"}</span>
                </div>
              </div>
              <div className="tabular-nums text-black/70">
                <span className="xl:hidden">Pedido: </span>
                {Number(item.quantity ?? 0).toFixed(3)}
              </div>
              <div className="tabular-nums text-black/70">
                <span className="xl:hidden">Pendiente: </span>
                {line.pendingQuantity.toFixed(3)}
              </div>
              <input
                type="number"
                min="0"
                step="0.001"
                className="h-10 rounded-sm border border-black/10 px-3 text-xs outline-none focus:border-black/30"
                value={line.receivedQuantity}
                onChange={(event) => {
                  const next = Number(event.target.value || 0);
                  onLineChange(purchaseItemId, {
                    receivedQuantity: next,
                    acceptedQuantity: next,
                    rejectedQuantity: 0,
                  });
                }}
              />
              <input
                type="number"
                min="0"
                step="0.001"
                className="h-10 rounded-sm border border-black/10 px-3 text-xs outline-none focus:border-black/30"
                value={line.acceptedQuantity}
                onChange={(event) => {
                  const acceptedQuantity = Number(event.target.value || 0);
                  onLineChange(purchaseItemId, {
                    acceptedQuantity,
                    rejectedQuantity: Math.max(0, line.receivedQuantity - acceptedQuantity),
                  });
                }}
              />
              <input
                className="h-10 rounded-sm border border-black/10 px-3 text-xs outline-none focus:border-black/30"
                value={line.note}
                onChange={(event) => onLineChange(purchaseItemId, { note: event.target.value })}
                placeholder="Observación"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
