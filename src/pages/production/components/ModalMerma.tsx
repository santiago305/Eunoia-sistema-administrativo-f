import { useMemo } from "react";
import { Boxes, PackageCheck } from "lucide-react";
import { Modal } from "@/components/settings/modal";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { SystemButton } from "@/components/SystemButton";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import type { ProductionOrder } from "@/pages/production/types/production";

type ProductionItemsModalProps = {
  open: boolean;
  order?: ProductionOrder;
  onClose: () => void;
  primaryColor?: string;
};

type ProductionItemRow = {
  id: string;
  sku: string;
  producto: string;
  presentacion: string;
  variante: string;
  unidad: string;
  cantidad: number;
  merma: string;
};

const DEFAULT_PRIMARY = "hsl(var(--primary))";

export function ProductionItemsModal({
  open,
  order,
  onClose,
  primaryColor = DEFAULT_PRIMARY,
}: ProductionItemsModalProps) {
  const rows = useMemo<ProductionItemRow[]>(() => {
    const items = order?.items ?? [];

    return items.map((item, index) => {
      const variant = item.finishedItem?.variant;
      const attributes = variant?.attributes ?? {};

      return {
        id: item.itemId ?? `${"production"}-${index}`,
        sku: variant?.customSku ?? variant?.sku ?? "-",
        producto: variant?.productName ?? "-",
        presentacion: String(attributes.presentation ?? "-"),
        variante: String(attributes.variant ?? "-"),
        unidad: variant?.unitName ? `${variant.unitName} (${variant.unitCode ?? "-"})` : "-",
        cantidad: Number(item.quantity ?? 0),
        merma: String(item.wasteQty ?? "0"),
      };
    });
  }, [order]);

  const columns: DataTableColumn<ProductionItemRow>[] = [
    {
      id: "sku",
      header: "SKU",
      accessorKey: "sku",
      hideable: false,
      className: "font-medium text-black/80",
      sortable: false,
    },
    {
      id: "producto",
      header: "Producto",
      accessorKey: "producto",
      hideable: false,
      className: "text-black/70",
      sortable: false,
    },
    {
      id: "presentacion",
      header: "Presentación",
      accessorKey: "presentacion",
      className: "text-black/70",
      sortable: false,
    },
    {
      id: "variante",
      header: "Variante",
      accessorKey: "variante",
      className: "text-black/70",
      sortable: false,
    },
    {
      id: "unidad",
      header: "Unidad",
      accessorKey: "unidad",
      className: "text-black/70",
      sortable: false,
    },
    {
      id: "cantidad",
      header: "Cantidad",
      accessorKey: "cantidad",
      className: "text-black/70 tabular-nums text-right",
      headerClassName: "text-right",
      sortable: false,
    },
    {
      id: "merma",
      header: "Merma",
      accessorKey: "merma",
      className: "text-black/70 tabular-nums text-right",
      headerClassName: "text-right",
      sortable: false,
    },
  ];

  if (!open) return null;

  const serie =
    order?.serie?.code && order?.correlative != null
      ? `${order.serie.code} - ${order.correlative}`
      : "-";

  return (
    <Modal
      title={`Items de producción ${serie !== "-" ? `(${serie})` : ""}`}
      onClose={onClose}
      className="max-w-[1100px]"
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-black/10 bg-gray-50 p-4">
          <SectionHeaderForm icon={Boxes} title="Resumen de la orden" />

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-black/10 bg-white px-3 py-3">
              <p className="text-[11px] text-black/50">Serie</p>
              <p className="mt-1 text-sm font-medium text-black">{serie}</p>
            </div>

            <div className="rounded-xl border border-black/10 bg-white px-3 py-3">
              <p className="text-[11px] text-black/50">Estado</p>
              <p className="mt-1 text-sm font-medium text-black">{order?.status ?? "-"}</p>
            </div>

            <div className="rounded-xl border border-black/10 bg-white px-3 py-3">
              <p className="text-[11px] text-black/50">Almacén origen</p>
              <p className="mt-1 text-sm font-medium text-black">{order?.fromWarehouse?.name ?? "-"}</p>
            </div>

            <div className="rounded-xl border border-black/10 bg-white px-3 py-3">
              <p className="text-[11px] text-black/50">Almacén destino</p>
              <p className="mt-1 text-sm font-medium text-black">{order?.toWarehouse?.name ?? "-"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <SectionHeaderForm icon={PackageCheck} title="Items" />

          <div className="mt-4">
            <DataTable
              tableId={`production-items-${ order?.productionId ?? "detail"}`}
              data={rows}
              columns={columns}
              rowKey="id"
              emptyMessage="No hay items registrados en esta orden."
              hoverable={false}
              animated={false}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <SystemButton
            style={{
              backgroundColor: primaryColor,
              borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
            }}
            onClick={onClose}
          >
            Cerrar
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}