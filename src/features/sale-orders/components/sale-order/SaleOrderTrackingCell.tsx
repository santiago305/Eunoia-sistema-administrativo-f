import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { cn } from "@/shared/lib/utils";

type Props = {
  order: Pick<SaleOrder, "preguide" | "prepared" | "trackingCapabilities">;
  variant?: "table" | "editor";
};

function TrackingStatus({
  active,
  activeLabel,
  inactiveLabel,
  variant,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  variant: NonNullable<Props["variant"]>;
}) {
  const label = active ? activeLabel : inactiveLabel;

  return (
    <span
      className={cn(
        "inline-flex items-center transition-colors duration-200",
        variant === "editor"
          ? "min-h-9 justify-center rounded-full border px-3 py-1.5 text-xs font-semibold"
          : "rounded-sm px-1.5 py-0.5 text-[9px] font-medium",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700",
      )}
      title={label}
    >
      {label}
    </span>
  );
}

export function SaleOrderTrackingCell({ order, variant = "table" }: Props) {
  return (
    <div className={cn(variant === "editor" ? "grid w-full grid-cols-2 gap-1.5" : "contents")}>
      {order.trackingCapabilities?.preguide === true && (
        <TrackingStatus
          active={order.preguide === true}
          activeLabel="Con preguía"
          inactiveLabel="Sin preguía"
          variant={variant}
        />
      )}
      {order.trackingCapabilities?.prepared === true && (
        <TrackingStatus
          active={order.prepared === true}
          activeLabel="Preparado"
          inactiveLabel="Sin preparar"
          variant={variant}
        />
      )}
    </div>
  );
}
