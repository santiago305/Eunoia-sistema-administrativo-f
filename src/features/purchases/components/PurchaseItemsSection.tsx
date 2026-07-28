import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";

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
  itemType: string;
};

type Props = {
  itemRows: PurchaseItemRow[];
  itemColumns: DataTableColumn<PurchaseItemRow>[];
};

export function PurchaseItemsSection({
  itemRows,
  itemColumns,
}: Props) {
  return (
    <section className="min-h-0 flex flex-1 flex-col gap-3 overflow-hidden">
      <DataTable
        tableId="purchase-create-items-table"
        data={itemRows}
        columns={itemColumns}
        rowKey="id"
        emptyMessage="Aun no agregas productos."
        className="min-h-0"
        maxHeight="300px"
        hoverable={false}
        animated={false}
      />
    </section>
  );
}
