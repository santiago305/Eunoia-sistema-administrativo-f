import { useState } from "react";
import { Pencil } from "lucide-react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { cn } from "@/shared/lib/utils";
import type { ExcelRow, ExcelRowError, ImportField, ImportUbigeoConfig } from "./excelImporter.types";
import { SystemButton } from "../components/SystemButton";
import { FloatingDatePicker } from "../components/date-picker/FloatingDatePicker";

type ExcelPreviewTableProps = {
  fields: ImportField[];
  rows: ExcelRow[];
  errors: ExcelRowError[];
  selectedRowIndexes: ReadonlySet<number>;
  ubigeoConfig?: ImportUbigeoConfig;
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
  ubigeoConfig,
  onToggleRow,
  onToggleAllRows,
  onChangeCell,
}: ExcelPreviewTableProps) {
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
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

  const gridTemplateColumns = `72px 60px repeat(${fields.length}, minmax(140px, 1fr))`;

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
          <div className="sticky top-0 z-10 flex items-center gap-2 bg-muted px-2 py-2 font-semibold text-foreground">
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
                ubigeoConfig={ubigeoConfig}
                selected={selected}
                editing={selected && editingRowIndex === index}
                rowHasError={rowHasError}
                errorsByCell={errorsByCell}
                onToggleRow={onToggleRow}
                onToggleEditing={() =>
                  setEditingRowIndex((currentIndex) =>
                    currentIndex === index ? null : index,
                  )
                }
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
  ubigeoConfig?: ImportUbigeoConfig;
  selected: boolean;
  editing: boolean;
  rowHasError: boolean;
  errorsByCell: Map<string, string>;
  onToggleRow: (rowIndex: number, checked: boolean) => void;
  onToggleEditing: () => void;
  onChangeCell: (rowIndex: number, fieldKey: string, value: unknown) => void;
};

function RowFragment({
  fields,
  row,
  rowIndex,
  ubigeoConfig,
  selected,
  editing,
  rowHasError,
  errorsByCell,
  onToggleRow,
  onToggleEditing,
  onChangeCell,
}: RowFragmentProps) {
  const rowClassName = cn(
    "border-t border-border px-2 py-2",
    selected && rowHasError ? "bg-red-50/60" : "bg-background",
    !selected ? "bg-muted/30 opacity-70" : undefined,
  );

  return (
    <>
      <div className={cn(rowClassName, "flex items-start gap-2")}>
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onToggleRow(rowIndex, checked === true)}
          aria-label={`Seleccionar fila ${rowIndex + 2}`}
        />
        <SystemButton
          variant="ghost"
          size="custom"
          className={cn(
            "h-6 w-6 rounded-md p-0 text-muted-foreground",
            editing ? "bg-black/[0.06] text-foreground" : undefined,
          )}
          disabled={!selected}
          aria-pressed={editing}
          aria-label={`Editar fila ${rowIndex + 2}`}
          title={`Editar fila ${rowIndex + 2}`}
          onClick={onToggleEditing}
        >
          <Pencil className="h-3.5 w-3.5" />
        </SystemButton>
      </div>

      <div className={cn(rowClassName, "text-muted-foreground")}>
        {rowIndex + 2}
      </div>

      {fields.map((field) => (
        <div key={field.key} className={cn(rowClassName, "min-w-0")}>
          {editing ? (
            <PreviewCellEditor
              field={field}
              row={row}
              rowIndex={rowIndex}
              ubigeoConfig={ubigeoConfig}
              value={row[field.key]}
              disabled={!selected}
              error={
                selected
                  ? errorsByCell.get(getCellKey(rowIndex, field.key))
                  : undefined
              }
              onChange={onChangeCell}
            />
          ) : (
            <PreviewCellText
              field={field}
              value={row[field.key]}
              error={
                selected
                  ? errorsByCell.get(getCellKey(rowIndex, field.key))
                  : undefined
              }
            />
          )}
        </div>
      ))}
    </>
  );
}

type PreviewCellTextProps = {
  field: ImportField;
  value: unknown;
  error?: string;
};

function PreviewCellText({ field, value, error }: PreviewCellTextProps) {
  return (
    <div className="min-h-8 min-w-0">
      <span
        className={cn(
          "block truncate rounded-md px-2 py-1 text-xs leading-6 text-foreground",
          error ? "border border-red-200 bg-red-50 text-red-700" : undefined,
        )}
        title={formatCellForDisplay(value, field)}
      >
        {formatCellForDisplay(value, field) || (
          <span className="text-muted-foreground">Sin valor</span>
        )}
      </span>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

type PreviewCellEditorProps = {
  field: ImportField;
  row: ExcelRow;
  rowIndex: number;
  ubigeoConfig?: ImportUbigeoConfig;
  value: unknown;
  disabled: boolean;
  error?: string;
  onChange: (rowIndex: number, fieldKey: string, value: unknown) => void;
};

function PreviewCellEditor({
  field,
  row,
  rowIndex,
  ubigeoConfig,
  value,
  disabled,
  error,
  onChange,
}: PreviewCellEditorProps) {
  const name = `preview-${rowIndex}-${field.key}`;

  if (isUbigeoField(field.key, ubigeoConfig)) {
    return (
      <UbigeoCellEditor
        field={field}
        row={row}
        rowIndex={rowIndex}
        name={name}
        config={ubigeoConfig}
        disabled={disabled}
        error={error}
        onChange={onChange}
      />
    );
  }

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

  if (field.type === "date") {
    return (
      <FloatingDatePicker
        label={field.label}
        name={name}
        value={parseDateValue(value)}
        onChange={(date) => onChange(rowIndex, field.key, date)}
        error={error}
        disabled={disabled}
        placeholder="Seleccionar"
        className="h-8 w-full min-w-0 rounded-md px-2 py-1 text-xs"
        containerClassName="w-full min-w-0"
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
      type="text"
      inputMode={field.type === "number" ? "decimal" : undefined}
      className="h-8 w-full min-w-0 rounded-md px-2 py-1 text-xs"
    />
  );
}

type UbigeoCellEditorProps = {
  field: ImportField;
  row: ExcelRow;
  rowIndex: number;
  name: string;
  config: ImportUbigeoConfig;
  disabled: boolean;
  error?: string;
  onChange: (rowIndex: number, fieldKey: string, value: unknown) => void;
};

function UbigeoCellEditor({
  field,
  row,
  rowIndex,
  name,
  config,
  disabled,
  error,
  onChange,
}: UbigeoCellEditorProps) {
  const catalog = config.catalog ?? { departments: [], provinces: [], districts: [] };
  const valueMode = config.valueMode ?? "name";
  const department = findDepartment(catalog.departments, row[config.departmentKey]);
  const province = findProvince(catalog.provinces, row[config.provinceKey]);
  const district = findDistrict(catalog.districts, row[config.districtKey]);
  const departmentId = department?.id ?? province?.departmentId ?? district?.departmentId ?? "";
  const provinceId = province?.id ?? district?.provinceId ?? "";

  const departmentOptions = catalog.departments.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const provinceOptions = catalog.provinces
    .filter((item) => !departmentId || item.departmentId === departmentId)
    .map((item) => ({ value: item.id, label: item.name }));
  const districtOptions = catalog.districts
    .filter((item) => {
      if (provinceId) return item.provinceId === provinceId;
      if (departmentId) return item.departmentId === departmentId;
      return true;
    })
    .map((item) => ({ value: item.id, label: item.name }));

  const setUbigeoValues = (
    nextDepartment?: { id: string; name: string },
    nextProvince?: { id: string; name: string; departmentId: string },
    nextDistrict?: { id: string; name: string; provinceId: string; departmentId: string },
  ) => {
    onChange(rowIndex, config.departmentKey, formatUbigeoValue(nextDepartment, valueMode));
    onChange(rowIndex, config.provinceKey, formatUbigeoValue(nextProvince, valueMode));
    onChange(rowIndex, config.districtKey, formatUbigeoValue(nextDistrict, valueMode));
  };

  if (field.key === config.departmentKey) {
    return (
      <FloatingSelect
        label={field.label}
        name={name}
        value={departmentId}
        options={departmentOptions}
        onChange={(nextDepartmentId) => {
          const nextDepartment = catalog.departments.find((item) => item.id === nextDepartmentId);
          setUbigeoValues(nextDepartment);
        }}
        error={error}
        disabled={disabled}
        placeholder="Seleccionar"
        panelWidthMode="min-trigger"
        className="h-8 w-full min-w-0 rounded-md px-2 py-1 text-xs"
        searchable
        searchPlaceholder="Buscar departamento..."
        emptyMessage="Sin departamentos"
      />
    );
  }

  if (field.key === config.provinceKey) {
    return (
      <FloatingSelect
        label={field.label}
        name={name}
        value={provinceId}
        options={provinceOptions}
        onChange={(nextProvinceId) => {
          const nextProvince = catalog.provinces.find((item) => item.id === nextProvinceId);
          const nextDepartment = catalog.departments.find((item) => item.id === nextProvince?.departmentId);
          setUbigeoValues(nextDepartment, nextProvince);
        }}
        error={error}
        disabled={disabled}
        placeholder="Seleccionar"
        panelWidthMode="min-trigger"
        className="h-8 w-full min-w-0 rounded-md px-2 py-1 text-xs"
        searchable
        searchPlaceholder="Buscar provincia..."
        emptyMessage="Sin provincias"
      />
    );
  }

  return (
    <FloatingSelect
      label={field.label}
      name={name}
      value={district?.id ?? ""}
      options={districtOptions}
      onChange={(nextDistrictId) => {
        const nextDistrict = catalog.districts.find((item) => item.id === nextDistrictId);
        const nextProvince = catalog.provinces.find((item) => item.id === nextDistrict?.provinceId);
        const nextDepartment = catalog.departments.find((item) => item.id === nextDistrict?.departmentId);
        setUbigeoValues(nextDepartment, nextProvince, nextDistrict);
      }}
      error={error}
      disabled={disabled}
      placeholder="Seleccionar"
      panelWidthMode="min-trigger"
      className="h-8 w-full min-w-0 rounded-md px-2 py-1 text-xs"
      searchable
      searchPlaceholder="Buscar distrito..."
      emptyMessage="Sin distritos"
    />
  );
}

function isUbigeoField(fieldKey: string, config?: ImportUbigeoConfig): config is ImportUbigeoConfig {
  return Boolean(
    config &&
      (fieldKey === config.departmentKey ||
        fieldKey === config.provinceKey ||
        fieldKey === config.districtKey),
  );
}

function formatUbigeoValue(
  value: { id: string; name: string } | undefined,
  valueMode: "id" | "name",
): string {
  if (!value) return "";
  return valueMode === "id" ? value.id : value.name;
}

function findDepartment(
  departments: Array<{ id: string; name: string }>,
  value: unknown,
) {
  const normalizedValue = normalizeUbigeoValue(value);
  return departments.find((item) => item.id === String(value ?? "") || normalizeUbigeoValue(item.name) === normalizedValue);
}

function findProvince(
  provinces: Array<{ id: string; name: string; departmentId: string }>,
  value: unknown,
) {
  const normalizedValue = normalizeUbigeoValue(value);
  return provinces.find((item) => item.id === String(value ?? "") || normalizeUbigeoValue(item.name) === normalizedValue);
}

function findDistrict(
  districts: Array<{ id: string; name: string; provinceId: string; departmentId: string }>,
  value: unknown,
) {
  const normalizedValue = normalizeUbigeoValue(value);
  return districts.find((item) => item.id === String(value ?? "") || normalizeUbigeoValue(item.name) === normalizedValue);
}

function normalizeUbigeoValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getCellKey(rowIndex: number, fieldKey: string): string {
  return `${rowIndex}:${fieldKey}`;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function formatCellForDisplay(value: unknown, field: ImportField): string {
  if (field.type === "boolean") {
    if (value === true) return "Sí";
    if (value === false) return "No";
    return "";
  }
  return formatCell(value);
}
function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}
