import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { SaleOrderCard } from "./SaleOrderCard";

type Props = {
  orders: SaleOrder[];
  selectedId?: string | null;
  loading?: boolean;
  onSelect: (order: SaleOrder) => void;
  onOpenDetail: (order: SaleOrder) => void;
  onEditOrder: (order: SaleOrder) => void;
  onOpenPdf: (order: SaleOrder) => void;
  onOpenPayments: (order: SaleOrder) => void;
  onOrderChanged: (orderId: string) => void | Promise<void>;
};

export function SaleOrdersCardsList({
  orders,
  selectedId,
  loading,
  onSelect,
  onOpenDetail,
  onEditOrder,
  onOpenPdf,
  onOpenPayments,
  onOrderChanged,
}: Props) {
  if (loading) {
    return (
      <div className="divide-y divide-zinc-100">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-[92px] animate-pulse bg-zinc-50"
          />
        ))}
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="flex h-full min-h-[360px] w-full items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-sm bg-zinc-50 text-zinc-400 ring-1 ring-zinc-100">
            SO
          </div>
          <p className="mt-4 text-sm font-semibold text-zinc-950">No hay pedidos para mostrar</p>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Cambia los filtros o limpia la búsqueda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-200">
      {orders.map((order) => (
        <SaleOrderCard
          key={order.id}
          order={order}
          selected={selectedId === order.id}
          onSelect={onSelect}
          onOpenDetail={onOpenDetail}
          onEdit={onEditOrder}
          onOpenPdf={onOpenPdf}
          onOpenPayments={onOpenPayments}
          onOrderChanged={onOrderChanged}
        />
      ))}
    </div>
  );
}
