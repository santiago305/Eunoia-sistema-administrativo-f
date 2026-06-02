import { FloatingSelect } from "@/shared/components/components/FloatingSelect";

type ExcelSheetSelectorProps = {
  sheetNames: string[];
  selectedSheet: string;
  onChange: (sheetName: string) => void;
};

export function ExcelSheetSelector({
  sheetNames,
  selectedSheet,
  onChange,
}: ExcelSheetSelectorProps) {
  if (sheetNames.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        No hay hojas disponibles.
      </p>
    );
  }

  return (
    <FloatingSelect
      label="Hoja del archivo"
      name="excelSheet"
      value={selectedSheet}
      onChange={onChange}
      placeholder="Selecciona una hoja"
      searchable={sheetNames.length > 8}
      options={sheetNames.map((sheetName) => ({
        value: sheetName,
        label: sheetName,
      }))}
      className=""
    />
  );
}