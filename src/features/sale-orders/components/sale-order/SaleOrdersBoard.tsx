import type { ReactNode } from "react";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { SaleOrdersCardsList } from "./SaleOrdersCardsList";
import type { SaleOrderStatisticsResponse } from "@/features/sale-orders/types/saleOrder";
import { SaleOrderStatisticsPanel } from "../statistics/SaleOrderStatisticsPanel";

type Props = {
  orders: SaleOrder[];
  selectedOrder: SaleOrder | null;
  loading: boolean;
  onSelectOrder: (order: SaleOrder) => void;
  onOpenDetail: (order: SaleOrder) => void;
  onEditOrder: (order: SaleOrder) => void;
  onOpenPdf: (order: SaleOrder) => void;
  onOpenPayments: (order: SaleOrder) => void;
  onOrderChanged: (orderId: string) => void | Promise<void>;
  statistics: SaleOrderStatisticsResponse | null;
  statisticsLoading: boolean;
  statisticsError: string | null;
  listFooter?: ReactNode;
};

export function SaleOrdersBoard({
  orders,
  selectedOrder,
  loading,
  onSelectOrder,
  onOpenDetail,
  onEditOrder,
  onOpenPdf,
  onOpenPayments,
  onOrderChanged,
  statistics,
  statisticsLoading,
  statisticsError,
  listFooter,
}: Props) {
  return (
    <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-0 
    lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[440px_minmax(0,1fr)]">
      <aside
        aria-label="Listado de pedidos"
        className="h-full w-full border-b border-zinc-100 lg:min-h-0 lg:border-b-0 lg:border-r"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-auto pr-0 lg:pr-4 scroll-area">
            <SaleOrdersCardsList
              orders={orders}
              loading={loading}
              selectedId={selectedOrder?.id}
              onSelect={onSelectOrder}
              onOpenDetail={onOpenDetail}
              onEditOrder={onEditOrder}
              onOpenPdf={onOpenPdf}
              onOpenPayments={onOpenPayments}
              onOrderChanged={onOrderChanged}
            />
          </div>
          {listFooter ? <div className="shrink-0">{listFooter}</div> : null}
        </div>
      </aside>

      <main className="min-h-0 min-w-0 lg:pl-5">
        <div className="flex min-h-full flex-col">
          <SaleOrderStatisticsPanel
            statistics={statistics}
            loading={statisticsLoading}
            error={statisticsError}
            compact={false}
            showTotals={true}
          />
        </div>
      </main>
    </div>
  );
}
