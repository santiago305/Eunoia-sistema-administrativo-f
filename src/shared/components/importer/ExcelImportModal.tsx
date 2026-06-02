import { useCallback, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { useUbigeoCatalog } from "@/shared/hooks/useUbigeoCatalog";
import { ExcelColumnMapper } from "./ExcelColumnMapper";
import { ExcelDropzone } from "./ExcelDropzone";
import { ExcelPreviewTable } from "./ExcelPreviewTable";
import { ExcelSheetSelector } from "./ExcelSheetSelector";
import type { ExcelColumnMapping, ExcelImportModalProps, ExcelRow, ExcelWorkbook } from "./excelImporter.types";
import {
  applyMapping,
  autoMapColumns,
  getExcelHeaders,
  getSelectableRows,
  getSheetNames,
  readWorkbook,
  sheetToRows,
  updateMappedRowValue,
  validateRows,
} from "./excelImporter.utils";

const DEFAULT_MAX_ROWS = 1000;

type Step = "file" | "sheet" | "mapping" | "preview";

const steps: Array<{ key: Step; label: string }> = [
  { key: "file", label: "Subir archivo" },
  { key: "sheet", label: "Seleccionar hoja" },
  { key: "mapping", label: "Mapear columnas" },
  { key: "preview", label: "Vista previa" },
];

export function ExcelImportModal<TData extends Record<string, unknown>>({
  open,
  title = "Importar Excel",
  fields,
  onClose,
  onSubmit,
  maxRows = DEFAULT_MAX_ROWS,
  ubigeoConfig,
}: ExcelImportModalProps<TData>) {
  const { catalog: ubigeoCatalog } = useUbigeoCatalog(open && Boolean(ubigeoConfig));
  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<ExcelWorkbook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [previewRows, setPreviewRows] = useState<ExcelRow[]>([]);
  const [selectedRowIndexes, setSelectedRowIndexes] = useState<Set<number>>(new Set());
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ExcelColumnMapping>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mappedRows = useMemo(() => applyMapping(rows, mapping, fields), [fields, mapping, rows]);
  const rowsForPreview = step === "preview" ? previewRows : mappedRows;
  const selectedRows = useMemo(() => getSelectableRows(rowsForPreview, selectedRowIndexes), [rowsForPreview, selectedRowIndexes]);
  const validation = useMemo(() => validateRows(rowsForPreview, fields, selectedRowIndexes), [fields, rowsForPreview, selectedRowIndexes]);
  const missingRequiredMappings = useMemo(
    () => fields.filter((field) => field.required && !mapping[field.key]),
    [fields, mapping],
  );
  const canConfirm = file && selectedRows.length > 0 && !validation.hasErrors && missingRequiredMappings.length === 0;
  const currentStepIndex = steps.findIndex((item) => item.key === step);
  const previewUbigeoConfig = useMemo(
    () =>
      ubigeoConfig
        ? {
            ...ubigeoConfig,
            catalog: ubigeoConfig.catalog ?? ubigeoCatalog ?? { departments: [], provinces: [], districts: [] },
          }
        : undefined,
    [ubigeoCatalog, ubigeoConfig],
  );

  const reset = useCallback(() => {
    setStep("file");
    setFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet("");
    setRows([]);
    setPreviewRows([]);
    setSelectedRowIndexes(new Set());
    setExcelHeaders([]);
    setMapping({});
    setLoading(false);
    setSubmitting(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (loading || submitting) return;
    reset();
    onClose();
  }, [loading, onClose, reset, submitting]);

  const handleFile = useCallback(
    async (nextFile: File) => {
      setError(null);
      setLoading(true);
      try {
        const nextWorkbook = await readWorkbook(nextFile);
        const names = getSheetNames(nextWorkbook);
        if (names.length === 0) {
          setError("El archivo no tiene hojas disponibles.");
          return;
        }

        setFile(nextFile);
        setWorkbook(nextWorkbook);
        setSheetNames(names);
        setSelectedSheet(names[0]);
        setStep("sheet");
      } catch {
        setError("No se pudo leer el archivo. Verifica que sea un Excel válido.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleReadSheet = useCallback(() => {
    if (!workbook || !selectedSheet) {
      setError("Selecciona una hoja para continuar.");
      return;
    }

    const nextRows = sheetToRows(workbook, selectedSheet);
    if (nextRows.length === 0) {
      setError("La hoja seleccionada no tiene filas.");
      return;
    }

    if (nextRows.length > maxRows) {
      setError(`La hoja tiene ${nextRows.length} filas. El máximo permitido es ${maxRows}.`);
      return;
    }

    const headers = getExcelHeaders(nextRows);
    setRows(nextRows);
    setPreviewRows([]);
    setSelectedRowIndexes(new Set());
    setExcelHeaders(headers);
    setMapping(autoMapColumns(fields, headers));
    setError(null);
    setStep("mapping");
  }, [fields, maxRows, selectedSheet, workbook]);

  const handleNextFromMapping = useCallback(() => {
    if (missingRequiredMappings.length > 0) {
      setError(`Falta mapear: ${missingRequiredMappings.map((field) => field.label).join(", ")}.`);
      return;
    }

    setError(null);
    setPreviewRows(mappedRows);
    setSelectedRowIndexes(new Set(mappedRows.map((_, index) => index)));
    setStep("preview");
  }, [mappedRows, missingRequiredMappings]);

  const handleToggleRow = useCallback((rowIndex: number, checked: boolean) => {
    setSelectedRowIndexes((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(rowIndex);
      } else {
        next.delete(rowIndex);
      }
      return next;
    });
  }, []);

  const handleToggleAllRows = useCallback((checked: boolean) => {
    setSelectedRowIndexes(checked ? new Set(rowsForPreview.map((_, index) => index)) : new Set());
  }, [rowsForPreview]);

  const handleUpdatePreviewCell = useCallback((rowIndex: number, fieldKey: string, value: unknown) => {
    const field = fields.find((item) => item.key === fieldKey);
    if (!field) return;

    setPreviewRows((current) => updateMappedRowValue(current, rowIndex, field, value));
  }, [fields]);

  const handleConfirm = useCallback(async () => {
    if (!file || !canConfirm) return;

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(selectedRows as TData[], file);
      reset();
      onClose();
    } catch {
      setError("No se pudo confirmar la importación. Inténtalo nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }, [canConfirm, file, onClose, onSubmit, reset, selectedRows]);

  const footer = (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
      <SystemButton variant="ghost" onClick={handleClose} disabled={loading || submitting}>
        Cancelar
      </SystemButton>
      <div className="flex flex-col gap-2 sm:flex-row">
        {step !== "file" ? (
          <SystemButton
            variant="outline"
            onClick={() => setStep(steps[Math.max(0, currentStepIndex - 1)].key)}
            disabled={loading || submitting}
          >
            Atrás
          </SystemButton>
        ) : null}
        {step === "sheet" ? (
          <SystemButton onClick={handleReadSheet}>Siguiente</SystemButton>
        ) : null}
        {step === "mapping" ? (
          <SystemButton onClick={handleNextFromMapping}>Siguiente</SystemButton>
        ) : null}
        {step === "preview" ? (
          <SystemButton onClick={handleConfirm} loading={submitting} disabled={!canConfirm || submitting}>
            Confirmar importación
          </SystemButton>
        ) : null}
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description="Carga, mapea y valida filas antes de enviarlas."
      className={`${step === "preview" ? "w-screen h-screen" : "w-full max-w-2xl "}`}
      bodyClassName="space-y-4"
      footer={footer}
      preventClose={loading || submitting}
      closeOnOverlayClick={!loading && !submitting}
    >
      <div className="grid gap-2 sm:grid-cols-4">
        {steps.map((item, index) => (
          <div key={item.key} className={index <= currentStepIndex ? "rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary" : "rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground"}>
            {index + 1}. {item.label}
          </div>
        ))}
      </div>

      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {step === "file" ? <ExcelDropzone file={file} disabled={loading} onFile={handleFile} /> : null}
      {step === "sheet" ? <ExcelSheetSelector sheetNames={sheetNames} selectedSheet={selectedSheet} onChange={setSelectedSheet} /> : null}
      {step === "mapping" ? (
        <ExcelColumnMapper
          fields={fields}
          excelHeaders={excelHeaders}
          mapping={mapping}
          onChange={(fieldKey, excelHeader) => setMapping((current) => ({ ...current, [fieldKey]: excelHeader }))}
        />
      ) : null}
      {step === "preview" ? (
        <ExcelPreviewTable
          fields={fields}
          rows={rowsForPreview}
          errors={validation.errors}
          selectedRowIndexes={selectedRowIndexes}
          ubigeoConfig={previewUbigeoConfig}
          onToggleRow={handleToggleRow}
          onToggleAllRows={handleToggleAllRows}
          onChangeCell={handleUpdatePreviewCell}
        />
      ) : null}
    </Modal>
  );
}
