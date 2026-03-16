import type { VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { ExpandedFieldConfig } from "../type";

type Props<TData extends Record<string, any>> = {
  row: TData;
  fields: ExpandedFieldConfig<TData>[];
  columnVisibility: VisibilityState;
  className?: string;
};

function isEmptyValue(value: unknown) {
  return value === null || value === undefined || value === "";
}

export function getHiddenExpandedFields<TData extends Record<string, any>>(
  fields: ExpandedFieldConfig<TData>[],
  columnVisibility: VisibilityState
) {
  return fields.filter((field) => columnVisibility[field.key] === false);
}

export function ExpandedHiddenFields<TData extends Record<string, any>>({
  row,
  fields,
  columnVisibility,
  className,
}: Props<TData>) {
  const hiddenFields = getHiddenExpandedFields(fields, columnVisibility);

  if (hiddenFields.length === 0) return null;

  return (
    <div className={className ?? "grid gap-3 md:grid-cols-2 xl:grid-cols-4"}>
      {hiddenFields.map((field) => {
        const rawValue = row[field.key];
        const content: ReactNode = field.render
          ? field.render(rawValue, row)
          : isEmptyValue(rawValue)
            ? (field.emptyValue ?? "-")
            : String(rawValue);

        return (
          <div key={field.key} className="rounded-xl border border-black/10 bg-white p-3">
            <div className="text-[10px] uppercase tracking-wide text-black/45">
              {field.label}
            </div>

            <div className="mt-1 whitespace-pre-wrap text-sm text-black/75">
              {content}
            </div>
          </div>
        );
      })}
    </div>
  );
}