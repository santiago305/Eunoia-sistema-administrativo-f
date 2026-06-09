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
  isActive?: boolean;
  subsidiaries: SubsidiaryPayload[];
};

export type UpdateAgencyBody = {
  name?: string;
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
