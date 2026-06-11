import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import type { SaleOrderItemInput } from "@/features/sale-orders/types/saleOrder";
import { SaleOrderItemComponentsStockModal } from "@/features/sale-orders/components/SaleOrderItemComponentsStockModal";
import { SaleOrderWorkflowPanel } from "@/features/sale-orders/components/SaleOrderWorkflowPanel";

type Props = {
  open: boolean;
  order: SaleOrder | null;
  onClose: () => void;
  onOrderChanged: () => void | Promise<void>;
};

const DASH = "\u2014";

const formatMoney = (value: number) => {
  try {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
  } catch {
    return `S/ ${(Number(value) || 0).toFixed(2)}`;
  }
};

const formatDate = (value?: string | null) => (value ? value : DASH);

const formatClientLabel = (client?: { fullName: string; docNumber?: string | null; reference?: string | null } | null) => {
  if (!client) return DASH;
  const docOrRef = (client.docNumber ?? client.reference ?? "").trim();
  return docOrRef ? `${client.fullName} (${docOrRef})` : client.fullName;
};

export function SaleOrderDetailsModal({ open, order, onClose, onOrderChanged }: Props) {
  const title = useMemo(() => {
    if (!order) return "Detalle de pedido";
    const correlative = order.correlative ?? 0;
    const serie = order.serie ?? DASH;
    return `${serie}-${correlative}`;
  }, [order]);

  const items = order?.items ?? [];
  const [openItemDetail, setOpenItemDetail] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SaleOrderItemInput | null>(null);

  useEffect(() => {
    if (!open) {
      setOpenItemDetail(false);
      setSelectedItem(null);
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-4xl" bodyClassName="p-4">
      {!order ? (
        <div className="text-sm text-black/60">No hay pedido seleccionado.</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-black/10 bg-white p-3 text-sm sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/45">Cliente</div>
              <div className="mt-0.5 truncate text-[13px] font-semibold text-black/80">{formatClientLabel(order.client)}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/45">Workflow</div>
              <div className="mt-0.5 text-[13px] font-semibold text-black/80">{order.workflow?.name ?? "Sin workflow"}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/45">Estado actual</div>
              <div className="mt-1">
                <span
                  className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset"
                  style={{
                    color: order.currentState?.color ?? "#475569",
                    backgroundColor: `${order.currentState?.color ?? "#64748b"}18`,
                  }}
                >
                  {order.currentState?.name ?? "Sin estado"}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/45">Almacén</div>
              <div className="mt-0.5 truncate text-[13px] font-semibold text-black/80">{order.warehouse?.name ?? DASH}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/45">Agenda</div>
              <div className="mt-0.5 text-[13px] font-semibold text-black/80 tabular-nums">{formatDate(order.scheduleDate)}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/45">Entrega</div>
              <div className="mt-0.5 text-[13px] font-semibold text-black/80 tabular-nums">{formatDate(order.deliveryDate)}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/45">Total</div>
              <div className="mt-0.5 text-[13px] font-semibold text-black/80 tabular-nums">{formatMoney(order.total ?? 0)}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/45">Estado pago</div>
              <div className="mt-1">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                    order.paymentStatus === "PAID"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-amber-50 text-amber-700 ring-amber-200"
                  }`}
                >
                  {order.paymentStatus === "PAID" ? "PAGADO" : "PENDIENTE"}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/45">Factura</div>
              <div className="mt-0.5 text-[13px] font-semibold text-black/80">
                {order.invoiceSend ? "Factura enviada" : "Pendiente de envio"}
              </div>
            </div>
          </div>

          <SaleOrderWorkflowPanel
            saleOrderId={order.id}
            workflowId={order.workflowId}
            onOrderChanged={onOrderChanged}
          />
          

          <div className="rounded-xl border border-black/10 overflow-hidden">
            <div className="bg-black/[0.02] px-3 py-2 text-xs font-semibold text-black/70">Items del pedido</div>
            <div className="scroll-area scrollbar-panel max-h-[45vh] overflow-auto">
              {items.length === 0 ? (
                <div className="p-4 text-sm text-black/50">Sin items.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-black/10 text-[11px] text-black/45">
                      <th className="px-3 py-2 text-left font-medium">Descripción</th>
                      <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                      <th className="px-3 py-2 text-right font-medium">Precio unit.</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 text-right font-medium">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={`item-${index}`} className="border-b border-black/5 last:border-b-0">
                        <td className="px-3 py-2">{item.description ?? DASH}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{Number(item.quantity) || 0}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(Number(item.unitPrice) || 0)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(Number(item.total) || 0)}</td>
                        <td className="px-3 py-2 text-right">
                          <SystemButton
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(item);
                              setOpenItemDetail(true);
                            }}
                          >
                            Detalle
                          </SystemButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      

      <SaleOrderItemComponentsStockModal
        open={openItemDetail}
        onClose={() => setOpenItemDetail(false)}
        item={selectedItem}
        showStock={false}
      />
    </Modal>
  );
}
