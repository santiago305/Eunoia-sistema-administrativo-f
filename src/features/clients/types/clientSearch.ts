import type {
  DataTableSearchOption,
  SmartSearchRangeValue,
  SmartSearchRuleMode,
} from "@/shared/components/table/search";

export const ClientSearchFields = {
  FULL_NAME: "fullName",
  DOC_NUMBER: "docNumber",
  ADDRESS: "address",
  REFERENCE: "reference",
  TYPE: "type",
  DOC_TYPE: "docType",
  DEPARTMENT_ID: "departmentId",
  PROVINCE_ID: "provinceId",
  DISTRICT_ID: "districtId",
  IS_ACTIVE: "isActive",
} as const;

export type ClientSearchField =
  typeof ClientSearchFields[keyof typeof ClientSearchFields];

export const ClientSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
} as const;

export type ClientSearchOperator =
  typeof ClientSearchOperators[keyof typeof ClientSearchOperators];

export type ClientSearchRule = {
  field: ClientSearchField;
  operator: ClientSearchOperator;
  mode?: SmartSearchRuleMode;
  value?: string;
  values?: string[];
  range?: SmartSearchRangeValue;
};

export type ClientSearchFilters = ClientSearchRule[];

export type ClientSearchSnapshot = {
  q?: string;
  filters: ClientSearchFilters;
};

export type ClientRecentSearch = {
  recentId: string;
  label: string;
  snapshot: ClientSearchSnapshot;
  lastUsedAt: string;
};

export type ClientSavedMetric = {
  metricId: string;
  name: string;
  label: string;
  snapshot: ClientSearchSnapshot;
  updatedAt: string;
};

export type ClientSearchStateResponse = {
  recent: ClientRecentSearch[];
  saved: ClientSavedMetric[];
  catalogs: {
    activeStates: DataTableSearchOption[];
    docTypes: DataTableSearchOption[];
    clientTypes: DataTableSearchOption[];
    departments: DataTableSearchOption[];
    provinces: DataTableSearchOption[];
    districts: DataTableSearchOption[];
  };
};

export type ClientSearchCatalogs = ClientSearchStateResponse["catalogs"];

