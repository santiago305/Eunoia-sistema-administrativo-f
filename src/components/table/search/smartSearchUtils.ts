import type {
  SmartSearchFieldConfig,
  SmartSearchInputMode,
} from "./types";

export function normalizeSearchText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function includesNormalizedText(
  value: string | undefined | null,
  query: string,
) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return normalizeSearchText(value).includes(normalizedQuery);
}

export function parseStoredDate(value?: string | null) {
  if (!value) return null;
  const normalized =
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toLocalDateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export function toLocalDateTimeString(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}`;
}

export function resolveInputMode<
  TFieldKey extends string,
  TOperator extends string,
>(
  field: SmartSearchFieldConfig<TFieldKey, TOperator>,
  operatorId?: TOperator | "",
): SmartSearchInputMode {
  if (operatorId && field.operatorInputMode?.[operatorId]) {
    return field.operatorInputMode[operatorId] as SmartSearchInputMode;
  }

  const operator = field.operators?.find((item) => item.id === operatorId);
  if (operator?.inputMode) return operator.inputMode;

  if (field.kind === "number") return "number";
  if (field.kind === "date") return "date";
  return "text";
}

export function resolvePlaceholder<
  TFieldKey extends string,
  TOperator extends string,
>(
  field: SmartSearchFieldConfig<TFieldKey, TOperator>,
  operatorId?: TOperator | "",
) {
  if (operatorId && field.operatorPlaceholder?.[operatorId]) {
    return field.operatorPlaceholder[operatorId];
  }

  const operator = field.operators?.find((item) => item.id === operatorId);
  return operator?.placeholder ?? field.placeholder;
}
