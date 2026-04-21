import { useMemo, useState } from "react";
import { SmartSearchActiveField } from "./SmartSearchActiveField";
import { SmartSearchFieldsSection } from "./SmartSearchFieldsSection";
import { SmartSearchRecentSection } from "./SmartSearchRecentSection";
import { SmartSearchSavedMetricsSection } from "./SmartSearchSavedMetricsSection";
import { includesNormalizedText, normalizeSearchText } from "./smartSearchUtils";
import type {
  DataTableRecentSearchItem,
  DataTableSavedSearchItem,
  SmartSearchFieldConfig,
  SmartSearchRule,
} from "./types";

const DEFAULT_VISIBLE_FIELDS = 4;

type Props<
  TFieldKey extends string,
  TOperator extends string,
  TSnapshot,
> = {
  recent?: DataTableRecentSearchItem<TSnapshot>[];
  saved?: DataTableSavedSearchItem<TSnapshot>[];
  fields: SmartSearchFieldConfig<TFieldKey, TOperator>[];
  snapshot: TSnapshot;
  onApplySnapshot: (snapshot: TSnapshot) => void;
  onApplyRule: (rule: SmartSearchRule<TFieldKey, TOperator>) => void;
  onRemoveRule: (fieldId: TFieldKey) => void;
  onDeleteMetric?: (metricId: string) => void;
  getRule: (
    snapshot: TSnapshot,
    fieldId: TFieldKey,
  ) => SmartSearchRule<TFieldKey, TOperator> | null;
  getRuleSummary: (snapshot: TSnapshot, fieldId: TFieldKey) => string | null;
  getSelectionCount: (snapshot: TSnapshot, fieldId: TFieldKey) => number;
  fieldsSectionTitle?: string;
  fieldsSectionDescription?: string;
  initialVisibleFields?: number;
  filterQuery?: string;
};

export function SmartSearchPanel<
  TFieldKey extends string,
  TOperator extends string,
  TSnapshot,
>({
  recent = [],
  saved = [],
  fields,
  snapshot,
  onApplySnapshot,
  onApplyRule,
  onRemoveRule,
  onDeleteMetric,
  getRule,
  getRuleSummary,
  getSelectionCount,
  fieldsSectionTitle = "Columnas",
  fieldsSectionDescription = "Selecciona una columna para filtrar rapidamente.",
  initialVisibleFields = DEFAULT_VISIBLE_FIELDS,
  filterQuery,
}: Props<TFieldKey, TOperator, TSnapshot>) {
  const [activeFieldId, setActiveFieldId] = useState<TFieldKey | null>(null);
  const [showAllFields, setShowAllFields] = useState(false);
  const normalizedFilterQuery = normalizeSearchText(filterQuery);

  const activeField = useMemo(
    () => fields.find((field) => field.id === activeFieldId) ?? null,
    [activeFieldId, fields],
  );

  const filteredFields = useMemo(() => {
    if (!normalizedFilterQuery) return fields;
    return fields.filter((field) =>
      includesNormalizedText(
        [field.label, field.description].filter(Boolean).join(" "),
        normalizedFilterQuery,
      ),
    );
  }, [fields, normalizedFilterQuery]);

  const filteredRecent = useMemo(() => {
    if (!normalizedFilterQuery) return recent;
    return recent.filter((item) =>
      includesNormalizedText(item.label, normalizedFilterQuery),
    );
  }, [normalizedFilterQuery, recent]);

  const filteredSaved = useMemo(() => {
    if (!normalizedFilterQuery) return saved;
    return saved.filter((metric) =>
      includesNormalizedText(
        [metric.name, metric.label].filter(Boolean).join(" "),
        normalizedFilterQuery,
      ),
    );
  }, [normalizedFilterQuery, saved]);

  const visibleFields = showAllFields
    ? filteredFields
    : filteredFields.slice(0, initialVisibleFields);

  const hasMoreFields = filteredFields.length > initialVisibleFields;
  const showEmptyState =
    Boolean(normalizedFilterQuery) &&
    !filteredFields.length &&
    !filteredRecent.length &&
    !filteredSaved.length;

  if (activeField) {
    return (
      <SmartSearchActiveField
        field={activeField}
        snapshot={snapshot}
        getRule={getRule}
        getRuleSummary={getRuleSummary}
        onApplyRule={onApplyRule}
        onRemoveRule={onRemoveRule}
        onBack={() => setActiveFieldId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <SmartSearchRecentSection
        items={filteredRecent}
        onApplySnapshot={onApplySnapshot}
      />

      <SmartSearchFieldsSection
        fields={filteredFields}
        snapshot={snapshot}
        getRuleSummary={getRuleSummary}
        getSelectionCount={getSelectionCount}
        fieldsSectionTitle={fieldsSectionTitle}
        fieldsSectionDescription={fieldsSectionDescription}
        visibleFields={visibleFields}
        hasMoreFields={hasMoreFields}
        showAllFields={showAllFields}
        onToggleShowAll={() => setShowAllFields((prev) => !prev)}
        onSelectField={setActiveFieldId}
      />

      <SmartSearchSavedMetricsSection
        items={filteredSaved}
        onApplySnapshot={onApplySnapshot}
        onDeleteMetric={onDeleteMetric}
      />

      {showEmptyState ? (
        <div className="rounded-xl bg-slate-50 px-4 py-5 text-center text-[11px] text-slate-500">
          No hay resultados para esta busqueda.
        </div>
      ) : null}
    </div>
  );
}
