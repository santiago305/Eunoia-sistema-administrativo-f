import type {
  DataTableSearchOption,
  SmartSearchRuleMode,
} from "@/shared/components/table/search";

export const AgencySearchFields = {
  NAME: "name",
  ALIAS: "alias",
  ADDRESS: "address",
  DEPARTMENT_ID: "departmentId",
  PROVINCE_ID: "provinceId",
  DISTRICT_ID: "districtId",
  IS_ACTIVE: "isActive",
} as const;

export type AgencySearchField =
  typeof AgencySearchFields[keyof typeof AgencySearchFields];

export const AgencySearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
} as const;

export type AgencySearchOperator =
  typeof AgencySearchOperators[keyof typeof AgencySearchOperators];

export type AgencySearchRule = {
  field: AgencySearchField;
  operator: AgencySearchOperator;
  mode?: SmartSearchRuleMode;
  value?: string;
  values?: string[];
};

export type AgencySearchSnapshot = {
  q?: string;
  filters: AgencySearchRule[];
};

export type AgencyRecentSearch = {
  recentId: string;
  label: string;
  snapshot: AgencySearchSnapshot;
  lastUsedAt: string;
};

export type AgencySavedMetric = {
  metricId: string;
  name: string;
  label: string;
  snapshot: AgencySearchSnapshot;
  updatedAt: string;
};

export type AgencySearchStateResponse = {
  recent: AgencyRecentSearch[];
  saved: AgencySavedMetric[];
  catalogs: {
    activeStates: DataTableSearchOption[];
    departments: DataTableSearchOption[];
    provinces: DataTableSearchOption[];
    districts: DataTableSearchOption[];
  };
};

export type AgencySearchCatalogs = AgencySearchStateResponse["catalogs"];
