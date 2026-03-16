import type { ReactNode } from "react";

export type ExpandedFieldConfig<TData extends Record<string, any>> = {
  key: keyof TData & string;
  label: string;
  render?: (value: TData[keyof TData], row: TData) => ReactNode;
  emptyValue?: ReactNode;
};