import type { ProductionOrder, ProductionStatus } from "@/pages/production/types/production";
import type { ExpandedFieldConfig } from "@/components/data-table/type";

const statusLabels: Record<ProductionStatus, string> = {
  DRAFT: "Borrador",
  IN_PROGRESS: "En proceso",
  PARTIAL: "Parcial",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const productionExpandedFields: ExpandedFieldConfig<ProductionOrder>[] = [
  {
    key: "serie",
    label: "Serie",
    render: (_, row) => row.serie?.code ? `${row.serie?.code} - ${row.correlative}` : '-',
  },
  { key: "reference", label: "Referencia" },
  {
    key: "fromWarehouse",
    label: "Almacen origen",
    render: (_, row) => row.fromWarehouse?.name ?? "-",
  },
  {
    key: "toWarehouse",
    label: "Almacen destino",
    render: (_, row) => row.toWarehouse?.name ?? "-",
  },
  {
    key: "status",
    label: "Estado",
    render: (value) => (value ? statusLabels[value as ProductionStatus] ?? String(value) : "-"),
  },
  {
    key: "manufactureDate",
    label: "Fecha produccion",
    render: (value) => formatDateTime(String(value)),
  },
];
