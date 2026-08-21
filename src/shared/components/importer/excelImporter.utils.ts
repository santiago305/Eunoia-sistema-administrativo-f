import * as XLSX from "xlsx";
import type { ExcelColumnMapping, ExcelRow, ExcelRowError, ExcelValidationResult, ExcelWorkbook, ImportField } from "./excelImporter.types";

const TRUE_VALUES = new Set(["true", "1", "si", "sí", "yes", "y", "x"]);
const FALSE_VALUES = new Set(["false", "0", "no", "n"]);

export async function readWorkbook(file: File): Promise<ExcelWorkbook> {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: "array", cellDates: true });
}

export function getSheetNames(workbook: ExcelWorkbook): string[] {
  return workbook.SheetNames ?? [];
}

export function sheetToRows(workbook: ExcelWorkbook, sheetName: string): ExcelRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  return XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
    defval: "",
    // Preserve real Excel date cells as Date instances. Formatting them here
    // turns the same date into locale-dependent strings such as 8/20/26.
    raw: true,
  });
}

export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function autoMapColumns(fields: ImportField[], excelHeaders: string[]): ExcelColumnMapping {
  const normalizedHeaders = new Map(excelHeaders.map((header) => [normalizeHeader(header), header]));

  return fields.reduce<ExcelColumnMapping>((mapping, field) => {
    const candidates = [field.label, field.key, ...(field.aliases ?? [])].map(normalizeHeader);
    const header = candidates.map((candidate) => normalizedHeaders.get(candidate)).find(Boolean);

    if (header) {
      mapping[field.key] = header;
    }

    return mapping;
  }, {});
}

export function applyMapping(rows: ExcelRow[], mapping: ExcelColumnMapping, fields: ImportField[]): ExcelRow[] {
  return rows.map((row) => {
    return fields.reduce<ExcelRow>((mappedRow, field) => {
      const sourceColumn = mapping[field.key];
      const originalValue = sourceColumn ? row[sourceColumn] : "";
      const typedValue = convertValue(originalValue, field.type);
      mappedRow[field.key] = field.transform ? field.transform(typedValue) : typedValue;
      return mappedRow;
    }, {});
  });
}

export function validateRows(
  mappedRows: ExcelRow[],
  fields: ImportField[],
  selectedRowIndexes?: ReadonlySet<number>,
): ExcelValidationResult {
  const errors: ExcelRowError[] = [];

  mappedRows.forEach((row, rowIndex) => {
    if (selectedRowIndexes && !selectedRowIndexes.has(rowIndex)) return;

    fields.forEach((field) => {
      const value = row[field.key];

      if (field.required && isEmpty(value)) {
        errors.push({ rowIndex, fieldKey: field.key, message: `${field.label} es requerido.` });
        return;
      }

      if (!isEmpty(value) && field.type === "number" && !isValidNumber(value)) {
        errors.push({ rowIndex, fieldKey: field.key, message: `${field.label} debe ser un número válido.` });
        return;
      }

      if (!isEmpty(value) && field.type === "date" && !isValidDateInput(value)) {
        errors.push({ rowIndex, fieldKey: field.key, message: `${field.label} debe ser una fecha válida.` });
        return;
      }

      const customError = field.validate?.(value, row);
      if (customError) {
        errors.push({ rowIndex, fieldKey: field.key, message: customError });
      }
    });
  });

  return { errors, hasErrors: errors.length > 0 };
}

export function updateMappedRowValue(
  mappedRows: ExcelRow[],
  rowIndex: number,
  field: ImportField,
  value: unknown,
): ExcelRow[] {
  return mappedRows.map((row, currentIndex) => {
    if (currentIndex !== rowIndex) return row;

    const typedValue = convertValue(value, field.type);
    return {
      ...row,
      [field.key]: field.transform ? field.transform(typedValue) : typedValue,
    };
  });
}

export function getSelectableRows(mappedRows: ExcelRow[], selectedRowIndexes: ReadonlySet<number>): ExcelRow[] {
  return mappedRows.filter((_, rowIndex) => selectedRowIndexes.has(rowIndex));
}

export function getExcelHeaders(rows: ExcelRow[]): string[] {
  const headers = new Set<string>();
  rows.forEach((row) => Object.keys(row).forEach((key) => headers.add(key)));
  return Array.from(headers);
}

function convertValue(value: unknown, type: ImportField["type"]): unknown {
  if (isEmpty(value)) return "";
  if (type === "number") return toNumber(value);
  if (type === "boolean") return toBoolean(value);
  if (type === "date") return toDateInputValue(value);
  return String(value).trim();
}

function toNumber(value: unknown): unknown {
  if (typeof value === "number") return value;
  const normalized = String(value).trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : value;
}

function toBoolean(value: unknown): unknown {
  if (typeof value === "boolean") return value;
  const normalized = normalizeHeader(value);
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return value;
}

function toDateInputValue(value: unknown): unknown {
  if (value instanceof Date) {
    return isValidDate(value)
      ? formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate())
      : value;
  }

  if (typeof value === "number") {
    return excelSerialToDate(value) ?? value;
  }

  const text = String(value).trim();
  const dateText = stripLeadingTime(text);
  const isoMatch = dateText.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:$|[T\s])/);
  if (isoMatch) {
    return formatValidDateParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3])) ?? text;
  }

  const separatedMatch = dateText.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:$|[T\s,])/);
  if (separatedMatch) {
    let first = Number(separatedMatch[1]);
    let second = Number(separatedMatch[2]);
    const year = normalizeYear(Number(separatedMatch[3]));

    // Peru uses day/month. If the second part cannot be a month, the source
    // is the common Excel month/day format and the parts must be swapped.
    if (second > 12 && first <= 12) {
      [first, second] = [second, first];
    }

    return formatValidDateParts(year, second, first) ?? text;
  }

  if (/^\d+(?:\.\d+)?$/.test(dateText)) {
    return excelSerialToDate(Number(dateText)) ?? text;
  }

  return text;
}

function stripLeadingTime(value: string): string {
  const match = value.match(/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\s+(.+)$/);
  return match?.[1]?.trim() || value;
}

function normalizeYear(year: number): number {
  if (year >= 100) return year;
  return year >= 70 ? 1900 + year : 2000 + year;
}

function excelSerialToDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2_958_465) return null;

  const utcMilliseconds = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000;
  const date = new Date(utcMilliseconds);
  return formatDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function formatValidDateParts(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return formatDateParts(year, month, day);
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function isValidDateInput(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return Boolean(
    match
    && formatValidDateParts(Number(match[1]), Number(match[2]), Number(match[3])) === value,
  );
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

function isValidNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}
