import { Filter, Plus } from "lucide-react";
import { FloatingDateRangePicker } from "@/components/date-picker/FloatingDateRangePicker";
import { FloatingSelect } from "@/components/FloatingSelect";
import { FloatingMultiSelect } from "@/components/FloatingMultiSelect";
import { SystemButton } from "@/components/SystemButton";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { ProductionStatus } from "@/pages/production/types/production";
import { parseDateInputValue, toLocalDateKey } from "@/utils/functionPurchases";

type Option = {
  value: string;
  label: string;
};

type ProductionFiltersProps = {
  fromDate: string;
  toDate: string;
  warehouseId: string;
  statusFilter: "all" | ProductionStatus;
  selectedProductIds: string[];
  warehouseOptions: Option[];
  statusOptions: Option[];
  productOptions: Option[];
  onDateRangeChange: (value: { fromDate: string; toDate: string }) => void;
  onWarehouseChange: (value: string) => void;
  onStatusChange: (value: "all" | ProductionStatus) => void;
  onProductsChange: (value: string[]) => void;
  onCreate: () => void;
  primaryColor: string;
};

export function ProductionFilters({
  fromDate,
  toDate,
  warehouseId,
  statusFilter,
  selectedProductIds,
  warehouseOptions,
  statusOptions,
  productOptions,
  onDateRangeChange,
  onWarehouseChange,
  onStatusChange,
  onProductsChange,
  onCreate,
  primaryColor,
}: ProductionFiltersProps) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <section className="flex-1 rounded-2xl border border-black/10 bg-gray-50 p-4 shadow-sm">
        <SectionHeaderForm icon={Filter} title="Filtros" />

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[0.42fr_0.2fr_0.18fr_0.2fr]">
          <FloatingDateRangePicker
            label="Rango de fechas"
            name="production-date-range"
            startDate={parseDateInputValue(fromDate)}
            endDate={parseDateInputValue(toDate)}
            onChange={({ startDate, endDate }) => {
              onDateRangeChange({
                fromDate: startDate ? toLocalDateKey(startDate) : "",
                toDate: endDate ? toLocalDateKey(endDate) : "",
              });
            }}
          />

          <FloatingSelect
            label="Almacén"
            name="warehouseId"
            value={warehouseId}
            onChange={onWarehouseChange}
            options={warehouseOptions}
            searchable
            searchPlaceholder="Buscar almacén..."
            emptyMessage="Sin almacenes"
          />

          <FloatingSelect
            label="Estado"
            name="statusFilter"
            value={statusFilter}
            onChange={(value) => onStatusChange(value as "all" | ProductionStatus)}
            options={statusOptions}
            searchable={false}
          />

          <FloatingMultiSelect
            label="Productos"
            name="production-products"
            value={selectedProductIds}
            options={productOptions}
            onChange={onProductsChange}
            searchable
            searchPlaceholder="Buscar producto..."
            placeholder="Todos los productos"
            emptyMessage="Sin productos"
          />
        </div>
      </section>

      <div className="flex shrink-0 xl:pt-[52px]">
        <SystemButton
          leftIcon={<Plus className="h-4 w-4" />}
          className="h-10 min-w-[140px]"
          style={{
            backgroundColor: primaryColor,
            borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
          }}
          onClick={onCreate}
        >
          Nueva orden
        </SystemButton>
      </div>
    </div>
  );
}
