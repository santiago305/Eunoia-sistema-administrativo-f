import type { AgencySearchRule } from "./agencySearch";

export type SubsidiaryDto = {
  id: string;
  agencyId: string;
  alias: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  address?: string | null;
  basePrice: number;
  note?: string | null;
  isActive: boolean;
};

export type AgencyListItem = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  subsidiaries?: SubsidiaryDto[];
};

export type AgencyDetail = AgencyListItem & {
  createdAt?: string;
  updatedAt?: string;
};

export type SubsidiaryPayload = {
  id?: string;
  alias: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  address?: string;
  basePrice?: number;
  note?: string;
  isActive?: boolean;
};

export type CreateAgencyBody = {
  name: string;
  description?: string | null;
  isActive?: boolean;
  subsidiaries: SubsidiaryPayload[];
};

export type UpdateAgencyBody = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  subsidiaries?: SubsidiaryPayload[];
};

export type AgenciesListQuery = {
  q?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
  filters?: AgencySearchRule[] | string;
};

export type SubsidiariesListQuery = {
  q?: string;
  agencyId?: string;
  isActive?: boolean;
};

export type AgencyJsonImportRow = {
  department: string;
  province: string;
  district: string;
  address?: string;
  alias: string;
  price?: number;
};

export type AgencyImportCreateResponse = {
  totalRows: number;
  importedRows: number;
  failedRows: number;
  agencyId: string | null;
  rows: Array<{ rowNumber: number; subsidiaryId: string; alias: string }>;
  errors: Array<{ rowNumber: number; alias?: string; message: string }>;
};

export type AgencyExportColumn = {
  key: string;
  label: string;
};

export type AgencyExportPreset = {
  metricId: string;
  name: string;
  label?: string;
  snapshot?: {
    columns?: AgencyExportColumn[];
  };
};
