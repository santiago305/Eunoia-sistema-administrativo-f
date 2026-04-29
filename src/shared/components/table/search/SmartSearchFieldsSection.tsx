import { ChevronDown } from "lucide-react";
import type { SmartSearchFieldConfig } from "./types";
// colunmas
type Props<TFieldKey extends string, TOperator extends string, TSnapshot> = {
  fields: SmartSearchFieldConfig<TFieldKey, TOperator>[];
  snapshot: TSnapshot;
  getRuleSummary: (snapshot: TSnapshot, fieldId: TFieldKey) => string | null;
  getSelectionCount: (snapshot: TSnapshot, fieldId: TFieldKey) => number;
  fieldsSectionTitle: string;
  fieldsSectionDescription: string;
  visibleFields: SmartSearchFieldConfig<TFieldKey, TOperator>[];
  hasMoreFields: boolean;
  showAllFields: boolean;
  onToggleShowAll: () => void;
  onSelectField: (fieldId: TFieldKey) => void;
};

export function SmartSearchFieldsSection<
  TFieldKey extends string,
  TOperator extends string,
  TSnapshot,
>({
  fields,
  snapshot,
  getRuleSummary,
  getSelectionCount,
  fieldsSectionTitle,
  fieldsSectionDescription,
  visibleFields,
  hasMoreFields,
  showAllFields,
  onToggleShowAll,
  onSelectField,
}: Props<TFieldKey, TOperator, TSnapshot>) {
  if (!fields.length) return null;

  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          {fieldsSectionTitle}
        </h3>
        {fieldsSectionDescription ? (
          <p className="text-[11px] text-slate-500">
            {fieldsSectionDescription}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        {visibleFields.map((field) => {
          const count = getSelectionCount(snapshot, field.id);
          const summary = getRuleSummary(snapshot, field.id);

          return (
            <button
              key={field.id}
              type="button"
              onClick={() => onSelectField(field.id)}
              className="flex w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left transition hover:bg-slate-100"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-slate-800">
                  {field.label}
                </div>
                {summary ? (
                  <div className="truncate text-[11px] text-slate-500">
                    {summary}
                  </div>
                ) : null}
              </div>

              {count ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-medium text-white">
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {hasMoreFields ? (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={onToggleShowAll}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <span>{showAllFields ? "Ver menos" : "Ver mas"}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                showAllFields ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      ) : null}
    </section>
  );
}
