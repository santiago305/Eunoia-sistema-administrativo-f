import { z } from "zod";
import type {
  DataTableSearchOption,
  SmartSearchRangeValue,
  SmartSearchRuleMode,
} from "@/components/table/search";
import {
  createSupplierSchema,
  updateSupplierSchema,
  updateSupplierActiveSchema,
  listSuppliersQuerySchema,
} from "@/schemas/supplierSchemas";
import { DocumentType } from "./DocumentType";

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierDto = z.infer<typeof updateSupplierSchema>;
export type UpdateSupplierActiveDto = z.infer<typeof updateSupplierActiveSchema>;

export const ProviderSearchFields = {
  DOCUMENT_TYPE: "documentType",
  DOCUMENT_NUMBER: "documentNumber",
  NAME: "name",
  LAST_NAME: "lastName",
  TRADE_NAME: "tradeName",
  PHONE: "phone",
  EMAIL: "email",
  IS_ACTIVE: "isActive",
} as const;

export type ProviderSearchField =
  typeof ProviderSearchFields[keyof typeof ProviderSearchFields];

export const ProviderSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
} as const;

export type ProviderSearchOperator =
  typeof ProviderSearchOperators[keyof typeof ProviderSearchOperators];

export type ProviderSearchRule = {
  field: ProviderSearchField;
  operator: ProviderSearchOperator;
  mode?: SmartSearchRuleMode;
  value?: string;
  values?: string[];
  range?: SmartSearchRangeValue;
};

export type ProviderSearchFilters = ProviderSearchRule[];

export type ProviderSearchSnapshot = {
  q?: string;
  filters: ProviderSearchFilters;
};

export type ProviderRecentSearch = {
  recentId: string;
  label: string;
  snapshot: ProviderSearchSnapshot;
  lastUsedAt: string;
};

export type ProviderSavedMetric = {
  metricId: string;
  name: string;
  label: string;
  snapshot: ProviderSearchSnapshot;
  updatedAt: string;
};

export type ProviderSearchStateResponse = {
  recent: ProviderRecentSearch[];
  saved: ProviderSavedMetric[];
  catalogs: {
    documentTypes: DataTableSearchOption[];
    activeStates: DataTableSearchOption[];
  };
};

export type ListSuppliersQuery = Omit<z.infer<typeof listSuppliersQuerySchema>, "filters"> & {
  filters?: ProviderSearchFilters | string;
};

export type Supplier = {
  supplierId: string;
  documentType: DocumentType;
  documentNumber: string;
  name?: string | null;
  lastName?: string | null;
  tradeName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
  leadTimeDays?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SupplierOption = { value: string; label: string; days?: number | null };


export type SupplierForm = {
  documentType: DocumentType;
  documentNumber: string;
  name: string;
  lastName: string;
  tradeName: string;
  address: string;
  phone: string;
  email: string;
  note: string;
  leadTimeDays: string;
  isActive: boolean;
};

export type SupplierListResponse = {
  items: Supplier[];
  total: number;
  page: number;
  limit: number;
};

export type SupplierIdentityLookupResult = {
  documentType: string;
  documentNumber: string;
  data: SupplierDniLookupData | SupplierRucLookupData | null;
};

export type SupplierDniLookupData = {
  name?: string;
  lastName?: string;
};

export type SupplierRucLookupData = {
  tradeName?: string;
  address?: string;
  ubigueo?: string;
};


