import type { PurchaseOrderDetailOutput } from "@/features/purchases/types/itemPurchaseEdit";

type Props = {
  detail: PurchaseOrderDetailOutput;
};

const itemName = (item: NonNullable<PurchaseOrderDetailOutput["items"]>[number]) =>
  item.name || item.serviceName || item.description || item.sku?.sku?.name || item.sku?.sku?.customSku || item.sku?.sku?.backendSku || "Item";

export function PurchaseItemsTab({ detail }: Props) {
  const items = detail.items ?? [];

  return (
    <section className="overflow-hidden rounded-sm border border-black/10 bg-white">
      <div className="grid grid-cols-[1fr_96px_120px_120px] gap-3 border-b border-black/10 bg-black/[0.03] px-3 py-2 text-[11px] font-semibold uppercase text-black/55">
        <span>Item</span>
        <span className="text-right">Cantidad</span>
        <span className="text-right">Precio</span>
        <span className="text-right">Valor</span>
      </div>
      {items.length ? items.map((item, index) => (
        <div key={item.poItemId ?? index} className="grid grid-cols-[1fr_96px_120px_120px] gap-3 border-b border-black/5 px-3 py-2 text-sm last:border-b-0">
          <div className="min-w-0">
            <p className="truncate font-medium text-black">{itemName(item)}</p>
            <p className="text-xs text-black/50">{item.itemType ?? "PRODUCT"} · {item.unitBase || "und"}</p>
          </div>
          <span className="text-right tabular-nums text-black/70">{Number(item.quantity ?? 0).toLocaleString("es-PE")}</span>
          <span className="text-right tabular-nums text-black/70">{Number(item.unitPrice ?? 0).toFixed(2)}</span>
          <span className="text-right tabular-nums font-medium text-black">{Number(item.purchaseValue ?? 0).toFixed(2)}</span>
        </div>
      )) : (
        <div className="px-3 py-6 text-sm text-black/50">Sin items registrados.</div>
      )}
    </section>
  );
}
