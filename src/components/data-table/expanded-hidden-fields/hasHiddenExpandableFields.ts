import type { VisibilityState } from "@tanstack/react-table";
import type { ExpandedFieldConfig } from "../type";

export function hasHiddenExpandableFields<TData extends Record<string, any>>(
  fields: ExpandedFieldConfig<TData>[],
  columnVisibility: VisibilityState
) {
  return fields.some((field) => columnVisibility[field.key] === false);
}