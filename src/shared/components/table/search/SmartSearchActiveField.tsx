import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingMultiSelect } from "@/shared/components/components/FloatingMultiSelect";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { FloatingDateRangePicker } from "@/shared/components/components/date-picker/FloatingDateRangePicker";
import { FloatingDateTimePicker } from "@/shared/components/components/date-picker/FloatingDateTimePicker";
import {
  parseStoredDate,
  resolveInputMode,
  resolvePlaceholder,
  toLocalDateKey,
  toLocalDateTimeString,
} from "./smartSearchUtils";
import type {
  SmartSearchFieldConfig,
  SmartSearchRule,
  SmartSearchRuleMode,
} from "./types";

const INCLUDE_EXCLUDE_OPTIONS = [
  { value: "include", label: "Incluye" },
  { value: "exclude", label: "Excluye" },
] as const;

export type SmartSearchActiveFieldProps<
  TFieldKey extends string,
  TOperator extends string,
  TSnapshot,
> = {
  field: SmartSearchFieldConfig<TFieldKey, TOperator>;
  snapshot: TSnapshot;
  getRule: (
    snapshot: TSnapshot,
    fieldId: TFieldKey,
  ) => SmartSearchRule<TFieldKey, TOperator> | null;
  getRuleSummary: (snapshot: TSnapshot, fieldId: TFieldKey) => string | null;
  onApplyRule: (rule: SmartSearchRule<TFieldKey, TOperator>) => void;
  onRemoveRule: (fieldId: TFieldKey) => void;
  onBack: () => void;
};

export function SmartSearchActiveField<
  TFieldKey extends string,
  TOperator extends string,
  TSnapshot,
>({
  field,
  snapshot,
  getRule,
  getRuleSummary,
  onApplyRule,
  onRemoveRule,
  onBack,
}: SmartSearchActiveFieldProps<TFieldKey, TOperator, TSnapshot>) {
  const activeRule = useMemo(
    () => getRule(snapshot, field.id),
    [field.id, getRule, snapshot],
  );
  const [draftMode, setDraftMode] = useState<SmartSearchRuleMode>("include");
  const [draftValues, setDraftValues] = useState<string[]>([]);
  const [draftOperator, setDraftOperator] = useState<TOperator | "">("");
  const [draftValue, setDraftValue] = useState("");
  const [draftRange, setDraftRange] = useState({ start: "", end: "" });

  useEffect(() => {
    setDraftMode(activeRule?.mode ?? "include");
    setDraftValues(activeRule?.values ?? []);
    setDraftOperator(activeRule?.operator ?? field.operators?.[0]?.id ?? "");
    setDraftValue(activeRule?.value ?? "");
    setDraftRange({
      start: activeRule?.range?.start ?? "",
      end: activeRule?.range?.end ?? "",
    });
  }, [activeRule, field]);

  const inputMode = resolveInputMode(field, draftOperator);
  const placeholder = resolvePlaceholder(field, draftOperator);
  const summary = getRuleSummary(snapshot, field.id);

  const handleApply = () => {
    if (!draftOperator) return;

    if (field.kind === "catalog") {
      if (!draftValues.length) {
        onRemoveRule(field.id);
        return;
      }

      onApplyRule({
        field: field.id,
        operator: draftOperator,
        mode: draftMode,
        values: draftValues,
      });
      return;
    }

    if (
      (inputMode === "date-range" || inputMode === "datetime-range") &&
      !draftRange.start &&
      !draftRange.end
    ) {
      onRemoveRule(field.id);
      return;
    }

    if (
      inputMode !== "date-range" &&
      inputMode !== "datetime-range" &&
      !draftValue.trim()
    ) {
      onRemoveRule(field.id);
      return;
    }

    onApplyRule({
      field: field.id,
      operator: draftOperator,
      value:
        inputMode === "date-range" || inputMode === "datetime-range"
          ? undefined
          : draftValue,
      range:
        inputMode === "date-range" || inputMode === "datetime-range"
          ? {
              start: draftRange.start || undefined,
              end: draftRange.end || undefined,
            }
          : undefined,
    });
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-[11px] font-medium"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver
      </button>

      <div className="space-y-3 p-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {field.label}
          </div>
          {field.description ? (
            <p className="mt-1 text-[11px] text-slate-500">
              {field.description}
            </p>
          ) : null}
        </div>

        {field.kind === "catalog" ? (
          <div className="space-y-3">
            {field.supportsExclude ? (
              <FloatingSelect
                label="Modo"
                name={`smart-search-mode-${field.id}`}
                value={draftMode}
                options={INCLUDE_EXCLUDE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onChange={(value) =>
                  setDraftMode(value as SmartSearchRuleMode)
                }
                className="h-10 rounded-sm text-xs"
              />
            ) : null}

            <FloatingMultiSelect
              label={field.label}
              name={`smart-search-values-${field.id}`}
              value={draftValues}
              options={(field.options ?? []).map((option) => ({
                value: option.id,
                label: option.label,
              }))}
              onChange={setDraftValues}
              onSearchChange={field.onSearch}
              searchable
              searchPlaceholder={`Buscar ${field.label.toLowerCase()}...`}
              emptyMessage="Sin resultados"
              className="h-10 rounded-sm text-xs"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <FloatingSelect
              label="Condicion"
              name={`smart-search-operator-${field.id}`}
              value={draftOperator}
              options={(field.operators ?? []).map((operator) => ({
                value: operator.id,
                label: operator.label,
              }))}
              onChange={(value) => setDraftOperator(value as TOperator)}
              className="h-10 rounded-sm text-xs"
            />

            {inputMode === "text" || inputMode === "number" ? (
              <FloatingInput
                label="Valor"
                name={`smart-search-value-${field.id}`}
                type={inputMode === "number" ? "number" : "text"}
                step={inputMode === "number" ? "any" : undefined}
                value={draftValue}
                onChange={(event) => setDraftValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  handleApply();
                }}
                className="h-10 rounded-sm text-xs"
              />
            ) : null}

            {inputMode === "date" ? (
              <FloatingDatePicker
                label="Fecha"
                name={`smart-search-date-${field.id}`}
                value={parseStoredDate(draftValue)}
                onChange={(date) => setDraftValue(date ? toLocalDateKey(date) : "")}
                className="h-10 rounded-sm text-xs"
                placeholder={placeholder}
              />
            ) : null}

            {inputMode === "datetime" ? (
              <FloatingDateTimePicker
                label="Fecha y hora"
                name={`smart-search-datetime-${field.id}`}
                value={parseStoredDate(draftValue)}
                onChange={(date) =>
                  setDraftValue(date ? toLocalDateTimeString(date) : "")
                }
                className="h-10 rounded-sm text-xs"
                placeholder={placeholder}
              />
            ) : null}

            {inputMode === "date-range" ? (
              <FloatingDateRangePicker
                label="Rango"
                name={`smart-search-date-range-${field.id}`}
                startDate={parseStoredDate(draftRange.start)}
                endDate={parseStoredDate(draftRange.end)}
                onChange={({ startDate, endDate }) =>
                  setDraftRange({
                    start: startDate ? toLocalDateKey(startDate) : "",
                    end: endDate ? toLocalDateKey(endDate) : "",
                  })
                }
                className="h-10 rounded-sm text-xs"
              />
            ) : null}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <SystemButton
            variant="outline"
            size="custom"
            onClick={handleApply}
            className="rounded-sm px-3 py-2 text-[11px]"
          >
            Aplicar
          </SystemButton>
        </div>
      </div>

      {summary ? (
        <div className=" bg-slate-50 px-4 py-3 text-[12px] text-slate-600">
          Filtro actual: {summary}
        </div>
      ) : null}
    </div>
  );
}
