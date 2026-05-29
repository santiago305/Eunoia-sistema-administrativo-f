export type BankAccount = {
  id: string;
  companyId: string;
  name: string;
  number: string | null;
  isActive: boolean;
};

export type CreateBankAccountDto = {
  companyId: string;
  name: string;
  number?: string | null;
  isActive?: boolean;
};

export type UpdateBankAccountDto = {
  name?: string;
  number?: string | null;
};

export type UpdateBankAccountActiveDto = {
  isActive: boolean;
};

export type BankAccountResponse = {
  type: "success" | "error";
  message: string;
  data: BankAccount;
};

export type BankAccountsResponse = {
  type: "success" | "error";
  message: string;
  data: BankAccount[];
};

export type BankAccountActiveResponse = {
  type: "success" | "error";
  message: string;
  data: null | undefined;
};