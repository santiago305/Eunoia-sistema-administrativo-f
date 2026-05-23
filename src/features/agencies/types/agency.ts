export type Agency = {
  id: string;
  name: string;
  reference: string | null;
  address: string | null;
  departmentId: string;
  provinceId: string;
  districtId: string;
  isActive: boolean;
};

export type AgencyForm = {
  name: string;
  reference: string;
  address: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  isActive: boolean;
};

