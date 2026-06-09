import { CalendarDays, Phone, Truck } from "lucide-react";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { cn } from "@/shared/lib/utils";
import { getClientTypeBadge } from "../../utils/saleOrderForm";

type Props = {
  order: SaleOrder;
  selected: boolean;
  onClick: () => void;
};

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(Number(value ?? 0));
}

export function SaleOrderCard({ order, selected, onClick }: Props) {
  const code = `${order.serie ?? "-"}-${order.correlative ?? "-"}`;
  const stateName = order.currentState?.name ?? "Sin estado";
  const stateColor = order.currentState?.color ?? "#64748b";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full min-w-0 items-start gap-3 px-3 py-3 text-left transition-colors duration-150 focus:outline-none focus-visible:bg-zinc-50",
        selected ? "bg-primary/[0.02]" : "bg-white hover:bg-zinc-20",
      )}
    >
      {selected ? <span className="absolute left-0 top-3 h-[calc(100%-1.5rem)] w-1 rounded-sm bg-primary" /> : null}

      <span className="min-w-0 flex-1 space-y-3">
        <span className="flex w-full items-start justify-between gap-2 ">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-zinc-900 mt-1">
              {code}
            </span>
            <span className="mt-1.5 flex min-w-90 items-start gap-2 rounded-md bg-zinc-50 px-2 py-1.5 ring-1 ring-zinc-100">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-zinc-700">
                  {order.client?.fullName ?? "Sin cliente"}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                  DNI/RUC: {order.client?.docNumber ?? "-"}
                </span>
                <span className="mt-0.5 block truncate text-[11px] font-medium text-zinc-600">
                  {order.client?.mainPhone ?? "Sin teléfono"}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-sm px-2 py-3 mt-1 text-[12px] font-semibold ring-1 ring-inset",
                  getClientTypeBadge(order.client?.type, order.client?.count).className,
                )}
              >
                {getClientTypeBadge(order.client?.type, order.client?.count).label}
              </span>
            </span>
          </span>
        <span
            className="max-w-[118px] shrink-0 truncate rounded-sm px-2 py-0.5 text-[11px] font-medium text-white ring-1 ring-black/5"
            style={{ backgroundColor: stateColor }}
        >
          {stateName}
        </span>
        <span
            className="max-w-[118px] shrink-0 truncate rounded-sm px-2 py-0.5 text-[11px] font-medium text-white ring-1 ring-black/5"
            style={{ backgroundColor: order.invoiceSend ? "#16a34a" : "#FCB70A" }}
        >
          {order.invoiceSend ? "Comp. Env" : "Comp. Pend"}
        </span>
        <span
            className="max-w-[118px] shrink-0 truncate rounded-sm px-2 py-0.5 text-[11px] font-medium text-white ring-1 ring-black/5"
            style={{ backgroundColor: order.pendingAmount === 0 ?  "#16a34a" : "#DB1616" }}
        >
          {order.pendingAmount === 0 ? "Pagado" : "Debe"}
        </span>
        </span>

        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            Agenda: {order.scheduleDate ?? "-"}
          </span>

          <span className="flex items-center gap-1">
            <Truck className="h-3 w-3" />
            Entrega: {order.deliveryDate ?? "-"}
          </span>
        </span>
        <span className="mt-2 grid grid-cols-3 gap-1.5">
          <span className="min-w-0 rounded-md bg-zinc-50 px-2 py-1.5 ring-1 ring-zinc-100">
            <span className="block truncate text-[10px] font-medium text-zinc-400">
              Total
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-semibold tabular-nums text-zinc-800">
              {formatMoney(order.total ?? 0)}
            </span>
          </span>
          <span className="min-w-0 rounded-md bg-zinc-50 px-2 py-1.5 ring-1 ring-zinc-100">
            <span className="block truncate text-[10px] font-medium text-zinc-400">
              Pagado
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-semibold tabular-nums text-emerald-700">
              {formatMoney(order.totalPaid ?? 0)}
            </span>
          </span>

          <span className="min-w-0 rounded-md bg-zinc-50 px-2 py-1.5 ring-1 ring-zinc-100">
            <span className="block truncate text-[10px] font-medium text-zinc-400">
              Pend.
            </span>
            <span
              className={cn(
                "mt-0.5 block truncate text-[11px] font-semibold tabular-nums",
                order.pendingAmount === 0 ? "text-green-600" : "text-red-600",
              )}
            >
              {formatMoney(order.pendingAmount ?? 0)}
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}
