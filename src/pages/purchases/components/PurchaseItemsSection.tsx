import { Boxes } from "lucide-react";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";

type PurchaseItemRow = {
  id: string;
  skuId: string;
  sku: string;
  name?: string;
  unit: string;
  equivalence: string | number;
  factor: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  itemId: string;
  productOptions: SelectOption[];
  itemRows: PurchaseItemRow[];
  itemColumns: DataTableColumn<PurchaseItemRow>[];
  totalValueLabel: string;
  totalPriceLabel: string;
  igvPercent: number;
  onSelectItem: (value: string) => void;
  onSearchProduct: (text: string) => void;
};

export function PurchaseItemsSection({
  itemId,
  productOptions,
  itemRows,
  itemColumns,
  totalValueLabel,
  totalPriceLabel,
  igvPercent,
  onSelectItem,
  onSearchProduct,
}: Props) {
  return (
    <section className="flex flex-col gap-3 overflow-hidden">
      <div className="p-3">
        <SectionHeaderForm icon={Boxes} title="Productos" />

        <div className="mt-2 grid gap-2 xl:grid-cols-1">
          <FloatingSelect
            label="Producto"
            name="producto"
            value={itemId}
            onChange={onSelectItem}
            options={productOptions}
            searchable
            searchPlaceholder="Buscar producto..."
            emptyMessage="Sin productos"
            onSearchChange={onSearchProduct}
            className="h-12"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 py-0">
        <DataTable
          tableId="purchase-create-items-table"
          data={itemRows}
          columns={itemColumns}
          rowKey="id"
          emptyMessage="Aun no agregas productos."
          hoverable={false}
          animated={false}
        />
      </div>

      <div className="border-t border-black/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-black/60">
            Nota: "Precio" incluye IGV. "Valor" es base sin IGV (IGV {igvPercent}%).
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-black/10 bg-black/[0.02] px-2 py-1 text-[11px]">
              Total valor: <span className="font-semibold text-black">{totalValueLabel}</span>
            </div>
            <div className="rounded-lg border border-black/10 bg-black/[0.02] px-2 py-1 text-[11px]">
              Total precio: <span className="font-semibold text-black">{totalPriceLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
