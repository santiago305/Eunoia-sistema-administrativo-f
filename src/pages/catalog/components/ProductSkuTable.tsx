import { Trash2 } from "lucide-react";
import { FloatingInput } from "@/components/FloatingInput";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";

export type ProductSkuDraft = {
  id: string;
  name: string;
  customSku: string;
  barcode: string;
  price: string;
  cost: string;
  presentation: string;
  variant: string;
  color: string;
  isActive: boolean;
  autoFillName: boolean;
};

type ProductSkuTableProps = {
  rows: ProductSkuDraft[];
  canAddRows: boolean;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onChangeRow: (id: string, field: keyof ProductSkuDraft, value: string | boolean) => void;
};

export function ProductSkuTable({
  rows,
  canAddRows,
  onAddRow,
  onRemoveRow,
  onChangeRow,
}: ProductSkuTableProps) {
  const columns: DataTableColumn<ProductSkuDraft>[] = [
    {
      id: "customSku",
      header: "SKU",
      cell: (row) => (
        <FloatingInput
          label="SKU"
          name={`customSku-${row.id}`}
          value={row.customSku}
          onChange={(event) => onChangeRow(row.id, "customSku", event.target.value)}
          className="h-9 text-xs"
        />
      ),
      searchable: false,
      sortable: false,
      hideable: false,
    },
    {
      id: "barcode",
      header: "Barcode",
      cell: (row) => (
        <FloatingInput
          label="Barcode"
          name={`barcode-${row.id}`}
          value={row.barcode}
          onChange={(event) => onChangeRow(row.id, "barcode", event.target.value)}
          className="h-9 text-xs"
        />
      ),
      searchable: false,
      sortable: false,
      hideable: false,
    },
    {
      id: "name",
      header: "Nombre",
      cell: (row) => (
        <FloatingInput
          label="Nombre"
          name={`name-${row.id}`}
          value={row.name}
          onChange={(event) => onChangeRow(row.id, "name", event.target.value)}
          className="h-9 text-xs"
        />
      ),
      searchable: false,
      sortable: false,
      hideable: false,
    },
    {
      id: "presentation",
      header: "Presentacion",
      cell: (row) => (
        <FloatingInput
          label="Presentacion"
          name={`presentation-${row.id}`}
          value={row.presentation}
          onChange={(event) => onChangeRow(row.id, "presentation", event.target.value)}
          className="h-9 text-xs"
        />
      ),
      searchable: false,
      sortable: false,
      hideable: false,
    },
    {
      id: "variant",
      header: "Variante",
      cell: (row) => (
        <FloatingInput
          label="Variante"
          name={`variant-${row.id}`}
          value={row.variant}
          onChange={(event) => onChangeRow(row.id, "variant", event.target.value)}
          className="h-9 text-xs"
        />
      ),
      searchable: false,
      sortable: false,
      hideable: false,
    },
    {
      id: "color",
      header: "Color",
      cell: (row) => (
        <FloatingInput
          label="Color"
          name={`color-${row.id}`}
          value={row.color}
          onChange={(event) => onChangeRow(row.id, "color", event.target.value)}
          className="h-9 text-xs"
        />
      ),
      searchable: false,
      sortable: false,
      hideable: false,
    },
    {
      id: "price",
      header: "Precio",
      cell: (row) => (
        <FloatingInput
          label="Precio"
          name={`price-${row.id}`}
          type="number"
          step="0.01"
          min="0"
          value={row.price}
          onChange={(event) => onChangeRow(row.id, "price", event.target.value)}
          className="h-9 text-xs"
        />
      ),
      searchable: false,
      sortable: false,
      hideable: false,
    },
    {
      id: "cost",
      header: "Costo",
      width: "110px",
      cell: (row) => (
        <FloatingInput
          label="Costo"
          name={`cost-${row.id}`}
          type="number"
          step="0.01"
          min="0"
          value={row.cost}
          onChange={(event) => onChangeRow(row.id, "cost", event.target.value)}
          className="h-9 text-xs"
        />
      ),
      searchable: false,
      sortable: false,
      hideable: false,
    },
    {
      id: "actions",
      header: "Accion",
      width: "50px",
      headerClassName: "text-center",
      className: "text-center",
      cell: (row, index) => (
        <SystemButton
          variant="ghost"
          size="icon"
          className="h-9"
          onClick={() => onRemoveRow(row.id)}
          disabled={rows.length === 1 && index === 0}
          title="Eliminar fila"
        >
          <Trash2 className="h-4 w-4" />
        </SystemButton>
      ),
      searchable: false,
      sortable: false,
      hideable: false,
      showInCards: false,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-3">
        {canAddRows ? (
          <SystemButton variant="outline" size="sm" className="text-[11px]" onClick={onAddRow}>
            Crear nueva variante
          </SystemButton>
        ) : null}
      </div>

      <div className="rounded-2xl border border-black/10 bg-white">
        <DataTable
          tableId="product-sku-create"
          data={rows}
          columns={columns}
          rowKey="id"
          loading={false}
          emptyMessage="No hay SKUs configurados."
          responsiveCards={false}
          stickyHeader={false}
          hoverable={false}
          animated={false}
          rowClickable={false}
          showSearch={false}
          selectableColumns={false}
          tableClassName="text-[11px]"
        />
      </div>
    </div>
  );
}
