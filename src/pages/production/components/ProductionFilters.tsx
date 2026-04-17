import { Filter } from "lucide-react";
import { FloatingSelect } from "@/components/FloatingSelect";
import { FloatingMultiSelect } from "@/components/FloatingMultiSelect";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { ProductionStatus } from "@/pages/production/types/production";

type Option = {
  value: string;
  label: string;
};

type ProductionFiltersProps = {
  warehouseId: string;
  statusFilter: "all" | ProductionStatus;
  selectedProductIds: string[];
  warehouseOptions: Option[];
  statusOptions: Option[];
  productOptions: Option[];
  onWarehouseChange: (value: string) => void;
  onStatusChange: (value: "all" | ProductionStatus) => void;
  onProductsChange: (value: string[]) => void;
};

export function ProductionFilters({
  warehouseId,
  statusFilter,
  selectedProductIds,
  warehouseOptions,
  statusOptions,
  productOptions,
  onWarehouseChange,
  onStatusChange,
  onProductsChange,
}: ProductionFiltersProps) {
  return (
    <section className="rounded-2xl border border-black/10 bg-gray-50 p-4 shadow-sm">
      <SectionHeaderForm icon={Filter} title="Filtros" />

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[0.36fr_0.24fr_0.4fr]">
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
  );
}
