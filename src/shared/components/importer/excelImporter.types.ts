import type { WorkBook } from "xlsx";

export type ImportFieldType = "string" | "number" | "date" | "boolean";

export type ImportField = {
  key: string;
  label: string;
  required?: boolean;
  type?: ImportFieldType;
  aliases?: string[];
  validate?: (value: unknown, row: Record<string, unknown>) => string | null;
  transform?: (value: unknown) => unknown;
};

export type ImportUbigeoCatalog = {
  departments: Array<{ id: string; name: string }>;
  provinces: Array<{ id: string; name: string; departmentId: string }>;
  districts: Array<{ id: string; name: string; provinceId: string; departmentId: string }>;
};

export type ImportUbigeoConfig = {
  departmentKey: string;
  provinceKey: string;
  districtKey: string;
  valueMode?: "id" | "name";
  catalog?: ImportUbigeoCatalog;
};

export type ExcelRow = Record<string, unknown>;

export type ExcelColumnMapping = Record<string, string>;

export type ExcelRowError = {
  rowIndex: number;
  fieldKey: string;
  message: string;
};

export type ExcelValidationResult = {
  errors: ExcelRowError[];
  hasErrors: boolean;
};

export type ExcelImportModalProps<TData extends Record<string, unknown>> = {
  open: boolean;
  title?: string;
  fields: ImportField[];
  onClose: () => void;
  onSubmit: (data: TData[], file: File) => void | Promise<void>;
  maxRows?: number;
  ubigeoConfig?: ImportUbigeoConfig;
};

export type ExcelWorkbook = WorkBook;
