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
  const deliveryCost = Number(order.deliveryCost ?? 0);
  const clientTypeBadge = getClientTypeBadge(
  order.client?.type,
  order.client?.count,
);

const pendingAmount = Number(order.pendingAmount ?? 0);
const isPaid = pendingAmount <= 0;


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
        <span className="flex w-full items-start justify-between gap-3">
          <span className="block min-w-0 flex-1 truncate pt-0.5 text-sm font-medium text-zinc-900">
            {code}
          </span>

          <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <span
              className="max-w-[118px] shrink-0 truncate rounded-sm px-2 py-0.5 text-[11px] font-medium text-white ring-1 ring-black/5"
              style={{ backgroundColor: stateColor }}
            >
              {stateName}
            </span>

            <span
              className="max-w-[118px] shrink-0 truncate rounded-sm px-2 py-0.5 text-[11px] font-medium text-white ring-1 ring-black/5"
              style={{
                backgroundColor: order.invoiceSend ? "#16a34a" : "#FCB70A",
              }}
            >
              {order.invoiceSend ? "Comp. Env" : "Comp. Pend"}
            </span>

            <span
              className="max-w-[118px] shrink-0 truncate rounded-sm px-2 py-0.5 text-[11px] font-medium text-white ring-1 ring-black/5"
              style={{
                backgroundColor: isPaid ? "#16a34a" : "#DB1616",
              }}
            >
              {isPaid ? "Pagado" : "Debe"}
            </span>
          </span>
        </span>
        <span className="flex w-full min-w-0 items-start gap-2 rounded-lg bg-zinc-50 p-3 shadow-inner">
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
          <span className="flex shrink-0 items-center gap-1.5">
            {order.workflow?.name && (
              <span className="max-w-[110px] truncate rounded-sm px-2 py-1 text-[10px] font-semibold 
              text-zinc-700 bg-amber-200 shadow-[inset_0_1px_4px_rgba(245,158,11,0.25)]
              ">
                {order.workflow.name}
              </span>
            )}
            <span
              className={cn(
                "shrink-0 rounded-sm px-2 py-1 text-[11px] font-semibold",
                clientTypeBadge.className,
              )}
            >
              {clientTypeBadge.label}
            </span>
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span>
              Agenda:{" "}
              <span className="font-medium text-zinc-700">
                {order.scheduleDate ?? "-"}
              </span>
            </span>
          </span>

          <span className="flex items-center gap-1.5">
            <Truck className="h-4 w-4 shrink-0" />
            <span>
              Entrega:{" "}
              <span className="font-medium text-zinc-700">
                {order.deliveryDate ?? "-"}
              </span>
            </span>
          </span>
        </span>
        <span className="grid grid-cols-3 gap-2">
          <span className="min-w-0 rounded-lg bg-zinc-50 px-2 py-1.5 shadow-inner">
            <span className="block truncate text-[10px] font-medium text-zinc-400">
              Total
            </span>
            <span className="mt-0.5 block truncate text-[12px] font-semibold tabular-nums text-zinc-800">
              {formatMoney(order.total ?? 0)}
            </span>
            {deliveryCost > 0 && (
              <span className="mt-1 flex min-w-0 items-center gap-1 text-[11px] font-medium text-purple-600">
                <Truck className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {formatMoney(deliveryCost)}
                </span>
              </span>
            )}
          </span>
          <span className="min-w-0 rounded-lg bg-emerald-50/60 px-2 py-1.5 shadow-[inset_0_1px_4px_rgba(22,163,74,0.22)]">
            <span className="block truncate text-[10px] font-medium text-emerald-600">
              Pagado
            </span>
            <span className="mt-0.5 block truncate text-[12px] font-semibold tabular-nums text-emerald-700">
              {formatMoney(order.totalPaid ?? 0)}
            </span>
            {order.totalPaid > order.total && (
              <span className="mt-1 flex min-w-0 items-center gap-1 text-[11px] font-medium text-zinc-600">
                <span className="truncate">
                  exc: {formatMoney(order.totalPaid - order.total)}
                </span>
              </span>
            )}
          </span>
          <span
            className={cn(
              "min-w-0 rounded-lg px-2 py-1.5",
              isPaid
                ? "bg-green-50/60 shadow-[inset_0_1px_4px_rgba(22,163,74,0.22)]"
                : "bg-red-50/60 shadow-[inset_0_1px_4px_rgba(220,38,38,0.20)]",
            )}
          >
            <span
              className={cn(
                "block truncate text-[10px] font-medium",
                isPaid ? "text-green-600" : "text-red-500",
              )}
            >
              Pendiente
            </span>

            <span
              className={cn(
                "mt-0.5 block truncate text-[12px] font-semibold tabular-nums",
                isPaid ? "text-green-700" : "text-red-600",
              )}
            >
              {formatMoney(pendingAmount)}
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}
