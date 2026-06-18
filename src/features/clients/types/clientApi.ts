export type ClientApiType = "NEW" | "LAGGING" | "REPURCHASE" | "UNDEFINED";
export type ClientApiDocType = "DNI" | "CE" | "RUC" | "NONE";

export type ClientListItem = {
  id: string;
  type: ClientApiType;
  fullName: string;
  docType: ClientApiDocType;
  docNumber: string;
  reference?: string;
  address?: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  isActive: boolean;
};

export type Paginated<T> = { items: T[]; total: number; page: number; limit: number };

export type ClientDetail = {
  id: string;
  type: ClientApiType;
  fullName: string;
  docType: ClientApiDocType;
  docNumber: string;
  reference?: string | null;
  address?: string | null;
  departmentId: string;
  provinceId: string;
  districtId: string;
  isActive: boolean;
  telephones: Array<{
    id: string;
    number: string;
    isActive: boolean;
    isMain: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type CreateClientBody = {
  type: ClientApiType;
  fullName: string;
  docType: ClientApiDocType;
  docNumber: string;
  reference?: string;
  address?: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  isActive?: boolean;
  telephonesReplace?: Array<{
    number: string;
    isMain?: boolean;
    isActive?: boolean;
  }>;
};

export type UpdateClientBody = {
  type?: ClientApiType;
  fullName?: string;
  docType?: ClientApiDocType;
  docNumber?: string;
  reference?: string;
  address?: string;
  departmentId?: string;
  provinceId?: string;
  districtId?: string;
  telephonesReplace?: Array<{
    id?: string;
    number?: string;
    isMain?: boolean;
    isActive?: boolean;
  }>;
};
