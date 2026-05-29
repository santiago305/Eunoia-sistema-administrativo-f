import type { DataTableSearchOption, SmartSearchRuleMode } from "@/shared/components/table/search";

export const SourceSearchFields = {
  NAME: "name",
  DETAIL: "detail",
  IS_ACTIVE: "isActive",
} as const;

export type SourceSearchField = typeof SourceSearchFields[keyof typeof SourceSearchFields];

export const SourceSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
} as const;

export type SourceSearchOperator = typeof SourceSearchOperators[keyof typeof SourceSearchOperators];

export type SourceSearchRule = {
  field: SourceSearchField;
  operator: SourceSearchOperator;
  mode?: SmartSearchRuleMode;
  value?: string;
  values?: string[];
};

export type SourceSearchSnapshot = {
  q?: string;
  filters: SourceSearchRule[];
};

export type SourceRecentSearch = {
  recentId: string;
  label: string;
  snapshot: SourceSearchSnapshot;
  lastUsedAt: string;
};

export type SourceSavedMetric = {
  metricId: string;
  name: string;
  label: string;
  snapshot: SourceSearchSnapshot;
  updatedAt: string;
};

export type SourceSearchStateResponse = {
  recent: SourceRecentSearch[];
  saved: SourceSavedMetric[];
  catalogs: {
    activeStates: DataTableSearchOption[];
  };
};

export type SourceSearchCatalogs = SourceSearchStateResponse["catalogs"];

