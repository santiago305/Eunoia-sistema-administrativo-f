import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { SaleOrdersCardsList } from "./SaleOrdersCardsList";
import { SaleOrderDetailsPanel } from "./SaleOrderDetailsPanel";
import type { SaleOrderStatisticsResponse } from "@/features/sale-orders/types/saleOrder";
import { SaleOrderStatisticsPanel } from "../statistics/SaleOrderStatisticsPanel";

type Props = {
  orders: SaleOrder[];
  selectedOrder: SaleOrder | null;
  loading: boolean;
  onSelectOrder: (order: SaleOrder) => void;
  onEditOrder: (order: SaleOrder) => void;
  onOpenPdf: (order: SaleOrder) => void;
  onOpenPayments: (order: SaleOrder) => void;
  onOrderChanged: (orderId: string) => void | Promise<void>;
  statistics: SaleOrderStatisticsResponse | null;
  statisticsLoading: boolean;
  statisticsError: string | null;
};

export function SaleOrdersBoard({
  orders,
  selectedOrder,
  loading,
  onSelectOrder,
  onEditOrder,
  onOpenPdf,
  onOpenPayments,
  onOrderChanged,
  statistics,
  statisticsLoading,
  statisticsError,
}: Props) {
  return (
    <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-0 
    lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
      <aside className="h-full w-full border-b border-zinc-100 lg:min-h-0 lg:border-b-0 lg:border-r">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-100 py-3 pr-0 lg:pr-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-950">Lista de pedidos</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {loading ? "Cargando..." : `${orders.length} resultados`}
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto pr-0 lg:pr-4 scroll-area">
            <SaleOrdersCardsList
              orders={orders}
              loading={loading}
              selectedId={selectedOrder?.id}
              onSelect={onSelectOrder}
            />
          </div>
        </div>
      </aside>

      <main className="min-h-0 min-w-0 lg:pl-5">
        <div className="flex min-h-full flex-col">
          <SaleOrderStatisticsPanel
            statistics={statistics}
            loading={statisticsLoading}
            error={statisticsError}
            compact={selectedOrder !== null}
            showTotals={true}
          />
          {selectedOrder ? (
            <SaleOrderDetailsPanel
              key={`${selectedOrder.id}-${selectedOrder.updatedAt ?? ""}`}
              order={selectedOrder}
              onEdit={onEditOrder}
              onOpenPdf={onOpenPdf}
              onOpenPayments={onOpenPayments}
              onOrderChanged={onOrderChanged}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
