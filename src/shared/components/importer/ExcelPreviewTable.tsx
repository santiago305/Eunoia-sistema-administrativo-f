import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { cn } from "@/shared/lib/utils";
import type { ExcelRow, ExcelRowError, ImportField } from "./excelImporter.types";

type ExcelPreviewTableProps = {
  fields: ImportField[];
  rows: ExcelRow[];
  errors: ExcelRowError[];
  selectedRowIndexes: ReadonlySet<number>;
  onToggleRow: (rowIndex: number, checked: boolean) => void;
  onToggleAllRows: (checked: boolean) => void;
  onChangeCell: (rowIndex: number, fieldKey: string, value: unknown) => void;
};

const BOOLEAN_OPTIONS = [
  { value: "", label: "Sin valor" },
  { value: "true", label: "Sí" },
  { value: "false", label: "No" },
];

export function ExcelPreviewTable({
  fields,
  rows,
  errors,
  selectedRowIndexes,
  onToggleRow,
  onToggleAllRows,
  onChangeCell,
}: ExcelPreviewTableProps) {
  const errorsByRow = new Map<number, ExcelRowError[]>();
  const errorsByCell = new Map<string, string>();

  errors.forEach((error) => {
    errorsByRow.set(error.rowIndex, [
      ...(errorsByRow.get(error.rowIndex) ?? []),
      error,
    ]);
    errorsByCell.set(getCellKey(error.rowIndex, error.fieldKey), error.message);
  });

  const selectedCount = selectedRowIndexes.size;
  const allRowsSelected = rows.length > 0 && selectedCount === rows.length;

  const gridTemplateColumns = `44px 60px repeat(${fields.length}, minmax(140px, 1fr))`;

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        No hay filas para previsualizar.
      </p>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="max-h-[60vh] w-full min-w-0 overflow-auto rounded-lg scroll-area">
        <div
          className="min-w-full text-sm"
          style={{
            display: "grid",
            gridTemplateColumns,
          }}
        >
          <div className="sticky top-0 z-10 flex items-center bg-muted px-2 py-2 font-semibold text-foreground">
            <Checkbox
              checked={allRowsSelected}
              onCheckedChange={(checked) => onToggleAllRows(checked === true)}
              aria-label="Seleccionar todas las filas"
            />
          </div>
          <div className="sticky top-0 z-10 flex items-center bg-muted px-2 py-2 font-semibold text-foreground">
            Fila
          </div>
          {fields.map((field) => (
            <div
              key={`head-${field.key}`}
              className="sticky top-0 z-10 min-w-0 bg-muted px-2 py-2 font-semibold text-foreground"
            >
              <span className="block truncate" title={field.label}>
                {field.label}
                {field.required ? <span className="text-red-600"> *</span> : null}
              </span>
            </div>
          ))}

          {rows.map((row, index) => {
            const selected = selectedRowIndexes.has(index);
            const rowHasError = errorsByRow.has(index);

            return (
              <RowFragment
                key={index}
                fields={fields}
                row={row}
                rowIndex={index}
                selected={selected}
                rowHasError={rowHasError}
                errorsByCell={errorsByCell}
                onToggleRow={onToggleRow}
                onChangeCell={onChangeCell}
              />
            );
          })}
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {rows.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Mostrando {rows.length} fila(s).
          </p>
        ) : (
          <span />
        )}

        {errors.length > 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Se encontraron {errors.length} error(es) en filas marcadas. Corrige
            los campos o desmarca los registros que no vas a importar.
          </div>
        ) : selectedCount === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Marca al menos una fila para confirmar la importación.
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Vista previa válida. {selectedCount} fila(s) lista(s) para importar.
          </div>
        )}
      </div>
    </div>
  );
}

type RowFragmentProps = {
  fields: ImportField[];
  row: ExcelRow;
  rowIndex: number;
  selected: boolean;
  rowHasError: boolean;
  errorsByCell: Map<string, string>;
  onToggleRow: (rowIndex: number, checked: boolean) => void;
  onChangeCell: (rowIndex: number, fieldKey: string, value: unknown) => void;
};

function RowFragment({
  fields,
  row,
  rowIndex,
  selected,
  rowHasError,
  errorsByCell,
  onToggleRow,
  onChangeCell,
}: RowFragmentProps) {
  const rowClassName = cn(
    "border-t border-border px-2 py-2",
    selected && rowHasError ? "bg-red-50/60" : "bg-background",
    !selected ? "bg-muted/30 opacity-70" : undefined,
  );

  return (
    <>
      <div className={cn(rowClassName, "flex items-start")}>
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onToggleRow(rowIndex, checked === true)}
          aria-label={`Seleccionar fila ${rowIndex + 2}`}
        />
      </div>

      <div className={cn(rowClassName, "text-muted-foreground")}>
        {rowIndex + 2}
      </div>

      {fields.map((field) => (
        <div key={field.key} className={cn(rowClassName, "min-w-0")}>
          <PreviewCellEditor
            field={field}
            rowIndex={rowIndex}
            value={row[field.key]}
            disabled={!selected}
            error={
              selected
                ? errorsByCell.get(getCellKey(rowIndex, field.key))
                : undefined
            }
            onChange={onChangeCell}
          />
        </div>
      ))}
    </>
  );
}

type PreviewCellEditorProps = {
  field: ImportField;
  rowIndex: number;
  value: unknown;
  disabled: boolean;
  error?: string;
  onChange: (rowIndex: number, fieldKey: string, value: unknown) => void;
};

function PreviewCellEditor({
  field,
  rowIndex,
  value,
  disabled,
  error,
  onChange,
}: PreviewCellEditorProps) {
  const name = `preview-${rowIndex}-${field.key}`;

  if (field.type === "boolean") {
    return (
      <FloatingSelect
        label={field.label}
        name={name}
        value={value === true ? "true" : value === false ? "false" : ""}
        options={BOOLEAN_OPTIONS}
        onChange={(nextValue) => onChange(rowIndex, field.key, nextValue)}
        error={error}
        disabled={disabled}
        placeholder="Seleccionar"
        panelWidthMode="min-trigger"
        className="h-8 w-full min-w-0 rounded-md px-2 py-1 text-xs"
      />
    );
  }

  return (
    <FloatingInput
      label={field.label}
      name={name}
      value={formatCell(value)}
      onChange={(event) => onChange(rowIndex, field.key, event.target.value)}
      error={error}
      disabled={disabled}
      type={field.type === "date" ? "date" : "text"}
      inputMode={field.type === "number" ? "decimal" : undefined}
      className="h-8 w-full min-w-0 rounded-md px-2 py-1 text-xs"
    />
  );
}

function getCellKey(rowIndex: number, fieldKey: string): string {
  return `${rowIndex}:${fieldKey}`;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}
