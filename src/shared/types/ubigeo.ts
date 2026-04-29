export type UbigeoDepartment = {
  id: string;
  name: string;
};

export type UbigeoProvince = {
  id: string;
  name: string;
  departmentId: string;
};

export type UbigeoDistrict = {
  id: string;
  name: string;
  provinceId: string;
  departmentId: string;
};

export type UbigeoSelection = {
  ubigeo: string;
  department: string;
  province: string;
  district: string;
};
