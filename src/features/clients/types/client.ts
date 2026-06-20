export type ClientType = "NEW" | "LAGGING" | "REPURCHASE" | "UNDEFINED";
export type ClientDocType = "DNI" | "CE" | "RUC" | "NONE";
export enum ClientDocTypeEnum {
  DNI = "DNI",
  CE = "CE",
  RUC = "RUC",
  NONE = "NONE",
}
export type Client = {
  id: string;
  type: ClientType;
  fullName: string;
  docType: ClientDocType;
  docNumber: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  address?: string | null;
  reference?: string | null;
  isActive: boolean;
};

export type ClientForm = {
  type: ClientType;
  fullName: string;
  docType: ClientDocType;
  docNumber: string;
  departmentId: string;
  provinceId: string;
  districtId: string;
  address: string;
  reference: string;
  isActive: boolean;
  telephonesReplace?: Array<{
    id?: string;
    number?: string;
    isMain?: boolean;
  }>;
};
