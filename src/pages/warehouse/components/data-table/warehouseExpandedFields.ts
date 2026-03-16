import type { Warehouse } from "@/pages/warehouse/types/warehouse";
import type { ExpandedFieldConfig } from "@/components/data-table/type";

const formatDate = (value: string) => {
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

export const warehouseExpandedFields: ExpandedFieldConfig<Warehouse>[] = [
  { key: "name", label: "Almacen" },
  { key: "department", label: "Departamento" },
  { key: "province", label: "Provincia" },
  { key: "district", label: "Distrito" },
  { key: "address", label: "Direccion" },
  {
    key: "isActive",
    label: "Estado",
    render: (value) => (value ? "Activo" : "Inactivo"),
  },
  {
    key: "createdAt",
    label: "Creado",
    render: (value) => formatDate(String(value)),
  },
];
