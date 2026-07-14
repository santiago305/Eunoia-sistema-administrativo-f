export type Subsidiary = {
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

export type Agency = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  subsidiaries?: Subsidiary[];
};

export type AgencySubsidiaryForm = {
  id?: string;
  alias: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  address: string;
  basePrice: number | string;
  note: string;
  isActive: boolean;
};

export type AgencyForm = {
  name: string;
  description?: string | null;
  isActive: boolean;
  subsidiaries: AgencySubsidiaryForm[];
};
