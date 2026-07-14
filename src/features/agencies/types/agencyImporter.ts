import type { ImportField } from "@/shared/components/importer";

export const agencyImportFields: ImportField[] = [
  {
    key: "department",
    label: "Departamento",
    required: true,
    aliases: ["Derpartamento", "departamento"],
  },
  {
    key: "province",
    label: "Provincia",
    required: true,
    aliases: ["provincia", "Provincia"],
  },
  {
    key: "district",
    label: "Distrito",
    required: true,
    aliases: ["distrito", "Distrito"],
  },
  {
    key: "address",
    label: "Direccion",
    aliases: ["direccion", "direcciÃ³n", "Direccion", "DirecciÃ³n"],
  },
  {
    key: "alias",
    label: "Alias",
    required: true,
    aliases: ["alias", "Alias"],
  },
  {
    key: "price",
    label: "Precio",
    type: "number",
    aliases: ["precio", "Precio"],
  },
];
