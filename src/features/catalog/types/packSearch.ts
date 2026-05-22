import type { DataTableSearchOption, SmartSearchRuleMode } from "@/shared/components/table/search";

export const PackSearchFields = {
  IS_ACTIVE: "isActive",
  DESCRIPTION: "description",
  TOTAL: "total",
} as const;

export type PackSearchField = typeof PackSearchFields[keyof typeof PackSearchFields];

export const PackSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
  GTE: "gte",
  LTE: "lte",
} as const;

export type PackSearchOperator = typeof PackSearchOperators[keyof typeof PackSearchOperators];

export type PackSearchRule = {
  field: PackSearchField;
  operator: PackSearchOperator;
  mode?: SmartSearchRuleMode;
  value?: string;
  values?: string[];
};

export type PackSearchSnapshot = {
  q?: string;
  filters: PackSearchRule[];
};

export type ListingSearchRecent<T> = { recentId: string; label: string; snapshot: T; lastUsedAt: string };
export type ListingSearchSaved<T> = { metricId: string; name: string; label: string; snapshot: T; updatedAt: string };

export type PackSearchStateResponse = {
  recent: ListingSearchRecent<PackSearchSnapshot>[];
  saved: ListingSearchSaved<PackSearchSnapshot>[];
  catalogs: { activeStates: DataTableSearchOption[] };
};
