import { useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import type {
  SaleOrderSearchRule,
  SaleOrderSearchSnapshot,
} from "@/features/sale-orders/types/saleOrder";
import { SaleOrderSmartSearchPanel } from "@/features/sale-orders/components/SaleOrderSmartSearchPanel";
import {
  buildSaleOrderSmartSearchColumns,
  SaleOrderSearchFields,
  type SaleOrderSearchFilterKey,
} from "@/features/sale-orders/utils/saleOrderSmartSearch";
import { SystemButton } from "@/shared/components/components/SystemButton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";

type Props = {
  snapshot: SaleOrderSearchSnapshot;
  onApplyRule: (rule: SaleOrderSearchRule) => void;
  onRemoveRule: (fieldId: SaleOrderSearchFilterKey) => void;
};

export function DashboardSaleOrderSmartFilter({
  snapshot,
  onApplyRule,
  onRemoveRule,
}: Props) {
  const columns = useMemo(
    () =>
      buildSaleOrderSmartSearchColumns(null)
        .filter(
          (column) =>
            column.id === SaleOrderSearchFields.SCHEDULE_DATE ||
            column.id === SaleOrderSearchFields.DELIVERY_DATE ||
            column.id === SaleOrderSearchFields.CREATED_AT,
        )
        .map((column) => ({
          ...column,
          label:
            column.id === SaleOrderSearchFields.CREATED_AT
              ? "Fecha de creación"
              : column.id === SaleOrderSearchFields.SCHEDULE_DATE
              ? "Fecha de agenda"
              : "Fecha de entrega",
        })),
    [],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <SystemButton
          variant="outline"
          size="sm"
          leftIcon={<SlidersHorizontal className="h-4 w-4" />}
          aria-label="Filtros del dashboard"
        >
          Filtros
          {snapshot.filters.length > 0 ? (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-white">
              {snapshot.filters.length}
            </span>
          ) : null}
        </SystemButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(420px,calc(100vw-2rem))]">
        <SaleOrderSmartSearchPanel
          columns={columns}
          snapshot={snapshot}
          onApplySnapshot={() => undefined}
          onApplyRule={onApplyRule}
          onRemoveRule={onRemoveRule}
        />
      </PopoverContent>
    </Popover>
  );
}
