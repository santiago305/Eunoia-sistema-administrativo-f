import type { DataTableSearchOption } from "@/shared/components/table/search";

export const PaymentAccountSearchFields = {
  TYPE: "type",
  STATUS: "status",
  CURRENCY: "currency",
  DEFAULT: "default",
} as const;

export type PaymentAccountSearchField =
  typeof PaymentAccountSearchFields[keyof typeof PaymentAccountSearchFields];

export const PaymentAccountSearchOperators = {
  IN: "in",
} as const;

export type PaymentAccountSearchOperator =
  typeof PaymentAccountSearchOperators[keyof typeof PaymentAccountSearchOperators];

export interface PaymentAccountSearchRule {
  field: PaymentAccountSearchField;
  operator: PaymentAccountSearchOperator;
  mode?: "include" | "exclude";
  values?: string[];
}

export interface PaymentAccountSearchSnapshot {
  q?: string;
  filters: PaymentAccountSearchRule[];
}

export interface PaymentAccountSearchStateResponse {
  recent: [];
  saved: [];
  catalogs: {
    types: DataTableSearchOption[];
    statuses: DataTableSearchOption[];
    currencies: DataTableSearchOption[];
    defaults: DataTableSearchOption[];
  };
}
