import type { AgencySearchRule } from "./agencySearch";

export type AgencyListItem = {
  id: string;
  name: string;
  reference?: string | null;
  address?: string | null;
  departmentId: string;
  provinceId: string;
  districtId: string;
  isActive: boolean;
};

export type AgencyDetail = AgencyListItem & {
  createdAt: string;
  updatedAt: string;
};

export type CreateAgencyBody = {
  name: string;
  reference?: string;
  address: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  isActive: boolean;
};

export type UpdateAgencyBody = {
  name?: string;
  reference?: string;
  address?: string;
  departmentId?: string;
  provinceId?: string;
  districtId?: string;
};

export type AgenciesListQuery = {
  q?: string;
  page?: number;
  limit?: number;
  isActive?: "true" | "false";
  filters?: AgencySearchRule[] | string;
};

