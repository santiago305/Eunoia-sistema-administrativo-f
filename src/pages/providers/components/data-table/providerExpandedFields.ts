import type { Supplier } from "@/pages/providers/types/supplier";
import type { ExpandedFieldConfig } from "@/components/data-table/type";

export const providerExpandedFields: ExpandedFieldConfig<Supplier>[] = [
  {
    key: "tradeName",
    label: "Nombre comercial",
  },
  {
    key: "address",
    label: "Dirección",
  },
  {
    key: "note",
    label: "Nota",
  },
  {
    key: "email",
    label: "Correo",
  },
  {
    key: "phone",
    label: "Telefono",
  },
  {
    key: "leadTimeDays",
    label: "Lead time",
    render: (value) => `${value ?? "-"} días`,
  },
];