import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import type { ExcelColumnMapping, ImportField } from "./excelImporter.types";

type ExcelColumnMapperProps = {
  fields: ImportField[];
  excelHeaders: string[];
  mapping: ExcelColumnMapping;
  onChange: (fieldKey: string, excelHeader: string) => void;
};

export function ExcelColumnMapper({
  fields,
  excelHeaders,
  mapping,
  onChange,
}: ExcelColumnMapperProps) {
  const options = [
    {
      value: "",
      label: "Sin mapear",
    },
    ...excelHeaders.map((header) => ({
      value: header,
      label: header,
    })),
  ];

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div
          key={field.key}
          className="grid gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-[1fr_1.4fr] sm:items-center"
        >
          <div>
            <p className="text-sm font-medium text-foreground">
              {field.label}
              {field.required ? (
                <span className="text-red-600"> *</span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">
              {getTypeLabel(field.type)}
            </p>
          </div>
          <FloatingSelect
            label="Columna Excel"
            name={`mapping-${field.key}`}
            value={mapping[field.key] ?? ""}
            onChange={(value) => onChange(field.key, value)}
            options={options}
            placeholder="Seleccionar columna"
            searchable
            searchPlaceholder="Buscar columna..."
            panelWidthMode="min-trigger"
          />
        </div>
      ))}
    </div>
  );
}
function getTypeLabel(type?: string): string {
  switch (type) {
    case "string":
      return "Texto";

    case "number":
      return "Número";

    case "date":
      return "Fecha";

    case "boolean":
      return "Sí / No";

    default:
      return "Texto";
  }
}